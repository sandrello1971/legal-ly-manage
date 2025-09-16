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

// Estrazione testo migliorata con supporto per PDF compressi
const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    console.log('📝 PDF size:', pdfBuffer.byteLength, 'bytes');
    
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // Prova prima con latin1 che funziona meglio per PDF italiani
    let pdfString = '';
    try {
      pdfString = new TextDecoder('latin1').decode(uint8Array);
    } catch {
      pdfString = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false }).decode(uint8Array);
    }
    
    let extractedText = '';
    console.log('🔍 Starting PDF text extraction...');
    
    // Metodo 1: Cerca oggetti di testo direttamente
    const textObjPattern = /BT\s+(.*?)\s+ET/gs;
    const textObjects = [...pdfString.matchAll(textObjPattern)];
    console.log('📄 Found', textObjects.length, 'text objects');
    
    for (const textObj of textObjects) {
      const content = textObj[1];
      
      // Estrai stringhe tra parentesi
      const stringPattern = /\(([^)]*)\)/g;
      const strings = [...content.matchAll(stringPattern)];
      
      for (const str of strings) {
        let text = str[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim();
        
        if (text.length >= 2) {
          extractedText += text + ' ';
        }
      }
    }
    
    // Metodo 2: Estrai da comandi Tj
    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    const tjMatches = [...pdfString.matchAll(tjPattern)];
    console.log('📄 Found', tjMatches.length, 'Tj commands');
    
    for (const match of tjMatches) {
      let text = match[1]
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .trim();
      
      if (text.length >= 2) {
        extractedText += text + ' ';
      }
    }
    
    // Metodo 3: Estrai da array TJ
    const tjArrayPattern = /\[([^\]]*)\]\s*TJ/g;
    const tjArrayMatches = [...pdfString.matchAll(tjArrayPattern)];
    console.log('📄 Found', tjArrayMatches.length, 'TJ arrays');
    
    for (const match of tjArrayMatches) {
      const arrayContent = match[1];
      const stringPattern = /\(([^)]*)\)/g;
      const strings = [...arrayContent.matchAll(stringPattern)];
      
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
    
    // Metodo 4: Cerca pattern di testo leggibile
    const readablePattern = /[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9\s.,;:!?\-()€%]{8,}/g;
    const readableMatches = [...pdfString.matchAll(readablePattern)];
    console.log('📄 Found', readableMatches.length, 'readable segments');
    
    for (const match of readableMatches) {
      const text = match[0].trim();
      if (text.length >= 8 && !/^[0-9a-fA-F\s]+$/.test(text) && !text.includes('\x00')) {
        extractedText += text + ' ';
      }
    }
    
    // Pulizia e normalizzazione
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{4,}/g, '$1')
      .trim();
    
    // Rimuovi duplicati consecutivi
    const words = extractedText.split(' ');
    const cleanWords = [];
    let lastWord = '';
    
    for (const word of words) {
      if (word !== lastWord && word.length > 1) {
        cleanWords.push(word);
        lastWord = word;
      }
    }
    
    extractedText = cleanWords.join(' ');
    
    console.log('✅ Extracted text length:', extractedText.length, 'characters');
    console.log('📄 Text sample:', extractedText.substring(0, 500));
    
    if (extractedText.length < 50) {
      console.warn('⚠️ Text too short, using fallback...');
      return extractTextFallback(pdfBuffer);
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
    return extractTextFallback(pdfBuffer);
  }
};

// Fallback extraction method for problematic PDFs
const extractTextFallback = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    const pdfString = textDecoder.decode(uint8Array);
    
    let extractedText = '';
    
    // Search for text in parentheses (PDF standard format)
    const parenthesesPattern = /\(([^)]{3,})\)/g;
    const parenthesesMatches = [...pdfString.matchAll(parenthesesPattern)];
    
    for (const match of parenthesesMatches) {
      const text = match[1]
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .trim();
      
      if (text.length >= 3 && /[a-zA-ZÀ-ÿ]/.test(text)) {
        extractedText += text + ' ';
      }
    }
    
    // Search for readable ASCII sequences
    const asciiPattern = /[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9\s.,;:!?\-()€%]{10,}/g;
    const asciiMatches = [...pdfString.matchAll(asciiPattern)];
    
    for (const match of asciiMatches) {
      const text = match[0].trim();
      if (text.length >= 10) {
        extractedText += text + ' ';
      }
    }
    
    // Clean up text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('📄 Fallback extraction result:', extractedText.length, 'characters');
    
    return extractedText || 'Contenuto PDF non leggibile';
    
  } catch (error) {
    console.error('❌ Fallback extraction failed:', error);
    return 'Errore nell\'estrazione del testo PDF';
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

    // Use a comprehensive prompt with specific information to extract
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
}

    // Call OpenAI to analyze the PDF content
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
          title: 'Bando da Completare',
          description: 'PDF caricato correttamente ma informazioni non estratte automaticamente',
          status: 'active'
        };
      } else {
        // Clean and extract JSON from AI response
        let jsonString = aiContent;
        
        // Remove markdown code blocks if present - simplified approach
        if (jsonString.includes('```')) {
          // Find first { and last }
          const firstBrace = jsonString.indexOf('{');
          const lastBrace = jsonString.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonString = jsonString.substring(firstBrace, lastBrace + 1);
          }
        }
        
        // Extract JSON object if wrapped in text
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        
        console.log('🔍 Extracted JSON:', jsonString);
        
        if (!jsonString || jsonString.trim().length === 0) {
          console.error('❌ No valid JSON found in AI response');
          parsedData = {
            title: 'Bando da Completare',
            description: 'PDF caricato ma formato JSON non valido dalla AI',
            status: 'active'
          };
        } else {
          parsedData = JSON.parse(jsonString);
          
          // Validate and clean parsed data
          if (!parsedData.title || parsedData.title.trim().length === 0) {
            parsedData.title = 'Bando Estratto';
          }
          
          console.log('✅ Successfully parsed AI response:', parsedData);
        }
      }
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('❌ Raw AI content:', aiData.choices[0]?.message?.content || 'NO CONTENT');
      
      // Provide meaningful fallback data
      parsedData = {
        title: 'Bando con Errore di Parsing',
        description: 'PDF caricato ma errore nell\'analisi automatica delle informazioni',
        status: 'active'
      };
      console.log('📋 Using fallback data due to parse error:', parsedData);
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