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
        instructions: 'Sei un esperto analista di bandi pubblici italiani. Analizza i documenti e estrai le informazioni richieste in formato JSON.',
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
          content: `Sei un esperto analista di BANDI PUBBLICI ITALIANI. Analizza ATTENTAMENTE questo PDF e estrai TUTTE le informazioni richieste.

ISTRUZIONI CRITICHE:
1. LEGGI TUTTO IL DOCUMENTO prima di rispondere
2. Cerca le informazioni usando SINONIMI e termini comuni nei bandi italiani:
   - Scadenza: "termine ultimo", "data di chiusura", "scadenza presentazione domande", "termine perentorio"
   - Importo: "dotazione finanziaria", "risorse disponibili", "budget complessivo", "stanziamento"
   - Percentuale di finanziamento: "intensità di aiuto", "quota di contributo", "percentuale di copertura"
3. Per le DATE, cerca formati italiani: gg/mm/aaaa, gg-mm-aaaa, "entro il", "entro e non oltre"
4. Per gli IMPORTI, cerca: €, euro, EUR, milioni, migliaia
5. Se un campo NON è presente nel documento, metti null (non 0, non stringhe vuote)

CATEGORIE DI SPESA:
- Estrai ESATTAMENTE le categorie dal bando (NON inventare)
- Cerca sezioni: "spese ammissibili", "voci di costo", "categorie di spesa", "investimenti ammissibili"
- Per ogni categoria, identifica limiti percentuali o monetari

Rispondi SOLO con questo JSON (valori come numeri, non stringhe, null se non presente):
{
  "title": "titolo completo esatto del bando",
  "description": "descrizione obiettivi e finalità del bando",
  "organization": "ente/organizzazione che emette il bando", 
  "total_amount": 1000000,
  "min_funding": 50000, 
  "max_funding": 200000,
  "funding_percentage": 50,
  "application_deadline": "2025-12-31",
  "project_duration_months": 24,
  "eligibility_criteria": "requisiti di ammissibilità completi",
  "evaluation_criteria": "criteri di valutazione e selezione", 
  "required_documents": ["elenco completo documenti richiesti"],
  "expense_categories": [
    {
      "name": "nome categoria esatto dal testo",
      "description": "descrizione completa dal bando", 
      "max_percentage": 20,
      "max_amount": 50000,
      "eligible_expenses": ["dettaglio spese specifiche ammissibili"]
    }
  ],
  "target_companies": "destinatari (PMI, startup, università, etc)",
  "geographic_scope": "ambito territoriale",
  "innovation_areas": ["settori/aree se specificati"]
}`,
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
      
      // Usa dati di fallback
      testData = {
        title: 'BANDO - Errore nel parsing AI',
        description: 'Errore nel parsing AI - usando dati fallback. Il PDF è stato analizzato ma la risposta non è in formato JSON valido.',
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
