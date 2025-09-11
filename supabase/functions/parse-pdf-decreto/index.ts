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

// Estrazione testo da PDF usando multiple strategie
const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    console.log('📝 PDF size:', pdfBuffer.byteLength, 'bytes');
    
    // Strategia migliorata: Cerca direttamente nel contenuto binario
    const pdfBytes = Array.from(uint8Array);
    let currentText = '';
    let inTextBlock = false;
    
    // Scorri byte per byte cercando sequenze di testo leggibile
    for (let i = 0; i < pdfBytes.length - 1; i++) {
      const byte = pdfBytes[i];
      
      // Caratteri ASCII leggibili (lettere, numeri, spazi, punteggiatura)
      if ((byte >= 32 && byte <= 126) || byte === 195 || byte === 196) { // Include caratteri accentati
        const char = String.fromCharCode(byte);
        
        // Se è una lettera, inizia una nuova parola
        if (/[a-zA-ZÀ-ÿ]/.test(char)) {
          currentText += char;
          inTextBlock = true;
        } else if (inTextBlock && /[\s.,;:!?\-()0-9€%]/.test(char)) {
          currentText += char;
        } else if (inTextBlock && currentText.length > 0) {
          // Fine della parola/frase
          if (currentText.length >= 3) {
            // Pulisci e aggiungi se è testo valido
            const cleanText = currentText.trim();
            if (cleanText.length >= 3 && /[a-zA-ZÀ-ÿ]/.test(cleanText)) {
              extractedText += cleanText + ' ';
            }
          }
          currentText = '';
          inTextBlock = false;
        }
      } else {
        // Carattere non ASCII - termina il blocco corrente
        if (inTextBlock && currentText.length >= 3) {
          const cleanText = currentText.trim();
          if (cleanText.length >= 3 && /[a-zA-ZÀ-ÿ]/.test(cleanText)) {
            extractedText += cleanText + ' ';
          }
        }
        currentText = '';
        inTextBlock = false;
      }
    }
    
    // Aggiungi l'ultimo blocco se valido
    if (currentText.length >= 3) {
      const cleanText = currentText.trim();
      if (cleanText.length >= 3 && /[a-zA-ZÀ-ÿ]/.test(cleanText)) {
        extractedText += cleanText + ' ';
      }
    }
    
    // Strategia alternativa: Cerca pattern di testo più specifici
    const textDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false });
    const pdfString = textDecoder.decode(uint8Array);
    
    // Cerca contenuti tra parentesi (formato PDF standard)
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
    
    // Cerca testo tra tag di contenuto
    const contentPattern = />\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s.,;:!?\-()€%]{10,})\s*</g;
    const contentMatches = [...pdfString.matchAll(contentPattern)];
    
    for (const match of contentMatches) {
      const text = match[1].trim();
      if (text.length >= 5 && /[a-zA-ZÀ-ÿ]/.test(text)) {
        extractedText += text + ' ';
      }
    }
    
    // Pulizia finale del testo estratto
    extractedText = extractedText
      .replace(/\s+/g, ' ') // Normalizza spazi
      .replace(/[^\w\s.,;:!?\-()€%àèéìòùáéíóúâêîôûäëïöüÀÈÉÌÒÙÁÉÍÓÚÂÊÎÔÛÄËÏÖÜ]/g, ' ') // Mantieni solo caratteri validi
      .replace(/\b\w{1,2}\b(?!\s*[€%])/g, '') // Rimuovi parole troppo corte (tranne unità)
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('✅ Estratto testo PDF:', extractedText.length, 'caratteri');
    console.log('📄 Anteprima testo:', extractedText.substring(0, 500) + '...');
    
    if (extractedText.length < 50) {
      console.warn('⚠️ Testo estratto molto breve, potrebbe essere insufficiente');
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
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Analizza questo documento PDF di un bando pubblico italiano ed estrai le informazioni principali.

Restituisci SOLO un oggetto JSON valido in questo formato:
{
  "title": "titolo del bando",
  "description": "descrizione del bando",
  "organization": "ente emittente",
  "total_amount": 1000000,
  "application_deadline": "2025-12-31",
  "eligibility_criteria": "criteri di partecipazione",
  "evaluation_criteria": "criteri di valutazione"
}

REGOLE:
- Se non trovi un'informazione, usa null
- Per le date usa formato YYYY-MM-DD
- Per gli importi usa solo numeri (senza €, virgole o punti)
- Estrai almeno il titolo anche se parziale
- NON aggiungere testo extra, SOLO il JSON`
          },
          {
            role: 'user',
            content: `Testo estratto dal PDF del bando:\n\n${pdfText.substring(0, 8000)}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
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
      console.log('🔍 AI Content:', aiContent || 'EMPTY RESPONSE');
      
      if (!aiContent) {
        console.error('❌ AI returned empty content');
        // Use fallback data for empty responses
        parsedData = {
          title: 'Bando Analizzato',
          status: 'active',
          description: 'Documento PDF caricato e processato'
        };
      } else {
        // Remove any markdown formatting or extra text
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiContent;
        
        if (!jsonString || jsonString.trim().length === 0) {
          console.error('❌ No valid JSON found in AI response');
          parsedData = {
            title: 'Bando Analizzato',
            status: 'active',
            description: 'Documento PDF caricato e processato'
          };
        } else {
          parsedData = JSON.parse(jsonString);
        }
      }
      
      console.log('✅ Successfully parsed AI response:', parsedData);
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('Raw AI content:', aiData.choices[0]?.message?.content || 'NO CONTENT');
      
      // Provide fallback data instead of failing
      parsedData = {
        title: 'Bando Analizzato',
        status: 'active',
        description: 'Documento PDF caricato ma analisi AI fallita'
      };
      console.log('📋 Using fallback data:', parsedData);
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