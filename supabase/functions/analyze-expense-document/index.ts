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

    // RAG: Genera embedding per la descrizione del documento e recupera contesto rilevante
    let ragContext = '';
    try {
      console.log('🔍 Generating embedding for RAG search...');
      
      const queryText = `Spesa per il progetto ${project.title}. Documento: ${document.title || 'Non specificato'}. Importo: ${document.amount || 'N/A'}`;
      
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: queryText,
        }),
      });

      if (embeddingResponse.ok) {
        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // Cerca documenti rilevanti nel knowledge base
        const { data: relevantDocs, error: searchError } = await supabase
          .rpc('match_knowledge_base', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 5
          });

        if (!searchError && relevantDocs && relevantDocs.length > 0) {
          console.log(`✅ Found ${relevantDocs.length} relevant documents in knowledge base`);
          ragContext = '\n\nCONTESTO RILEVANTE DAL DATABASE:\n' + 
            relevantDocs.map((doc: any) => 
              `[${doc.title}]\n${doc.content}\n(Rilevanza: ${(1 - doc.distance).toFixed(2)})`
            ).join('\n\n');
        } else {
          console.log('⚠️ No relevant documents found in knowledge base');
        }
      }
    } catch (ragError) {
      console.error('❌ RAG search error:', ragError);
      // Continue without RAG context
    }

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

${ragContext}

IMPORTANTE - ORDINE DI VERIFICA:
1. VERIFICA PROGETTO (priorità assoluta): Il progetto ha già superato la fase di ammissibilità al bando.
   Verifica che la spesa sia coerente con gli obiettivi, il budget e le tempistiche del progetto.
   
2. VERIFICA FORMALE BANDO: Solo controlli formali (es: tipo di documento, completezza informazioni).
   NON verificare criteri di ammissibilità generali perché il progetto è già stato approvato.

CALCOLO CONFIDENZA (IMPORTANTE):
- 90-100%: CUP trovato + spesa chiaramente coerente con obiettivi progetto + categoria appropriata + documento valido
- 80-89%: CUP trovato + spesa ragionevolmente coerente con progetto + documentazione completa
- 70-79%: CUP trovato ma spesa parzialmente coerente O documento parzialmente incompleto
- 60-69%: CUP non trovato ma spesa molto coerente con obiettivi del progetto
- < 60%: Problemi significativi di coerenza o documentazione

NOTA CRITICA: NON penalizzare la confidenza se la spesa "non è esplicitamente prevista" ma è COERENTE con gli obiettivi del progetto. I progetti evolvono e molte spese operative sono implicitamente necessarie anche se non elencate dettagliatamente nel piano iniziale.

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
6. Codice progetto (CUP, CIG o altri riferimenti)
7. Verifica con PROGETTO:
   - Coerenza con obiettivi del progetto
   - Rispetto del budget allocato
   - Categoria di spesa appropriata
   - Tempistiche compatibili
8. Verifica FORMALE con bando:
   - Documento completo e leggibile
   - Informazioni obbligatorie presenti
   - Formato documentale adeguato

CATEGORIE DI SPESA PROGETTO:
${expenseCategories.map((cat: any) => 
  `- ${cat.name}: ${cat.description || ''} (Max: ${cat.max_percentage ? cat.max_percentage + '%' : 'N/A'})`
).join('\n')}

Rispondi in JSON con questa struttura:
{
  "document_type": "string",
  "total_amount": number,
  "document_date": "YYYY-MM-DD",
  "supplier": "string",
  "description": "string",
  "project_code_found": "string o null",
  "is_project_related": boolean,
  "project_relation_reason": "string (motivazione basata su obiettivi e scope del progetto)",
  "suggested_category": "string",
  "project_coherence_score": number (0-100),
  "formal_check_passed": boolean,
  "confidence": number (0-100),
  "issues": ["array di eventuali problemi"],
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
        is_project_related: false,
        project_relation_reason: 'Analisi automatica non riuscita - richiede verifica manuale completa',
        suggested_category: 'other',
        project_coherence_score: 0,
        formal_check_passed: false,
        confidence: 0,
        issues: ['Analisi automatica fallita', 'Richiede verifica manuale completa del progetto e documentazione'],
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