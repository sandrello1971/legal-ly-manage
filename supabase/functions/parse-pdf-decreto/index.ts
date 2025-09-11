import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ParsedDecreeData {
  totalAmount?: number;
  currency?: string;
  applicationDeadline?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  organization?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  eligibilityCriteria?: string;
  evaluationCriteria?: string;
  requiredDocuments?: string[];
  expenseCategories?: {
    category: string;
    maxPercentage?: number;
    maxAmount?: number;
    description?: string;
  }[];
  objectives?: string[];
  keyRequirements?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, bandoId } = await req.json();

    if (!fileUrl || !bandoId) {
      return new Response(
        JSON.stringify({ error: 'Missing fileUrl or bandoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing PDF decreto:', fileUrl);

    // Scarica il file PDF
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${fileResponse.statusText}`);
    }

    const pdfBuffer = await fileResponse.arrayBuffer();
    
    // Converti in base64 per invio a OpenAI
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    console.log('Analyzing PDF with OpenAI...');

    // Analizza il PDF con OpenAI Vision
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: `Sei un esperto nell'analisi di decreti e bandi pubblici italiani. 
            Estrai SOLO le informazioni presenti nel documento. Se un'informazione non è presente, non inventarla.
            Restituisci un JSON valido con la struttura specificata.
            
            Per le date, usa il formato YYYY-MM-DD.
            Per gli importi, estrai solo il numero (senza simboli di valuta).
            Per le categorie di spesa, cerca sezioni come "Spese ammissibili", "Costi eleggibili", "Tipologie di spesa".`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analizza questo decreto/bando e estrai le seguenti informazioni in formato JSON:
                
                {
                  "totalAmount": number | null,
                  "currency": string | null,
                  "applicationDeadline": string | null,
                  "projectStartDate": string | null,
                  "projectEndDate": string | null,
                  "organization": string | null,
                  "contactPerson": string | null,
                  "contactEmail": string | null,
                  "contactPhone": string | null,
                  "eligibilityCriteria": string | null,
                  "evaluationCriteria": string | null,
                  "requiredDocuments": string[] | null,
                  "expenseCategories": [
                    {
                      "category": string,
                      "maxPercentage": number | null,
                      "maxAmount": number | null,
                      "description": string | null
                    }
                  ] | null,
                  "objectives": string[] | null,
                  "keyRequirements": string[] | null
                }
                
                Cerca in particolare:
                - Importo totale del bando/finanziamento
                - Scadenze per la presentazione delle domande
                - Date di inizio e fine progetto
                - Ente organizzatore
                - Contatti (email, telefono, referente)
                - Criteri di eleggibilità e valutazione
                - Documenti richiesti
                - Categorie di spese ammissibili con percentuali/limiti
                - Obiettivi del bando
                - Requisiti chiave
                
                Restituisci SOLO il JSON senza testo aggiuntivo.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    const analysisResult = openAIData.choices[0].message.content;

    console.log('OpenAI analysis result:', analysisResult);

    // Parse del JSON restituito da OpenAI
    let parsedData: ParsedDecreeData;
    try {
      // Rimuovi eventuali caratteri non JSON all'inizio/fine
      const cleanedResult = analysisResult.replace(/^```json\s*|```$/g, '').trim();
      parsedData = JSON.parse(cleanedResult);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', analysisResult);
      
      // Fallback: restituisci i dati parziali estratti manualmente
      parsedData = {
        totalAmount: null,
        currency: 'EUR'
      };
    }

    // Aggiorna il bando nel database con i dati estratti
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const updateData: any = {
      parsed_data: parsedData
    };

    // Mappa i campi estratti ai campi della tabella
    if (parsedData.totalAmount) updateData.total_amount = parsedData.totalAmount;
    if (parsedData.applicationDeadline) updateData.application_deadline = parsedData.applicationDeadline;
    if (parsedData.projectStartDate) updateData.project_start_date = parsedData.projectStartDate;
    if (parsedData.projectEndDate) updateData.project_end_date = parsedData.projectEndDate;
    if (parsedData.organization) updateData.organization = parsedData.organization;
    if (parsedData.contactPerson) updateData.contact_person = parsedData.contactPerson;
    if (parsedData.contactEmail) updateData.contact_email = parsedData.contactEmail;
    if (parsedData.contactPhone) updateData.contact_phone = parsedData.contactPhone;
    if (parsedData.eligibilityCriteria) updateData.eligibility_criteria = parsedData.eligibilityCriteria;
    if (parsedData.evaluationCriteria) updateData.evaluation_criteria = parsedData.evaluationCriteria;
    if (parsedData.requiredDocuments) updateData.required_documents = parsedData.requiredDocuments;

    const { error: updateError } = await supabase
      .from('bandi')
      .update(updateData)
      .eq('id', bandoId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update bando: ${updateError.message}`);
    }

    console.log('PDF parsing completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        parsedData,
        message: 'PDF analizzato con successo'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-pdf-decreto function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Errore durante l\'analisi del PDF',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});