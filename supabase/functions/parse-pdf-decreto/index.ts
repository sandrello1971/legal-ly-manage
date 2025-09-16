import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

// Import PDF processing library
const { getDocument, GlobalWorkerOptions } = await import('https://esm.sh/pdfjs-dist@4.4.168/build/pdf.min.mjs');

// Set PDF.js worker (required for text extraction)
GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Estrazione testo da PDF usando PDF.js
const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    console.log('📝 PDF size:', pdfBuffer.byteLength, 'bytes');
    
    // Load PDF document using PDF.js
    const loadingTask = getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      standardFontDataUrl: 'https://esm.sh/pdfjs-dist@4.4.168/web/',
    });
    
    const pdf = await loadingTask.promise;
    console.log('📄 PDF loaded, pages:', pdf.numPages);
    
    let fullText = '';
    
    // Extract text from each page (limit to first 10 pages for performance)
    const maxPages = Math.min(pdf.numPages, 10);
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim();
        
        if (pageText) {
          fullText += pageText + ' ';
          console.log(`📄 Page ${pageNum}: ${pageText.length} characters extracted`);
        }
      } catch (pageError) {
        console.warn(`⚠️ Error extracting page ${pageNum}:`, pageError);
        continue;
      }
    }
    
    // Clean up extracted text
    fullText = fullText
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/\n+/g, ' ')  // Replace newlines with spaces
      .replace(/\t+/g, ' ')  // Replace tabs with spaces
      .trim();
    
    console.log('✅ Total extracted text:', fullText.length, 'characters');
    console.log('📄 Preview:', fullText.substring(0, 500) + '...');
    
    if (fullText.length < 100) {
      console.warn('⚠️ Very short text extracted, might be insufficient');
      
      // Fallback: try byte-level extraction for problematic PDFs
      console.log('🔄 Trying fallback extraction method...');
      return await extractTextFallback(pdfBuffer);
    }
    
    return fullText;
    
  } catch (error) {
    console.error('❌ Error in PDF.js extraction:', error);
    console.log('🔄 Trying fallback extraction method...');
    return await extractTextFallback(pdfBuffer);
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
            role: 'system',
            content: `Sei un esperto analista di bandi pubblici italiani. Analizza il testo estratto dal PDF e identifica le informazioni chiave del bando.

CERCA QUESTI ELEMENTI SPECIFICI:
- Titolo del bando (spesso inizia con "BANDO", "AVVISO", "DECRETO", ecc.)
- Ente emittente (Ministero, Regione, Comune, Camera di Commercio, ecc.)
- Importo totale o budget (cerca €, EUR, euro, milioni, migliaia)
- Date di scadenza (cerca "scadenza", "termine", "entro il", date future)
- Criteri di ammissibilità/eleggibilità 
- Criteri di valutazione/selezione
- Settori di applicazione (es. PMI, startup, innovazione, digitale, ecc.)

RESTITUISCI SOLO un oggetto JSON valido:
{
  "title": "titolo completo del bando",
  "description": "breve descrizione dell'obiettivo del bando",
  "organization": "ente che ha emesso il bando",
  "total_amount": numero_senza_simboli,
  "application_deadline": "YYYY-MM-DD",
  "project_start_date": "YYYY-MM-DD",
  "project_end_date": "YYYY-MM-DD",
  "contact_person": "nome referente",
  "contact_email": "email@contatto.it",
  "contact_phone": "numero telefono",
  "website_url": "http://sito.web",
  "eligibility_criteria": "criteri di partecipazione",
  "evaluation_criteria": "criteri di valutazione",
  "required_documents": ["documento1", "documento2"]
}

REGOLE IMPORTANTI:
- Se non trovi un'informazione specifica, usa null
- Per le date: formato YYYY-MM-DD (es. 2025-12-31)
- Per gli importi: solo numeri interi (es. 1000000 per 1 milione)
- Estrai il titolo anche se parziale o dedotto dal contesto
- NON inventare informazioni, usa null se incerto
- Mantieni il JSON valido, senza commenti o testo extra`
          },
          {
            role: 'user',
            content: `Analizza questo testo estratto da un bando pubblico italiano e identifica tutte le informazioni rilevanti:

${pdfText.substring(0, 12000)}

${pdfText.length > 12000 ? '\n\n[TESTO TRONCATO - CONTINUA...]' : ''}`
          }
        ],
        max_completion_tokens: 1500,
        temperature: 0.1,
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
        
        // Remove markdown code blocks if present
        if (jsonString.includes('```')) {
          const codeBlockMatch = jsonString.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
          if (codeBlockMatch) {
            jsonString = codeBlockMatch[1];
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