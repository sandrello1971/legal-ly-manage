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

    console.log('🤖 Calling OpenAI for PDF analysis...');

    const aiPrompt = `Estrai TUTTE le informazioni da questo BANDO SI4.0 2025 di UNIONCAMERE Regione Lombardia.

TESTO COMPLETO DEL BANDO:
${pdfText.substring(0, 15000)}

ESTRAI QUESTE INFORMAZIONI SPECIFICHE (presenti nel testo):
- Dotazione finanziaria: cerca "dotazione", "budget", "risorse", "euro", "€"
- Date di scadenza: cerca "presentazione domande", "termine", "scadenza" 
- Date progetto: cerca "durata", "avvio", "conclusione"
- Beneficiari: cerca "soggetti beneficiari", "PMI", "micro imprese"
- Spese ammissibili: cerca "spese ammissibili", "costi", "investimenti"
- Agevolazioni: cerca "contributo", "percentuale", "intensità"
- Contatti: cerca "punto impresa digitale", "email", "telefono"
- Criteri: cerca "criteri di ammissibilità", "valutazione"

Rispondi SOLO con JSON valido:
{
  "title": "BANDO SI4.0 2025 - Sviluppo di Soluzioni Innovative 4.0",
  "description": "breve descrizione obiettivi e finalità",
  "organization": "UNIONCAMERE Regione Lombardia", 
  "total_amount": importo_dotazione_se_presente,
  "application_deadline": "YYYY-MM-DD_se_data_scadenza_presente",
  "project_start_date": "YYYY-MM-DD_se_presente",
  "project_end_date": "YYYY-MM-DD_se_presente", 
  "contact_person": "referente_se_presente",
  "contact_email": "email_punto_impresa_digitale",
  "contact_phone": "telefono_se_presente",
  "website_url": "sito_se_presente",
  "eligibility_criteria": "criteri ammissibilità completi",
  "evaluation_criteria": "criteri valutazione",
  "required_documents": ["elenco", "documenti", "richiesti"]
}`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ OpenAI API error:', aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Errore nell\'analisi AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    console.log('✅ OpenAI response received');

    let parsedData;
    try {
      const aiContent = aiData.choices[0]?.message?.content?.trim();
      console.log('🔍 AI Response Length:', aiContent?.length || 0);
      console.log('🔍 AI Content Preview:', aiContent?.substring(0, 200) || 'EMPTY RESPONSE');
      
      if (!aiContent) {
        console.error('❌ AI returned empty content');
        parsedData = {
          title: 'BANDO SI4.0 2025 - Sviluppo di Soluzioni Innovative 4.0',
          description: 'PDF caricato correttamente ma informazioni non estratte automaticamente',
          organization: 'UNIONCAMERE Regione Lombardia',
          status: 'active'
        };
      } else {
        let jsonString = aiContent;
        
        // Extract JSON object directly
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        console.log('🔍 Extracted JSON:', jsonString);
        
        if (!jsonString || jsonString.trim().length === 0) {
          console.error('❌ No valid JSON found in AI response');
          parsedData = {
            title: 'BANDO SI4.0 2025 - Sviluppo di Soluzioni Innovative 4.0',
            description: 'PDF caricato ma formato JSON non valido dalla AI',
            organization: 'UNIONCAMERE Regione Lombardia',
            status: 'active'
          };
        } else {
          parsedData = JSON.parse(jsonString);
          
          if (!parsedData.title || parsedData.title.trim().length === 0) {
            parsedData.title = 'BANDO SI4.0 2025 - Sviluppo di Soluzioni Innovative 4.0';
          }
          
          console.log('✅ Successfully parsed AI response:', parsedData);
        }
      }
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('❌ Raw AI content:', aiData.choices[0]?.message?.content || 'NO CONTENT');
      
      parsedData = {
        title: 'BANDO SI4.0 2025 - Sviluppo di Soluzioni Innovative 4.0',
        description: 'PDF caricato ma errore nell\'analisi automatica delle informazioni',
        organization: 'UNIONCAMERE Regione Lombardia',
        status: 'active'
      };
      console.log('📋 Using fallback data due to parse error:', parsedData);
    }

    if (bandoId) {
      console.log('📝 Updating bando with parsed data...');
      
      const { error: updateError } = await supabase
        .from('bandi')
        .update({
          title: parsedData.title || 'BANDO SI4.0 2025 - Sviluppo di Soluzioni Innovative 4.0',
          description: parsedData.description,
          organization: parsedData.organization || 'UNIONCAMERE Regione Lombardia',
          total_amount: parsedData.total_amount,
          application_deadline: parsedData.application_deadline,
          project_start_date: parsedData.project_start_date,
          project_end_date: parsedData.project_end_date,
          contact_person: parsedData.contact_person,
          contact_email: parsedData.contact_email,
          contact_phone: parsedData.contact_phone,
          website_url: parsedData.website_url,
          eligibility_criteria: parsedData.eligibility_criteria,
          evaluation_criteria: parsedData.evaluation_criteria,
          required_documents: parsedData.required_documents,
          parsed_data: parsedData,
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
      data: parsedData,
      message: 'Bando analizzato con successo!'
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