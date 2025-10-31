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

    const { documentId, projectId } = await req.json();

    console.log('🔍 Analyzing expense document:', { documentId, projectId });

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Get project's bando for expense categories
    let bandoData = null;
    if (project.bando_id) {
      const { data: bando } = await supabase
        .from('bandi')
        .select('parsed_data')
        .eq('id', project.bando_id)
        .single();
      bandoData = bando?.parsed_data;
    }

    console.log('📋 Project context:', { 
      projectTitle: project.title, 
      budget: project.total_budget,
      hasExpenseCategories: !!bandoData?.expense_categories 
    });

    // Nota: RAG disabilitato per garantire risultati deterministici
    // La confidenza deve basarsi solo su criteri oggettivi del documento

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_url.split('/documents/')[1]);

    if (downloadError) {
      throw new Error('Failed to download file: ' + downloadError.message);
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Create analysis prompt with RAG context
    const expenseCategories = bandoData?.expense_categories || [];
    const categoryNames = expenseCategories.map((cat: any) => cat.name).join(', ');

    const analysisPrompt = `
Analizza questo documento di spesa per il progetto "${project.title}".

IMPORTANTE - DUE VERIFICHE SEPARATE E INDIPENDENTI:

1. VERIFICA FORMALE BANDO (solo aspetti formali del documento):
   - Codice CUP presente nel documento? (+30 punti)
   - Documento leggibile e completo? (+20 punti)
   - Data documento presente e valida? (+10 punti)
   - Fornitore/Beneficiario identificabile? (+10 punti)
   - Importo chiaramente indicato? (+10 punti)
   Subtotale massimo verifica formale: 80 punti

2. VERIFICA CONTENUTO PROGETTO (coerenza con il progetto specifico):
   - La descrizione della spesa è compatibile con gli obiettivi del progetto? (+15 punti)
   - La categoria di spesa è appropriata per il progetto? (+5 punti)
   Subtotale massimo verifica progetto: 20 punti

CALCOLO CONFIDENZA FINALE (DETERMINISTICO):
Somma i punti delle due verifiche (0-100), poi DIVIDI PER 100 per ottenere scala 0.0-1.0.
La confidenza DEVE essere calcolata matematicamente sommando i punti e dividendo per 100, non con valutazioni soggettive.

REGOLE CRITICHE PER DETERMINISMO:
- Usa SOLO i criteri numerici sopra indicati
- NON fare valutazioni soggettive o interpretazioni variabili
- Se un criterio è soddisfatto = aggiungi i punti, altrimenti no
- Per la compatibilità con obiettivi: se la spesa è ragionevolmente collegabile al tipo di progetto = +15 punti
- NON penalizzare spese operative normali (es: licenze software per progetti tech, consulenze per progetti ricerca, ecc.)

CONTESTO PROGETTO:
- Titolo: ${project.title}
- Budget totale: €${project.total_budget}
- Budget speso: €${project.spent_budget || 0}
- Budget rimanente: €${project.remaining_budget || project.total_budget}
- Categorie spesa disponibili: ${categoryNames || 'Tutte le categorie ammesse'}

ANALIZZA E ESTRAI:
1. Tipo di documento (fattura, ricevuta, nota spese, etc.)
2. Importo totale
3. Data del documento
4. Fornitore/Beneficiario
5. Descrizione dettagliata della spesa
6. Codice progetto (CUP: ${project.cup || 'N/A'})

VERIFICA FORMALE BANDO (calcola punti):
- CUP "${project.cup || ''}" trovato nel documento? Sì = +30 punti, No = 0 punti
- Documento leggibile e di qualità sufficiente? Sì = +20 punti, No = 0 punti  
- Data documento presente? Sì = +10 punti, No = 0 punti
- Fornitore chiaramente indicato? Sì = +10 punti, No = 0 punti
- Importo ben visibile? Sì = +10 punti, No = 0 punti

VERIFICA PROGETTO (calcola punti):
- Spesa compatibile con tipo/obiettivi progetto? Sì = +15 punti, No = 0 punti
- Categoria appropriata? Sì = +5 punti, No = 0 punti

CATEGORIE DI SPESA PROGETTO:
${expenseCategories.map((cat: any) => 
  `- ${cat.name}: ${cat.description || ''} (Max: ${cat.max_percentage ? cat.max_percentage + '%' : 'N/A'})`
).join('\n')}

Rispondi in JSON con questa struttura esatta:
{
  "document_type": "string",
  "total_amount": number,
  "document_date": "YYYY-MM-DD",
  "supplier": "string",
  "description": "string",
  "project_code_found": "string o null (indica CUP se trovato)",
  
  "formal_validation": {
    "cup_found": boolean,
    "cup_score": number (0 o 30),
    "document_readable": boolean,
    "readable_score": number (0 o 20),
    "date_present": boolean,
    "date_score": number (0 o 10),
    "supplier_clear": boolean,
    "supplier_score": number (0 o 10),
    "amount_clear": boolean,
    "amount_score": number (0 o 10),
    "total_formal_score": number (somma dei punteggi, max 80)
  },
  
  "project_validation": {
    "expense_compatible": boolean,
    "compatibility_score": number (0 o 15),
    "category_appropriate": boolean,
    "category_score": number (0 o 5),
    "total_project_score": number (somma, max 20)
  },
  
  "suggested_category": "string",
  "confidence": number ((formal_score + project_score) / 100, range 0.0-1.0),
  "issues": ["array di problemi specifici rilevati"],
  
  "extracted_line_items": [
    {
      "description": "string",
      "amount": number,
      "category": "string"
    }
  ]
}
`;

    console.log('🤖 Sending analysis request to OpenAI...');

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  url: `data:${document.mime_type};base64,${base64File}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIResult = await openAIResponse.json();
    console.log('✅ OpenAI response received');

    let analysisData;
    try {
      const content = openAIResult.choices[0].message.content;
      console.log('📄 OpenAI content:', content);
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      
      // Fallback analysis
      analysisData = {
        document_type: document.document_type || 'unknown',
        total_amount: document.amount || 0,
        document_date: document.document_date || new Date().toISOString().split('T')[0],
        supplier: 'Fornitore da verificare',
        description: document.title || 'Documento da analizzare',
        project_code_found: null,
        formal_validation: {
          cup_found: false,
          cup_score: 0,
          document_readable: false,
          readable_score: 0,
          date_present: false,
          date_score: 0,
          supplier_clear: false,
          supplier_score: 0,
          amount_clear: false,
          amount_score: 0,
          total_formal_score: 0
        },
        project_validation: {
          expense_compatible: false,
          compatibility_score: 0,
          category_appropriate: false,
          category_score: 0,
          total_project_score: 0
        },
        suggested_category: 'other',
        confidence: 0,
        issues: ['Analisi automatica fallita', 'Richiede verifica manuale completa'],
        extracted_line_items: []
      };
    }

    // Calculate budget impact
    const remainingBudget = project.remaining_budget;
    const wouldExceedBudget = analysisData.total_amount > remainingBudget;
    
    if (wouldExceedBudget) {
      analysisData.issues = analysisData.issues || [];
      analysisData.issues.push(`Importo supera il budget rimanente (€${remainingBudget})`);
    }

    // Check category limits
    if (analysisData.suggested_category && expenseCategories.length > 0) {
      const category = expenseCategories.find((cat: any) => 
        cat.name.toLowerCase() === analysisData.suggested_category.toLowerCase()
      );
      
      if (category?.max_amount && analysisData.total_amount > category.max_amount) {
        analysisData.issues = analysisData.issues || [];
        analysisData.issues.push(`Importo supera il limite di categoria (€${category.max_amount})`);
      }
    }

    console.log('✅ Analysis completed:', {
      amount: analysisData.total_amount,
      category: analysisData.suggested_category,
      confidence: analysisData.confidence,
      formal_score: analysisData.formal_validation?.total_formal_score || 0,
      project_score: analysisData.project_validation?.total_project_score || 0,
      issues: analysisData.issues?.length || 0
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisData,
        project_context: {
          remaining_budget: remainingBudget,
          would_exceed_budget: wouldExceedBudget,
          available_categories: categoryNames
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
    console.error('❌ Error in analyze-expense-document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        fallback_analysis: {
          requires_manual_review: true,
          reason: 'Automatic analysis failed'
        }
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