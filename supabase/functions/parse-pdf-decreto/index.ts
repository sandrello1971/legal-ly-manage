import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Upload PDF to OpenAI and analyze using Assistants API
const uploadPdfAndAnalyze = async (pdfBuffer: ArrayBuffer, fileName: string): Promise<string> => {
  try {
    console.log('📤 Uploading PDF to OpenAI...');
    console.log('📊 PDF size:', (pdfBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
    
    // Create a File object from the buffer
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', pdfBlob, fileName);
    formData.append('purpose', 'assistants');
    
    // Upload the file with retry logic
    let uploadResponse;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 Upload attempt ${attempt}/${maxRetries}...`);
        uploadResponse = await fetch('https://api.openai.com/v1/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
          },
          body: formData,
        });
        
        if (uploadResponse.ok) {
          break;
        }
        
        const errorText = await uploadResponse.text();
        lastError = `${uploadResponse.status}: ${errorText}`;
        console.error(`❌ Upload attempt ${attempt} failed:`, lastError);
        
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000; // 2s, 4s, 6s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        console.error(`❌ Upload attempt ${attempt} error:`, lastError);
        
        if (attempt < maxRetries) {
          const waitTime = attempt * 2000;
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!uploadResponse || !uploadResponse.ok) {
      throw new Error(`Failed to upload file after ${maxRetries} attempts. Last error: ${lastError}`);
    }
    
    const fileData = await uploadResponse.json();
    const fileId = fileData.id;
    console.log('✅ File uploaded:', fileId);
    
    // Create an Assistant
    console.log('🤖 Creating Assistant...');
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        name: 'Bando Analyzer',
        instructions: 'Sei un esperto analista di bandi pubblici italiani. Leggi TUTTO il documento prima di rispondere. Cerca OGNI informazione richiesta, specialmente importi e budget. Non lasciare campi vuoti se l\'informazione esiste nel documento.',
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }],
      }),
    });
    
    if (!assistantResponse.ok) {
      throw new Error(`Failed to create assistant: ${assistantResponse.status}`);
    }
    
    const assistant = await assistantResponse.json();
    console.log('✅ Assistant created:', assistant.id);
    
    // Create a Thread
    console.log('💬 Creating Thread...');
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Sei un esperto analista di BANDI PUBBLICI ITALIANI. Devi leggere TUTTO il documento PDF allegato dall'inizio alla fine e trovare TUTTE le informazioni richieste.

🎯 OBIETTIVO CRITICO: NON LASCIARE CAMPI NULL SE L'INFORMAZIONE ESISTE NEL DOCUMENTO

📋 ISTRUZIONI DETTAGLIATE PER OGNI CAMPO:

1️⃣ IMPORTO TOTALE DEL BANDO (total_amount) - RICERCA APPROFONDITA:
   Cerca in TUTTO il documento con questi termini:
   - "dotazione finanziaria": es. "dotazione finanziaria pari a € 10.000.000"
   - "risorse disponibili": es. "Le risorse disponibili ammontano a 5 milioni"
   - "stanziamento": es. "stanziamento complessivo di euro 3.000.000"
   - "budget": es. "budget totale di 8.000.000 EUR"
   - "importo complessivo": es. "importo complessivo pari a 2.500.000"
   - "fondi": es. "fondi messi a disposizione: 6 milioni di euro"
   - Cerca anche nelle tabelle e nei riepiloghi finanziari
   - Cerca nell'articolo che parla di "dotazione" o "risorse"
   - CONVERTI sempre in numero: "5 milioni" = 5000000, "3,5 milioni" = 3500000
   - Formati comuni: "€ 1.000.000,00" o "EUR 1.000.000" o "1 milione di euro"

2️⃣ IMPORTO MIN/MAX PER PROGETTO (min_funding, max_funding):
   Cerca:
   - "contributo minimo": es. "il contributo minimo è di € 50.000"
   - "contributo massimo": es. "contributo massimo per progetto: € 500.000"
   - "importo ammissibile": es. "importo min ammissibile 100.000, max 300.000"
   - Spesso nelle sezioni "Caratteristiche del contributo" o "Importi"

3️⃣ PERCENTUALE DI FINANZIAMENTO (funding_percentage):
   Cerca:
   - "intensità di aiuto": es. "intensità di aiuto pari all'80%"
   - "quota di contributo": es. "la quota di contributo è pari al 70%"
   - "percentuale di copertura": es. "percentuale di copertura: 60%"
   - "cofinanziamento": es. "cofinanziamento al 50%"
   - Può essere in forma "80% a fondo perduto"

4️⃣ DATE (application_deadline, project_duration_months):
   - Scadenza: cerca "termine", "scadenza", "entro il", "entro e non oltre"
   - Formati: "31/12/2025", "31 dicembre 2025", "entro il 15/03/2026"
   - Converti in YYYY-MM-DD
   - Durata: cerca "durata", "24 mesi", "due anni", "periodo di realizzazione"

5️⃣ CATEGORIE DI SPESA (expense_categories):
   Cerca sezioni:
   - "Spese ammissibili"
   - "Voci di costo"
   - "Categorie di investimento"
   Per OGNI categoria trova:
   - Nome esatto (es. "Macchinari e attrezzature")
   - Descrizione completa
   - Limite percentuale (es. "max 70% del totale")
   - Limite in euro (es. "max € 200.000")
   - Lista spese specifiche ammissibili

6️⃣ ALTRI CAMPI:
   - Title: nell'intestazione principale
   - Description: nella sezione "Finalità" o "Obiettivi"
   - Organization: intestazione del documento
   - Eligibility: sezione "Soggetti beneficiari" o "Chi può partecipare"
   - Evaluation: sezione "Criteri di valutazione"
   - Required docs: sezione "Documentazione" o "Allegati"

📤 FORMATO RISPOSTA (JSON PURO, SENZA MARKDOWN):
{
  "title": "TITOLO COMPLETO DEL BANDO",
  "description": "Descrizione dettagliata obiettivi e finalità",
  "organization": "Ente organizzatore",
  "total_amount": 10000000,
  "min_funding": 50000,
  "max_funding": 500000,
  "funding_percentage": 80,
  "application_deadline": "2025-12-31",
  "project_duration_months": 24,
  "eligibility_criteria": "Requisiti dettagliati",
  "evaluation_criteria": "Criteri di valutazione",
  "required_documents": ["doc1", "doc2"],
  "expense_categories": [
    {
      "name": "Nome categoria",
      "description": "Descrizione",
      "max_percentage": 70,
      "max_amount": 200000,
      "eligible_expenses": ["spesa1", "spesa2"]
    }
  ],
  "target_companies": "Destinatari",
  "geographic_scope": "Ambito territoriale",
  "innovation_areas": ["area1", "area2"]
}

⚠️ REGOLE FINALI:
- Numeri come NUMERI: 1000000 NON "1.000.000"
- Date: formato "YYYY-MM-DD"
- null SOLO se informazione ASSENTE
- NO markdown, NO \`\`\`, SOLO JSON
- Leggi TUTTO il documento prima di rispondere
- Se trovi l'importo in milioni, CONVERTI: 5 milioni = 5000000`,
          attachments: [{
            file_id: fileId,
            tools: [{ type: 'file_search' }],
          }],
        }],
      }),
    });
    
    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponse.status}`);
    }
    
    const thread = await threadResponse.json();
    console.log('✅ Thread created:', thread.id);
    
    // Run the Assistant
    console.log('🏃 Running Assistant...');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        assistant_id: assistant.id,
      }),
    });
    
    if (!runResponse.ok) {
      throw new Error(`Failed to run assistant: ${runResponse.status}`);
    }
    
    const run = await runResponse.json();
    console.log('✅ Run started:', run.id);
    
    // Poll for completion
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });
      
      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      attempts++;
      console.log(`⏳ Run status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }
    
    if (runStatus === 'failed') {
      throw new Error('Assistant run failed');
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Assistant run timeout');
    }
    
    // Get messages
    console.log('📨 Retrieving messages...');
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    
    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No assistant message found');
    }
    
    const content = assistantMessage.content[0].text.value;
    console.log('✅ Got response from Assistant');
    
    // Cleanup
    console.log('🧹 Cleaning up...');
    await fetch(`https://api.openai.com/v1/assistants/${assistant.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    });
    
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
    });
    
    return content;
    
  } catch (error) {
    console.error('❌ uploadPdfAndAnalyze error:', error);
    throw error;
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

    console.log('🤖 Analyzing PDF with OpenAI Assistants API...');
    
    const aiContent = await uploadPdfAndAnalyze(pdfBuffer, fileName);
    console.log('✅ Analysis complete');
    console.log('🔍 AI Content:', aiContent.substring(0, 500));

    let testData;
    try {
      // Trova e pulisce il JSON nella risposta
      let jsonStr = aiContent.trim();
      
      // Rimuovi markdown code blocks
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\s*/, '').replace(/```\s*$/, '').trim();
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\s*/, '').replace(/```\s*$/, '').trim();
      }
      
      console.log('🔍 Raw JSON string (first 500 chars):', jsonStr.substring(0, 500));
      
      // Trova il primo { e l'ultimo } per estrarre il JSON
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      
      if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
        throw new Error('No valid JSON structure found in AI response');
      }
      
      let cleanJson = jsonStr.substring(firstBrace, lastBrace + 1);
      
      // Rimuovi commenti JavaScript stile // e /* */
      cleanJson = cleanJson.replace(/\/\*[\s\S]*?\*\//g, '');
      cleanJson = cleanJson.replace(/\/\/.*/g, '');
      
      // Rimuovi trailing commas prima di } o ]
      cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
      
      // Fix per proprietà non quotate (es: {name: "value"} -> {"name": "value"})
      cleanJson = cleanJson.replace(/([{,]\s*)(\w+):/g, '$1"$2":');
      
      // Fix per valori stringa senza virgolette, MA preserva null, true, false
      // Prima proteggere i valori speciali
      cleanJson = cleanJson.replace(/:\s*(null|true|false)(\s*[,}\]])/gi, ': ___$1___$2');
      
      // Poi quota le stringhe non quotate
      cleanJson = cleanJson.replace(/:\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])(\s*[,}\]])/g, ': "$1"$2');
      
      // Ripristina i valori speciali (senza virgolette)
      cleanJson = cleanJson.replace(/___null___/gi, 'null');
      cleanJson = cleanJson.replace(/___true___/gi, 'true');
      cleanJson = cleanJson.replace(/___false___/gi, 'false');
      
      // Rimuovi spazi multipli
      cleanJson = cleanJson.replace(/\s+/g, ' ');
      
      console.log('🔍 Cleaned JSON (first 500 chars):', cleanJson.substring(0, 500));
      
      // Prova a parsare
      testData = JSON.parse(cleanJson);
      console.log('✅ Successfully parsed AI response');
      
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('📝 Original content (first 1000 chars):', aiContent.substring(0, 1000));
      
      // Log dell'errore per debugging
      console.error('❌ Risposta AI non parsabile:', aiContent.substring(0, 2000));
      
      // Ritorna errore invece di usare fallback
      return new Response(JSON.stringify({ 
        error: 'Il sistema AI non è riuscito a estrarre i dati dal PDF. Il formato della risposta non è valido.',
        details: parseError instanceof Error ? parseError.message : 'Errore sconosciuto',
        aiResponse: aiContent.substring(0, 500)
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Helper function per convertire stringhe "null" in null effettivi
    const sanitizeValue = (value: any): any => {
      if (value === "null" || value === "NULL" || value === "") {
        return null;
      }
      return value;
    };

    // Pulisci e valida i dati prima dell'inserimento
    const cleanData = {
      title: sanitizeValue(testData.title) || 'Bando da Analizzare',
      description: sanitizeValue(testData.description) || '',
      organization: sanitizeValue(testData.organization) || '',
      total_amount: (() => {
        const val = sanitizeValue(testData.total_amount);
        if (val === null || val === "") return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      })(),
      application_deadline: (() => {
        const val = sanitizeValue(testData.application_deadline);
        return (val && val !== "") ? val : null;
      })(),
      project_start_date: (() => {
        const val = sanitizeValue(testData.project_start_date);
        return (val && val !== "") ? val : null;
      })(),
      project_end_date: (() => {
        const val = sanitizeValue(testData.project_end_date);
        return (val && val !== "") ? val : null;
      })(),
      contact_person: sanitizeValue(testData.contact_person) || '',
      contact_email: sanitizeValue(testData.contact_email) || '',
      contact_phone: sanitizeValue(testData.contact_phone) || '',
      website_url: sanitizeValue(testData.website_url) || '',
      eligibility_criteria: sanitizeValue(testData.eligibility_criteria) || '',
      evaluation_criteria: sanitizeValue(testData.evaluation_criteria) || '',
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
