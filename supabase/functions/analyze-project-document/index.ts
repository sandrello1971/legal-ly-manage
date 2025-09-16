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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
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

    // Convert file to base64 for OpenAI
    const arrayBuffer = await file.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

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

Rispondi in JSON strutturato:
{
  "project_info": {
    "title": "string",
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

    console.log('🤖 Calling OpenAI for project document analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: analysisPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64File}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ OpenAI analysis completed');

    let extractedData;
    try {
      const content = result.choices[0].message.content;
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