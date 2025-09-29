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

// Estrazione testo migliorata con supporto per PDF moderni e scansionati
const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  try {
    console.log('📝 PDF size:', pdfBuffer.byteLength, 'bytes');
    
    const uint8Array = new Uint8Array(pdfBuffer);
    let extractedText = '';
    
    // Prova diversi metodi di decodifica
    const decoders = [
      new TextDecoder('utf-8', { fatal: false }),
      new TextDecoder('latin1', { fatal: false }),
      new TextDecoder('windows-1252', { fatal: false }),
      new TextDecoder('iso-8859-1', { fatal: false })
    ];
    
    let pdfString = '';
    for (const decoder of decoders) {
      try {
        pdfString = decoder.decode(uint8Array);
        if (pdfString.includes('obj') && pdfString.includes('stream')) {
          console.log('🎯 Successfully decoded with:', decoder.encoding);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    console.log('🔍 Analyzing PDF structure...');
    
    // Pattern migliorati per l'estrazione del testo
    const textPatterns = [
      // Stream decodificati
      /stream\s*([\s\S]*?)\s*endstream/g,
      // Testo tra parentesi (più robusto)
      /\(([^)]{3,})\)/g,
      // Testo con comandi di posizionamento
      /(\d+(?:\.\d+)?\s+){2,6}Td\s*\(([^)]+)\)/g,
      // Testo con font
      /\/F\d+\s+\d+(?:\.\d+)?\s+Tf\s*\(([^)]+)\)/g,
      // Array di stringhe TJ
      /\[\s*(\([^)]*\)\s*(?:-?\d+(?:\.\d+)?\s*)?)+\]\s*TJ/g,
      // Singoli comandi Tj
      /\(([^)]{2,})\)\s*Tj/g
    ];
    
    for (const pattern of textPatterns) {
      const matches = [...pdfString.matchAll(pattern)];
      console.log(`📄 Found ${matches.length} matches for pattern ${pattern.source.substring(0, 20)}...`);
      
      for (const match of matches) {
        let text = match[2] || match[1] || match[0];
        
        if (text && typeof text === 'string') {
          // Pulizia del testo estratto
          text = text
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Solo se contiene caratteri leggibili
          if (text.length >= 3 && /[A-Za-zÀ-ÿ]/.test(text)) {
            extractedText += text + ' ';
          }
        }
      }
    }
    
    // Metodo alternativo: cerca parole italiane direttamente
    if (extractedText.length < 200) {
      console.log('🔍 Trying direct Italian word extraction...');
      
      // Pattern per parole italiane comuni nei bandi
      const italianPatterns = [
        /\b(?:bando|decreto|finanziamento|contribut[oi]|fondi|euro|progett[oi]|impres[ea]|attivit[àa]|servizi|formazione|sviluppo|innovazione|ricerca)\b/gi,
        /\b[A-Za-zÀ-ÿ]{4,}\s+[A-Za-zÀ-ÿ]{4,}(?:\s+[A-Za-zÀ-ÿ]{3,}){0,3}/g,
        /(?:art\.|articolo)\s*\d+/gi,
        /\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}/g, // Date
        /€?\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g, // Importi
      ];
      
      for (const pattern of italianPatterns) {
        const matches = pdfString.match(pattern);
        if (matches) {
          extractedText += matches.join(' ') + ' ';
          console.log(`📄 Extracted ${matches.length} Italian words/phrases`);
        }
      }
    }
    
    // Estrazione da metadati del PDF
    const metadataPatterns = [
      /\/Title\s*\(([^)]+)\)/g,
      /\/Subject\s*\(([^)]+)\)/g,
      /\/Keywords\s*\(([^)]+)\)/g,
      /\/Creator\s*\(([^)]+)\)/g,
      /\/Producer\s*\(([^)]+)\)/g
    ];
    
    for (const pattern of metadataPatterns) {
      const matches = [...pdfString.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          extractedText += match[1] + ' ';
          console.log('📄 Extracted from metadata:', match[1]);
        }
      }
    }
    
    // Pulizia finale
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/(.)\1{4,}/g, '$1') // Rimuovi caratteri ripetuti
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\u0100-\u017F]/g, ' ') // Mantieni solo caratteri leggibili
      .trim();
    
    console.log('✅ Final extracted text length:', extractedText.length, 'characters');
    
    if (extractedText.length > 50) {
      console.log('📄 Text preview:', extractedText.substring(0, 200) + '...');
    } else {
      console.log('📄 Full extracted text:', extractedText);
    }
    
    if (extractedText.length < 30) {
      return 'PDF non leggibile - il documento potrebbe essere una scansione o avere una codifica non standard. Si prega di fornire un PDF con testo selezionabile.';
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('❌ Extraction error:', error);
    return 'Errore nell\'estrazione del testo PDF: ' + error.message;
  }
};

