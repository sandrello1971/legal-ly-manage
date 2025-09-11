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

// Estrazione testo da PDF usando analisi diretta del formato PDF
const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    let extractedText = '';
    
    // Converti il buffer in stringa per l'analisi
    const pdfString = textDecoder.decode(uint8Array);
    console.log('📝 PDF size:', pdfBuffer.byteLength, 'bytes');
    
    // Strategia 1: Cerca contenuto tra marker "BT" (Begin Text) e "ET" (End Text)
    const textBlockPattern = /BT\s*(.*?)\s*ET/gs;
    const textBlocks = [...pdfString.matchAll(textBlockPattern)];
    
    console.log('🔍 Found', textBlocks.length, 'text blocks');
    
    for (const block of textBlocks) {
      const content = block[1] || '';
      
      // Cerca stringhe tra parentesi tonde (formato standard PDF)
      const stringMatches = content.match(/\(([^)]*)\)/g) || [];
      for (const match of stringMatches) {
        const text = match.slice(1, -1) // Rimuovi parentesi
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim();
        
        if (text.length > 2 && /[a-zA-Z0-9]/.test(text)) {
          extractedText += text + ' ';
        }
      }
      
      // Cerca array di stringhe [(...) (...)] (altro formato PDF)
      const arrayMatches = content.match(/\[([^\]]*)\]/g) || [];
      for (const match of arrayMatches) {
        const arrayContent = match.slice(1, -1);
        const strings = arrayContent.match(/\(([^)]*)\)/g) || [];
        for (const str of strings) {
          const text = str.slice(1, -1).trim();
          if (text.length > 2 && /[a-zA-Z0-9]/.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Strategia 2: Cerca testo direttamente leggibile nel stream
    const directTextPattern = /[A-Za-z][A-Za-z0-9\s.,;:!?\-()]{10,100}/g;
    const directMatches = pdfString.match(directTextPattern) || [];
    
    for (const match of directMatches) {
      // Filtra solo testo che sembra reale (non codici interni PDF)
      if (!match.includes('obj') && 
          !match.includes('endobj') && 
          !match.includes('stream') &&
          !match.includes('xref') &&
          !match.match(/^[0-9\s]+$/) &&
          match.length > 5) {
        extractedText += match.trim() + ' ';
      }
    }
    
    // Pulizia finale del testo estratto
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Normalizza spazi
      .replace(/[^\x20-\x7E\u00C0-\u017F\u0100-\u024F]/g, ' ') // Mantieni caratteri europei
      .replace(/\b\w{1,2}\b/g, '') // Rimuovi parole troppo corte
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('✅ Estratto testo PDF:', extractedText.length, 'caratteri');
    console.log('📄 Anteprima testo:', extractedText.substring(0, 300) + '...');
    
    if (extractedText.length < 30) {
      throw new Error('Testo estratto insufficiente per l\'analisi');
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('❌ Errore nell\'estrazione PDF:', error);
    throw new Error(`Impossibile estrarre testo dal PDF: ${error.message}`);
  }
};

serve(async (req) => {
  console.log('🚀 Parse PDF Decreto function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No authorization header found');
      return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user from token
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
    const { fileUrl, fileName, bandoId, storagePath } = requestData;

    console.log('📄 Processing PDF:', fileName, 'for bando:', bandoId);

    // Scarica il PDF dal storage o dall'URL
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

    // Call OpenAI to analyze the PDF content
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Analizza questo documento PDF di un bando pubblico italiano ed estrai TUTTE le informazioni possibili.

Restituisci SOLO un oggetto JSON valido:
{
  "title": "titolo completo del bando",
  "description": "descrizione dettagliata dell'obiettivo",
  "organization": "ente che ha emesso il bando",
  "total_amount": numero_senza_virgole,
  "application_deadline": "YYYY-MM-DD",
  "project_start_date": "YYYY-MM-DD", 
  "project_end_date": "YYYY-MM-DD",
  "contact_person": "nome della persona di contatto",
  "contact_email": "email di contatto",
  "contact_phone": "numero di telefono",
  "website_url": "sito web dell'ente",
  "eligibility_criteria": "chi può partecipare",
  "evaluation_criteria": "come vengono valutate le proposte",
  "required_documents": ["lista", "dei", "documenti", "richiesti"]
}

REGOLE IMPORTANTI:
- Estrai SEMPRE il titolo anche se parziale
- Cerca importi in €, EUR, euro (anche milioni/migliaia)
- Converti date italiane in formato YYYY-MM-DD
- Se manca info, usa null (NON stringa vuota)
- Cerca attentamente numeri di telefono e email
- Identifica l'ente emittente (Regione, Ministero, ecc.)
- RISPOSTA SOLO JSON, niente altro testo`
          },
          {
            role: 'user',
            content: `ANALIZZA QUESTO BANDO:\n\n${pdfText}`
          }
        ],
        max_completion_tokens: 2000,
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
      const aiContent = aiData.choices[0].message.content.trim();
      console.log('🔍 AI Content:', aiContent.substring(0, 200) + '...');
      
      // Remove any markdown formatting or extra text
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiContent;
      
      parsedData = JSON.parse(jsonString);
      console.log('✅ Successfully parsed AI response:', parsedData);
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('Raw AI content:', aiData.choices[0].message.content);
      return new Response(JSON.stringify({ error: 'Errore nel parsing della risposta AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the bando with parsed data if bandoId is provided
    if (bandoId) {
      console.log('📝 Updating bando with parsed data...');
      
      const { error: updateError } = await supabase
        .from('bandi')
        .update({
          title: parsedData.title || 'Bando Caricato',
          description: parsedData.description,
          organization: parsedData.organization,
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