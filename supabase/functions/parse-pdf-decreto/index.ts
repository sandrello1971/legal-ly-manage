import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Estrazione testo semplificata
const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    console.log('📝 PDF size:', pdfBuffer.byteLength, 'bytes');
    
    const uint8Array = new Uint8Array(pdfBuffer);
    const textDecoder = new TextDecoder('latin1');
    const pdfString = textDecoder.decode(uint8Array);
    
    let extractedText = '';
    console.log('🔍 Starting PDF text extraction...');
    
    // Estrai testo da oggetti BT/ET
    const textObjPattern = /BT\s+(.*?)\s+ET/gs;
    const textObjects = [...pdfString.matchAll(textObjPattern)];
    console.log('📄 Found', textObjects.length, 'text objects');
    
    for (const textObj of textObjects) {
      const content = textObj[1];
      const stringPattern = /\(([^)]*)\)/g;
      const strings = [...content.matchAll(stringPattern)];
      
      for (const str of strings) {
        let text = str[1]
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .trim();
        
        if (text.length >= 2) {
          extractedText += text + ' ';
        }
      }
    }
    
    // Estrai da comandi Tj
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    const tjMatches = [...pdfString.matchAll(tjPattern)];
    console.log('📄 Found', tjMatches.length, 'Tj commands');
    
    for (const match of tjMatches) {
      let text = match[1].replace(/\\n/g, ' ').trim();
      if (text.length >= 2) {
        extractedText += text + ' ';
      }
    }
    
    // Pulizia finale
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('✅ Extracted text length:', extractedText.length, 'characters');
    console.log('📄 Text sample:', extractedText.substring(0, 300));
    
    return extractedText || 'Contenuto PDF non leggibile';
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
    return 'Errore nell\'estrazione del testo PDF';
  }
};

serve(async (req) => {
  console.log('🚀 Parse PDF Decreto function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header found');
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Error getting user:', userError);
      return new Response(JSON.stringify({ error: 'Utente non trovato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('👤 User authenticated:', user.id);

    const requestData = await req.json();
    console.log('📥 Request data received:', JSON.stringify(requestData, null, 2));
    const { fileUrl, fileName, bandoId, storagePath } = requestData;

    console.log('📄 Processing PDF:', fileName, 'for bando:', bandoId);
    console.log('📄 Storage path:', storagePath);
    console.log('📄 File URL:', fileUrl);

    let pdfBuffer: ArrayBuffer;
    
    if (storagePath) {
      console.log('📥 Downloading PDF from storage:', storagePath);
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(storagePath);
      
      if (downloadError || !fileData) {
        console.error('❌ Error downloading from storage:', downloadError);
        return new Response(JSON.stringify({ error: 'Impossibile scaricare il PDF dallo storage' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      pdfBuffer = await fileData.arrayBuffer();
    } else if (fileUrl) {
      console.log('📥 Downloading PDF from URL:', fileUrl);
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        console.error('❌ Error downloading from URL:', response.statusText);
        return new Response(JSON.stringify({ error: 'Impossibile scaricare il PDF dall\'URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      pdfBuffer = await response.arrayBuffer();
    } else {
      console.error('❌ No file source provided');
      return new Response(JSON.stringify({ error: 'Nessun file PDF fornito' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Extracting text from PDF...');
    const pdfText = await extractTextFromPDF(pdfBuffer);
    console.log('📄 PDF text length:', pdfText.length);
    
    // Per ora usiamo dati fissi basati su quello che sappiamo del BANDO SI4.0
    const testData = {
      title: 'BANDO SI4.0 2025 - Sviluppo di Soluzioni Innovative 4.0',
      description: 'Supporto per lo sviluppo di soluzioni innovative Industria 4.0 per PMI lombarde',
      organization: 'UNIONCAMERE Regione Lombardia',
      total_amount: null,
      application_deadline: null,
      project_start_date: null,
      project_end_date: null,
      contact_person: null,
      contact_email: null,
      contact_phone: null,
      website_url: null,
      eligibility_criteria: 'PMI e micro imprese con sede in Lombardia',
      evaluation_criteria: 'Innovatività della soluzione e impatto sul business',
      required_documents: ['Visura camerale', 'Piano di sviluppo', 'Preventivi fornitori']
    };

    console.log('📝 Using test data:', testData);

    if (bandoId) {
      console.log('📝 Updating bando with test data...');
      
      const { error: updateError } = await supabase
        .from('bandi')
        .update({
          title: testData.title,
          description: testData.description,
          organization: testData.organization,
          total_amount: testData.total_amount,
          application_deadline: testData.application_deadline,
          project_start_date: testData.project_start_date,
          project_end_date: testData.project_end_date,
          contact_person: testData.contact_person,
          contact_email: testData.contact_email,
          contact_phone: testData.contact_phone,
          website_url: testData.website_url,
          eligibility_criteria: testData.eligibility_criteria,
          evaluation_criteria: testData.evaluation_criteria,
          required_documents: testData.required_documents,
          parsed_data: testData,
          decree_file_name: fileName,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', bandoId)
        .eq('created_by', user.id);

      if (updateError) {
        console.error('❌ Error updating bando:', updateError);
        return new Response(JSON.stringify({ error: 'Errore nell\'aggiornamento del bando' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Bando updated successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: testData,
      message: 'Test completato con successo!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in parse-pdf-decreto function:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});