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

/**
 * Upload PDF to OpenAI and analyze using Assistants API
 */
async function uploadPdfAndAnalyze(pdfBuffer: ArrayBuffer, fileName: string, analysisPrompt: string): Promise<string> {
  console.log('📤 Uploading PDF to OpenAI...');
  
  // Convert ArrayBuffer to Blob for upload
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  
  // Create FormData for file upload
  const formData = new FormData();
  formData.append('file', blob, fileName);
  formData.append('purpose', 'assistants');
  
  // Upload file to OpenAI
  const uploadResponse = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('❌ File upload error:', errorText);
    throw new Error(`File upload failed: ${uploadResponse.status}`);
  }

  const fileData = await uploadResponse.json();
  const fileId = fileData.id;
  console.log('✅ File uploaded:', fileId);

  try {
    // Create Assistant
    console.log('🤖 Creating Assistant...');
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        name: 'Project Document Analyzer',
        instructions: 'Sei un esperto analista di progetti che estrae informazioni strutturate da documenti di progetto.',
        model: 'gpt-4o',
        tools: [{ type: 'file_search' }],
      }),
    });

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text();
      console.error('❌ Assistant creation error:', errorText);
      throw new Error(`Assistant creation failed: ${assistantResponse.status}`);
    }

    const assistant = await assistantResponse.json();
    console.log('✅ Assistant created:', assistant.id);

    // Create Thread with file attached
    console.log('💬 Creating Thread...');
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: analysisPrompt,
            attachments: [
              {
                file_id: fileId,
                tools: [{ type: 'file_search' }],
              },
            ],
          },
        ],
      }),
    });

    if (!threadResponse.ok) {
      const errorText = await threadResponse.text();
      console.error('❌ Thread creation error:', errorText);
      throw new Error(`Thread creation failed: ${threadResponse.status}`);
    }

    const thread = await threadResponse.json();
    console.log('✅ Thread created:', thread.id);

    // Run Assistant
    console.log('▶️ Running Assistant...');
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
      const errorText = await runResponse.text();
      console.error('❌ Run creation error:', errorText);
      throw new Error(`Run creation failed: ${runResponse.status}`);
    }

    const run = await runResponse.json();
    console.log('✅ Run started:', run.id);

    // Poll for completion
    let runStatus = run.status;
    let attempts = 0;
    const maxAttempts = 60;

    while (runStatus !== 'completed' && runStatus !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      const statusData = await statusResponse.json();
      runStatus = statusData.status;
      console.log(`⏳ Run status: ${runStatus} (attempt ${attempts}/${maxAttempts})`);
    }

    if (runStatus !== 'completed') {
      throw new Error(`Run did not complete successfully. Status: ${runStatus}`);
    }

    // Get messages
    console.log('📨 Retrieving messages...');
    const messagesResponse = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    );

    if (!messagesResponse.ok) {
      throw new Error('Failed to retrieve messages');
    }

    const messages = await messagesResponse.json();
    const assistantMessage = messages.data.find((msg: any) => msg.role === 'assistant');

    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }

    const content = assistantMessage.content[0].text.value;
    console.log('✅ Analysis complete');

    // Cleanup: delete assistant
    try {
      await fetch(`https://api.openai.com/v1/assistants/${assistant.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      });
      console.log('🧹 Assistant deleted');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to delete assistant:', cleanupError);
    }

    return content;

  } finally {
    // Cleanup: delete file
    try {
      await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
        },
      });
      console.log('🧹 File deleted');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to delete file:', cleanupError);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ User authenticated:', user.id);
    console.log('📄 Starting project document analysis...');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const bandoId = formData.get('bandoId') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('📋 Processing file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      projectId,
      bandoId
    });

    // Get bando context for reference
    let bandoContext = null;
    if (bandoId) {
      const { data: bando } = await supabase
        .from('bandi')
        .select('title, description, parsed_data')
        .eq('id', bandoId)
        .single();
      bandoContext = bando;
    }

    const analysisPrompt = `
Analizza questo documento di progetto per estrarre tutti i parametri necessari per il monitoraggio e la rendicontazione.

${bandoContext ? `
CONTESTO BANDO DI RIFERIMENTO:
- Titolo: ${bandoContext.title}
- Descrizione: ${bandoContext.description || 'N/A'}
- Categorie spesa ammissibili: ${bandoContext.parsed_data?.expense_categories?.map((c: any) => c.name).join(', ') || 'N/A'}
` : ''}

ESTRAI E ANALIZZA:

1. INFORMAZIONI GENERALI:
   - Titolo del progetto
   - Codice CUP (Codice Unico di Progetto) - CERCA ATTENTAMENTE questo codice identificativo
   - Descrizione dettagliata
   - Obiettivi principali
   - Durata del progetto (date inizio/fine)
   - Project manager/responsabile

2. BUDGET E FINANZIAMENTI:
   - Budget totale del progetto
   - Contributo ricevuto/assegnato
   - Budget per categorie di spesa
   - Eventuali cofinanziamenti
   - Percentuali di copertura per categoria

3. PARAMETRI DI MONITORAGGIO:
   - KPI e indicatori di performance
   - Milestone e deliverable principali
   - Scadenze critiche
   - Risultati attesi misurabili

4. VINCOLI E REQUISITI:
   - Vincoli di spesa specifici
   - Requisiti di rendicontazione
   - Documenti richiesti per milestone
   - Eventuali limitazioni temporali

5. CATEGORIE DI SPESA DETTAGLIATE:
   - Per ogni categoria: descrizione, limiti, percentuali
   - Spese ammissibili e non ammissibili
   - Vincoli specifici per categoria

6. TEAM E RISORSE:
   - Composizione del team
   - Ruoli e responsabilità
   - Risorse necessarie

Rispondi SOLO con JSON valido (nessun testo aggiuntivo, solo il JSON):
{
  "project_info": {
    "title": "string",
    "cup_code": "string o null - IMPORTANTE: cerca il Codice CUP nel documento",
    "description": "string", 
    "objectives": ["array di obiettivi"],
    "start_date": "YYYY-MM-DD o null",
    "end_date": "YYYY-MM-DD o null",
    "duration_months": number,
    "project_manager": "string o null"
  },
  "budget": {
    "total_amount": number,
    "funding_received": number,
    "co_funding": number,
    "funding_percentage": number,
    "categories": [
      {
        "name": "string",
        "description": "string",
        "allocated_amount": number,
        "max_percentage": number,
        "eligible_expenses": ["array"],
        "restrictions": ["array"]
      }
    ]
  },
  "monitoring_parameters": {
    "kpis": [
      {
        "name": "string",
        "description": "string",
        "target_value": "string",
        "measurement_unit": "string"
      }
    ],
    "milestones": [
      {
        "name": "string",
        "description": "string",
        "due_date": "YYYY-MM-DD o null",
        "deliverables": ["array"],
        "budget_percentage": number
      }
    ],
    "reporting_requirements": {
      "frequency": "string",
      "required_documents": ["array"],
      "deadlines": ["array"]
    }
  },
  "constraints": {
    "spending_rules": ["array"],
    "temporal_constraints": ["array"],
    "documentation_requirements": ["array"],
    "compliance_requirements": ["array"]
  },
  "team": {
    "members": [
      {
        "role": "string",
        "name": "string o null",
        "responsibilities": ["array"]
      }
    ],
    "required_skills": ["array"],
    "external_partners": ["array"]
  },
  "risk_factors": ["array di potenziali rischi identificati"],
  "success_criteria": ["array di criteri di successo"],
  "confidence": number (0-100)
}
`;

    // Get PDF buffer
    const arrayBuffer = await file.arrayBuffer();
    
    console.log('🤖 Calling OpenAI for project document analysis...');
    
    // Use Assistants API to analyze PDF
    const content = await uploadPdfAndAnalyze(arrayBuffer, file.name, analysisPrompt);

    let extractedData;
    try {
      console.log('📄 Raw OpenAI response:', content);
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully parsed project data');
      } else {
        throw new Error('No JSON found in OpenAI response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      
      // Fallback data structure
      extractedData = {
        project_info: {
          title: "Progetto da analizzare manualmente",
          description: "Analisi automatica non riuscita - richiede verifica manuale",
          objectives: [],
          start_date: null,
          end_date: null,
          duration_months: 12,
          project_manager: null
        },
        budget: {
          total_amount: 0,
          funding_received: 0,
          co_funding: 0,
          funding_percentage: 0,
          categories: []
        },
        monitoring_parameters: {
          kpis: [],
          milestones: [],
          reporting_requirements: {
            frequency: "mensile",
            required_documents: [],
            deadlines: []
          }
        },
        constraints: {
          spending_rules: [],
          temporal_constraints: [],
          documentation_requirements: [],
          compliance_requirements: []
        },
        team: {
          members: [],
          required_skills: [],
          external_partners: []
        },
        risk_factors: ["Analisi automatica fallita"],
        success_criteria: [],
        confidence: 0
      };
    }

    // Validate and enrich data
    const validation = {
      has_budget_info: extractedData.budget.total_amount > 0,
      has_timeline: !!(extractedData.project_info.start_date && extractedData.project_info.end_date),
      has_milestones: extractedData.monitoring_parameters.milestones.length > 0,
      has_kpis: extractedData.monitoring_parameters.kpis.length > 0,
      confidence_level: extractedData.confidence || 0
    };

    console.log('📊 Analysis validation:', validation);

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: extractedData,
        validation: validation,
        bando_context: bandoContext ? {
          title: bandoContext.title,
          has_expense_categories: !!bandoContext.parsed_data?.expense_categories
        } : null,
        processing_info: {
          file_name: file.name,
          file_size: file.size,
          processing_time: new Date().toISOString()
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error in project document analysis:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        fallback_message: "Analisi automatica non riuscita. È possibile compilare manualmente i campi del progetto."
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