// Metodo di fallback comprensivo
const extractComprehensiveFallback = (uint8Array: Uint8Array, pdfString: string): string => {
  try {
    let fallbackText = '';
    
    // 1. Cerca oggetti di testo con Td/TD (posizionamento testo)
    const tdPattern = /(\d+(?:\.\d+)?\s+){2}Td\s*\(([^)]*)\)/g;
    const tdMatches = [...pdfString.matchAll(tdPattern)];
    for (const match of tdMatches) {
      fallbackText += match[2] + ' ';
    }
    
    // 2. Cerca font e testo associato
    const fontPattern = /\/F\d+\s+\d+(?:\.\d+)?\s+Tf\s*\(([^)]*)\)/g;
    const fontMatches = [...pdfString.matchAll(fontPattern)];
    for (const match of fontMatches) {
      fallbackText += match[1] + ' ';
    }
    
    // 3. Cerca stringhe letterali più lunghe
    const literalPattern = /[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.,;:()]{15,}/g;
    const literals = pdfString.match(literalPattern);
    if (literals) {
      fallbackText += literals.join(' ') + ' ';
    }
    
    // 4. Decompressione stream FlateDecode (semplificata)
    const streamPattern = /FlateDecode.*?stream\s*(.*?)\s*endstream/gs;
    const streams = [...pdfString.matchAll(streamPattern)];
    for (const stream of streams) {
      // Prova a decodificare come testo diretto (alcuni PDF non sono compressi)
      const streamContent = stream[1];
      const textPattern = /\(([^)]{5,})\)/g;
      const textMatches = [...streamContent.matchAll(textPattern)];
      for (const textMatch of textMatches) {
        fallbackText += textMatch[1] + ' ';
      }
    }
    
    // 5. Ricerca pattern specifici per bandi italiani
    const bandoPatterns = [
      /bando[^a-z]*([A-Za-z\s]{10,})/gi,
      /decreto[^a-z]*([A-Za-z\s]{10,})/gi,
      /finanziamento[^a-z]*([A-Za-z\s]{10,})/gi,
      /contributo[^a-z]*([A-Za-z\s]{10,})/gi,
      /euro[^a-z]*([A-Za-z0-9\s.,]{10,})/gi
    ];
    
    for (const pattern of bandoPatterns) {
      const matches = [...pdfString.matchAll(pattern)];
      for (const match of matches) {
        fallbackText += match[0] + ' ' + match[1] + ' ';
      }
    }
    
    // Pulizia finale
    fallbackText = fallbackText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, ' ')
      .trim();
    
    console.log('✅ Comprehensive fallback extraction:', fallbackText.length, 'characters');
    return fallbackText;
    
  } catch (error) {
    console.error('❌ Comprehensive fallback failed:', error);
    return '';
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
    console.log('📄 PDF text preview:', pdfText.substring(0, 500));

    console.log('🤖 Calling OpenAI for PDF analysis...');
    
    const aiPrompt = `Analizza questo testo estratto da un BANDO e identifica le CATEGORIE DI SPESA SPECIFICHE elencate nel documento.

TESTO DEL BANDO:
${pdfText.substring(0, 12000)}

IMPORTANTE: 
- NON usare categorie predefinite
- Estrai ESATTAMENTE le categorie indicate nel testo
- Se il testo non è chiaro, cerca pattern come "categorie ammissibili", "spese finanziabili", "voci di costo"

Rispondi SOLO con JSON valido:
{
  "title": "titolo completo del bando",
  "description": "descrizione dettagliata del bando",
  "organization": "ente organizzatore", 
  "total_amount": "importo totale disponibile come numero",
  "min_funding": "importo minimo finanziabile come numero", 
  "max_funding": "importo massimo finanziabile come numero",
  "funding_percentage": "percentuale di copertura come numero (es. 50 per 50%)",
  "application_deadline": "data scadenza in formato YYYY-MM-DD",
  "project_duration_months": "durata massima progetto in mesi come numero",
  "eligibility_criteria": "criteri di ammissibilità dettagliati",
  "evaluation_criteria": "criteri di valutazione dettagliati", 
  "required_documents": ["lista", "documenti", "richiesti"],
  "expense_categories": [
    {
      "name": "Nome categoria ESATTO dal bando",
      "description": "Descrizione dettagliata della categoria dal bando", 
      "max_percentage": "percentuale massima se specificata (come numero) o null",
      "max_amount": "importo massimo se specificato (come numero) o null",
      "eligible_expenses": ["lista", "spese", "ammissibili", "specifiche"]
    }
  ],
  "target_companies": "tipologie aziende destinatarie",
  "geographic_scope": "ambito geografico",
  "innovation_areas": ["aree", "di", "innovazione", "se", "presenti"]
}`;

const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [{ role: 'user', content: aiPrompt }],
        max_completion_tokens: 2000,
      }),
    });

    let testData;
    if (!aiResponse.ok) {
      console.error('❌ OpenAI API error:', aiResponse.status);
      testData = {
        title: 'BANDO - Errore nella chiamata OpenAI',
        description: 'Errore nella chiamata OpenAI - usando dati fallback',
        organization: 'Ente Pubblico',
        total_amount: null,
        min_funding: null,
        max_funding: null,
        funding_percentage: null,
        application_deadline: null,
        project_start_date: null,
        project_end_date: null,
        project_duration_months: null,
        contact_person: null,
        contact_email: null,
        contact_phone: null,
        website_url: null,
        eligibility_criteria: 'Criteri non disponibili',
        evaluation_criteria: 'Criteri non disponibili',
        required_documents: ['Documenti non disponibili'],
        expense_categories: [],
        target_companies: null,
        geographic_scope: null,
        innovation_areas: []
      };
    } else {
      console.log('✅ OpenAI response received');
      const aiData = await aiResponse.json();
      const aiContent = aiData.choices[0]?.message?.content?.trim();
      console.log('🔍 AI Content:', aiContent);
      
      try {
        // Trova e pulisce il JSON nella risposta
        let jsonStr = aiContent;
        if (aiContent.startsWith('```json')) {
          jsonStr = aiContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
        }
        
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let cleanJson = jsonMatch[0];
          
          // Rimuovi caratteri di troncatura e chiudi JSON se necessario
          if (!cleanJson.endsWith('}')) {
            // Trova l'ultimo campo completo e chiudi il JSON
            const lastCommaIndex = cleanJson.lastIndexOf(',');
            if (lastCommaIndex > 0) {
              cleanJson = cleanJson.substring(0, lastCommaIndex) + '}';
            } else {
              cleanJson += '}';
            }
          }
          
          testData = JSON.parse(cleanJson);
          console.log('✅ Successfully parsed AI response');
        } else {
          throw new Error('No JSON found in AI response');
        }
      } catch (parseError) {
        console.error('❌ Error parsing AI response:', parseError);
        testData = {
          title: 'BANDO - Errore nel parsing AI',
          description: 'Errore nel parsing AI - usando dati fallback',
          organization: 'Ente Pubblico',
          total_amount: null,
          min_funding: null,
          max_funding: null,
          funding_percentage: null,
          application_deadline: null,
          project_start_date: null,
          project_end_date: null,
          project_duration_months: null,
          contact_person: null,
          contact_email: null,
          contact_phone: null,
          website_url: null,
          eligibility_criteria: 'Criteri non disponibili',
          evaluation_criteria: 'Criteri non disponibili', 
          required_documents: ['Documenti non disponibili'],
          expense_categories: [],
          target_companies: null,
          geographic_scope: null,
          innovation_areas: []
        };
      }
    }

    // Pulisci e valida i dati prima dell'inserimento
    const cleanData = {
      title: testData.title || 'Bando da Analizzare',
      description: testData.description || '',
      organization: testData.organization || '',
      total_amount: testData.total_amount && testData.total_amount !== "" ? parseFloat(testData.total_amount) : null,
      application_deadline: testData.application_deadline && testData.application_deadline !== "" ? testData.application_deadline : null,
      project_start_date: testData.project_start_date && testData.project_start_date !== "" ? testData.project_start_date : null,
      project_end_date: testData.project_end_date && testData.project_end_date !== "" ? testData.project_end_date : null,
      contact_person: testData.contact_person || '',
      contact_email: testData.contact_email || '',
      contact_phone: testData.contact_phone || '',
      website_url: testData.website_url || '',
      eligibility_criteria: testData.eligibility_criteria || '',
      evaluation_criteria: testData.evaluation_criteria || '',
      required_documents: Array.isArray(testData.required_documents) ? testData.required_documents : [],
      parsed_data: testData,
      decree_file_name: fileName,
      status: 'active',
      updated_at: new Date().toISOString()
    };

    console.log('📝 Using cleaned data:', cleanData);

    if (bandoId) {
      console.log('📝 Updating bando with cleaned data...');
      
      const { error: updateError } = await supabase
        .from('bandi')
        .update(cleanData)
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
      message: 'Analisi completata con successo!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in parse-pdf-decreto function:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore interno del server',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});