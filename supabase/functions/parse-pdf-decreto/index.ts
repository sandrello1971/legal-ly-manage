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
    const { pdfText, fileName, bandoId } = requestData;

    console.log('📄 Processing PDF:', fileName, 'for bando:', bandoId);

    if (!pdfText) {
      console.error('❌ No PDF text provided');
      return new Response(JSON.stringify({ error: 'Testo PDF mancante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
            content: `Sei un esperto analista di bandi pubblici italiani. Analizza il contenuto del PDF e estrai le informazioni rilevanti.
            
Restituisci SOLO un oggetto JSON valido con questa struttura esatta:
{
  "title": "titolo del bando",
  "description": "descrizione dettagliata",
  "organization": "ente emittente",
  "total_amount": 0,
  "application_deadline": "YYYY-MM-DD",
  "project_start_date": "YYYY-MM-DD",
  "project_end_date": "YYYY-MM-DD",
  "contact_person": "persona di contatto",
  "contact_email": "email@esempio.it",
  "contact_phone": "numero telefono",
  "website_url": "url sito web",
  "eligibility_criteria": "criteri di ammissibilità",
  "evaluation_criteria": "criteri di valutazione",
  "required_documents": ["doc1", "doc2", "doc3"]
}

IMPORTANTE:
- Se un campo non è presente nel testo, usa null
- Per gli importi, estrai solo i numeri (senza simboli € o virgole)
- Per le date usa il formato YYYY-MM-DD
- Per required_documents restituisci un array di stringhe
- NON aggiungere commenti o testo extra, solo il JSON`
          },
          {
            role: 'user',
            content: `Analizza questo bando pubblico e estrai le informazioni richieste:\n\n${pdfText.substring(0, 15000)}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
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
      const aiContent = aiData.choices[0].message.content.trim();
      console.log('🔍 AI Content:', aiContent.substring(0, 200) + '...');
      
      // Remove any markdown formatting or extra text
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiContent;
      
      parsedData = JSON.parse(jsonString);
      console.log('✅ Successfully parsed AI response');
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('Raw AI content:', aiData.choices[0].message.content);
      return new Response(JSON.stringify({ error: 'Errore nel parsing della risposta AI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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