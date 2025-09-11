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

    console.log('🧾 PDF text length:', pdfText.length);
    console.log('📝 PDF text preview:', pdfText.substring(0, 500).replace(/\s+/g, ' '));
    console.log('🤖 Calling OpenAI for PDF analysis...');

    // Call OpenAI to analyze the PDF content
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `Analizza questo documento PDF di un bando pubblico italiano ed estrai TUTTE le informazioni possibili.

Restituisci SOLO un oggetto JSON valido:
{
  "title": "titolo completo del bando",
  "description": "descrizione dettagliata dell'obiettivo",
  "organization": "ente che ha emesso il bando",
  "total_amount": numero_senza_virgole,
  "application_deadline": "YYYY-MM-DD",
  "project_start_date": "YYYY-MM-DD", 
  "project_end_date": "YYYY-MM-DD",
  "contact_person": "nome della persona di contatto",
  "contact_email": "email di contatto",
  "contact_phone": "numero di telefono",
  "website_url": "sito web dell'ente",
  "eligibility_criteria": "chi può partecipare",
  "evaluation_criteria": "come vengono valutate le proposte",
  "required_documents": ["lista", "dei", "documenti", "richiesti"]
}

REGOLE IMPORTANTI:
- Estrai SEMPRE il titolo anche se parziale
- Cerca importi in €, EUR, euro (anche milioni/migliaia)
- Converti date italiane in formato YYYY-MM-DD
- Se manca info, usa null (NON stringa vuota)
- Cerca attentamente numeri di telefono e email
- Identifica l'ente emittente (Regione, Ministero, ecc.)
- RISPOSTA SOLO JSON, niente altro testo`
          },
          {
            role: 'user',
            content: `ANALIZZA QUESTO BANDO:\n\n${pdfText.substring(0, 20000)}`
          }
        ],
        max_completion_tokens: 2000,
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

    // Heuristic fallback if AI returned mostly empty fields
    const countFilled = (obj: any) => Object.values(obj || {}).filter((v: any) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)).length;
    console.log('📊 AI extracted fields count:', countFilled(parsedData));
    
    if (countFilled(parsedData) < 2) { // Very aggressive fallback
      console.log('🚨 AI extraction failed, applying DIRECT text parsing fallback');
      const cleaned = (pdfText || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ');
      
      // DIRECT extraction without relying on AI
      const directData: any = {};

      // Title - multiple attempts
      const titleCandidates = [
        cleaned.match(/(?:BANDO|AVVISO|CALL)[^\n.]{10,200}/i)?.[0],
        cleaned.match(/(?:SI\s*4\.0|INDUSTRIA\s*4\.0)[^\n.]{0,150}/i)?.[0],
        cleaned.match(/(?:per|di|del)[^\n.]{10,100}(?:innovazione|digitalizzazione|imprese)/i)?.[0],
        fileName?.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
      ].filter(Boolean);
      
      directData.title = titleCandidates[0] || 'Bando SI 4.0 2025';

      // Organization - direct search
      const orgCandidates = [
        cleaned.match(/(?:Regione\s+\w+)/i)?.[0],
        cleaned.match(/(?:Ministero[^\n.]{5,80})/i)?.[0],
        cleaned.match(/(?:MISE|MIMIT)/i)?.[0],
        cleaned.match(/(?:Camera di Commercio[^\n.]{0,50})/i)?.[0]
      ].filter(Boolean);
      
      directData.organization = orgCandidates[0] || null;

      // Email - all emails found
      const allEmails = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
      directData.contact_email = allEmails?.[0] || null;

      // Phone - improved pattern
      const phonePattern = /(?:tel|telefono|phone)[:\s]*(\+39\s?)?(?:\(?0\d{1,4}\)?\s?)?[\d\s.-]{6,15}/gi;
      const phoneMatch = cleaned.match(phonePattern);
      directData.contact_phone = phoneMatch?.[0]?.replace(/[^\d\s+().-]/gi, '').trim() || null;

      // Website - all URLs
      const allUrls = cleaned.match(/https?:\/\/[^\s)]+/gi);
      directData.website_url = allUrls?.[0] || null;

      // Amount - multiple patterns, more aggressive
      let amount = null;
      const amountPatterns = [
        /(?:dotazione|budget|risorse|importo)[:\s]*(?:€|EUR)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/gi,
        /([0-9]{1,3}(?:[.,][0-9]{3})+)(?:[.,][0-9]{2})?\s*(?:€|EUR|euro)/gi,
        /(?:€|EUR)\s*([0-9]{6,12})/gi,
        /([0-9]{6,12})\s*(?:milioni|mila)/gi
      ];
      
      for (const pattern of amountPatterns) {
        const matches = [...cleaned.matchAll(pattern)];
        if (matches.length > 0) {
          const numStr = matches[0][1].replace(/[.,](?=\d{3})/g, '').replace(',', '.');
          amount = parseFloat(numStr);
          if (amount > 10000) break; // Accept if reasonable
        }
      }
      directData.total_amount = amount;

      // Deadline - enhanced search
      const deadlinePatterns = [
        /(?:scadenza|termine|entro)[^\n.]{0,100?}(\d{1,2}[\\/.-]\d{1,2}[\\/.-]\d{2,4})/gi,
        /(\d{1,2}[\\/.-]\d{1,2}[\\/.-]\d{2,4})[^\n.]{0,50}(?:scadenza|termine)/gi,
        /entro\s+il\s+(\d{1,2}\s+\w+\s+\d{4})/gi
      ];
      
      let deadline = null;
      for (const pattern of deadlinePatterns) {
        const match = cleaned.match(pattern);
        if (match) {
          const dateStr = match[1] || match[0].match(/\d{1,2}[\\/.-]\d{1,2}[\\/.-]\d{2,4}/)?.[0];
          if (dateStr) {
            const parts = dateStr.match(/(\d{1,2})[\\/.-](\d{1,2})[\\/.-](\d{2,4})/);
            if (parts) {
              const day = parts[1].padStart(2, '0');
              const month = parts[2].padStart(2, '0');
              let year = parts[3];
              if (year.length === 2) year = '20' + year;
              deadline = `${year}-${month}-${day}`;
              break;
            }
          }
        }
      }
      directData.application_deadline = deadline;

      // Description - look for purpose/objective
      const descPatterns = [
        /(?:finalità|obiettivo|scopo)[:\s]*([^\n.]{50,300})/gi,
        /(?:sostiene|promuove|incentiva)[^\n.]{30,200}/gi,
        /(?:presente bando|questa misura)[^\n.]{30,200}/gi
      ];
      
      let description = null;
      for (const pattern of descPatterns) {
        const match = cleaned.match(pattern);
        if (match) {
          description = match[0].trim();
          break;
        }
      }
      directData.description = description;

      // Eligibility - who can participate
      const eligibilityPatterns = [
        /(?:possono partecipare|beneficiari|destinatari)[^\n.]{50,300}/gi,
        /(?:micro|piccole|medie imprese)[^\n.]{20,200}/gi
      ];
      
      let eligibility = null;
      for (const pattern of eligibilityPatterns) {
        const match = cleaned.match(pattern);
        if (match) {
          eligibility = match[0].trim();
          break;
        }
      }
      directData.eligibility_criteria = eligibility;

      console.log('🔧 Direct extraction results:', directData);
      
      // Merge with AI results, preferring direct extraction
      parsedData = {
        ...parsedData,
        ...Object.fromEntries(Object.entries(directData).filter(([k, v]) => v !== null))
      };
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