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

    const { documentType, documentId } = await req.json();

    console.log('📚 Indexing document:', { documentType, documentId });

    let documentData: any;
    let chunks: Array<{ title: string; content: string; metadata: any }> = [];

    // Recupera i dati del documento
    if (documentType === 'bando') {
      const { data, error } = await supabase
        .from('bandi')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !data) throw new Error('Bando not found');
      documentData = data;

      // Crea chunks dal bando
      chunks = [
        {
          title: `Bando: ${data.title} - Informazioni Generali`,
          content: `Titolo: ${data.title}
Descrizione: ${data.description || 'N/A'}
Codice Bando: ${data.bando_code || 'N/A'}
Budget Totale: €${data.total_budget || 0}
Scadenza: ${data.deadline || 'N/A'}
Status: ${data.status}`,
          metadata: { section: 'general' }
        }
      ];

      // Aggiungi parsed_data se disponibile
      if (data.parsed_data) {
        const parsedData = data.parsed_data;

        if (parsedData.eligibility_criteria) {
          chunks.push({
            title: `Bando: ${data.title} - Criteri di Ammissibilità`,
            content: `Criteri di Ammissibilità:\n${JSON.stringify(parsedData.eligibility_criteria, null, 2)}`,
            metadata: { section: 'eligibility' }
          });
        }

        if (parsedData.expense_categories) {
          chunks.push({
            title: `Bando: ${data.title} - Categorie di Spesa`,
            content: `Categorie di Spesa Ammissibili:\n${parsedData.expense_categories.map((cat: any) => 
              `- ${cat.name}: ${cat.description || ''} (Max: ${cat.max_percentage ? cat.max_percentage + '%' : 'N/A'})`
            ).join('\n')}`,
            metadata: { section: 'expense_categories' }
          });
        }

        if (parsedData.documentation_requirements) {
          chunks.push({
            title: `Bando: ${data.title} - Requisiti Documentali`,
            content: `Requisiti Documentali:\n${JSON.stringify(parsedData.documentation_requirements, null, 2)}`,
            metadata: { section: 'documentation' }
          });
        }

        if (parsedData.timeline) {
          chunks.push({
            title: `Bando: ${data.title} - Timeline`,
            content: `Timeline del Bando:\n${JSON.stringify(parsedData.timeline, null, 2)}`,
            metadata: { section: 'timeline' }
          });
        }
      }

    } else if (documentType === 'project') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !data) throw new Error('Project not found');
      documentData = data;

      // Crea chunks dettagliati dal progetto
      chunks = [
        {
          title: `Progetto: ${data.title} - Informazioni Generali e Obiettivi`,
          content: `Titolo: ${data.title}
CUP: ${data.cup_code || 'N/A'}
Status: ${data.status}
Manager: ${data.project_manager || 'N/A'}

DESCRIZIONE E OBIETTIVI:
${data.description || 'Non specificati'}

FINALITÀ DEL PROGETTO:
Il progetto ${data.title} mira a raggiungere gli obiettivi descritti nella proposta. Tutte le spese devono essere funzionali e coerenti con questi obiettivi, anche se non esplicitamente elencate nel piano iniziale, purché supportino il raggiungimento dei risultati attesi.`,
          metadata: { section: 'general' }
        },
        {
          title: `Progetto: ${data.title} - Budget e Allocazioni`,
          content: `Budget Totale: €${data.total_budget}
Budget Allocato: €${data.allocated_budget || 0}
Budget Speso: €${data.spent_budget || 0}
Budget Rimanente: €${data.remaining_budget || data.total_budget}
Percentuale Progresso: ${data.progress_percentage || 0}%

DISPONIBILITÀ BUDGET:
Il progetto ha ancora €${data.remaining_budget || data.total_budget} disponibili per spese coerenti con gli obiettivi progettuali.`,
          metadata: { section: 'budget' }
        },
        {
          title: `Progetto: ${data.title} - Tempistiche e Cronoprogramma`,
          content: `Data Inizio Prevista: ${data.start_date || 'N/A'}
Data Fine Prevista: ${data.end_date || 'N/A'}
Data Inizio Effettiva: ${data.actual_start_date || 'N/A'}
Data Fine Effettiva: ${data.actual_end_date || 'N/A'}

PERIODO DI VALIDITÀ:
Le spese devono essere sostenute durante il periodo di attuazione del progetto per essere ammissibili.`,
          metadata: { section: 'timeline' }
        }
      ];

      if (data.notes) {
        chunks.push({
          title: `Progetto: ${data.title} - Note e Dettagli Operativi`,
          content: `Note del Progetto:
${data.notes}

Queste note forniscono contesto aggiuntivo sulle attività previste e le modalità di realizzazione.`,
          metadata: { section: 'notes' }
        });
      }

      if (data.risk_assessment) {
        chunks.push({
          title: `Progetto: ${data.title} - Valutazione Rischi e Mitigazione`,
          content: `Valutazione Rischi:
${data.risk_assessment}`,
          metadata: { section: 'risks' }
        });
      }

      if (data.parsed_data) {
        chunks.push({
          title: `Progetto: ${data.title} - Dati Analizzati e Informazioni Tecniche`,
          content: `Dati Analizzati dal Documento di Progetto:
${JSON.stringify(data.parsed_data, null, 2)}`,
          metadata: { section: 'parsed_data' }
        });
      }
    } else {
      throw new Error('Invalid document type');
    }

    console.log(`📄 Created ${chunks.length} chunks for indexing`);

    // Genera embeddings per ogni chunk
    let indexed = 0;
    for (const chunk of chunks) {
      try {
        // Genera embedding con OpenAI
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk.content,
          }),
        });

        if (!embeddingResponse.ok) {
          console.error('OpenAI embedding error:', await embeddingResponse.text());
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Salva nel knowledge base
        const { error: insertError } = await supabase
          .from('knowledge_base')
          .upsert({
            source_id: documentId,
            content_type: documentType,
            title: chunk.title,
            content: chunk.content,
            metadata: chunk.metadata,
            embeddings: embedding,
          }, {
            onConflict: 'source_id,title',
            ignoreDuplicates: false
          });

        if (insertError) {
          console.error('Error inserting chunk:', insertError);
        } else {
          indexed++;
        }
      } catch (chunkError) {
        console.error('Error processing chunk:', chunkError);
      }
    }

    console.log(`✅ Successfully indexed ${indexed}/${chunks.length} chunks`);

    return new Response(
      JSON.stringify({
        success: true,
        indexed: indexed,
        total: chunks.length,
        documentType,
        documentId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('❌ Error in index-document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
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
