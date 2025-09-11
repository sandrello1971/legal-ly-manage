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
- Cerca attentamente nel testo per trovare tutte le informazioni possibili
- Non lasciare campi vuoti se ci sono informazioni nel testo
- Estrai anche informazioni parziali o implicite
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

    // Heuristic fallback if AI returned mostly empty fields
    const countFilled = (obj: any) => Object.values(obj || {}).filter((v: any) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)).length;
    if (countFilled(parsedData) < 5) { // Lowered threshold from 3 to 5 to be more aggressive
      console.log('⚠️ AI returned mostly empty fields, applying aggressive heuristic fallback');
      const cleaned = (pdfText || '').replace(/\u0000/g, ' ').replace(/\s+/g, ' ');
      const fileTitle = (fileName || 'Bando').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();

      // More aggressive title extraction
      let title = parsedData.title;
      if (!title) {
        const titlePatterns = [
          /(?:BANDO|AVVISO|CALL|CONCORSO|FINANZIAMENTO|INCENTIVI?|CONTRIBUTI?)[^\n]{10,150}/i,
          /(?:per|di|del)[^\n]{20,100}(?:bando|avviso|call|concorso)/i,
          /(?:SI\s*4\.0|INDUSTRIA\s*4\.0|TRANSIZIONE\s*4\.0)[^\n]{0,100}/i
        ];
        for (const pattern of titlePatterns) {
          const match = cleaned.match(pattern);
          if (match) {
            title = match[0].replace(/^\W+|\W+$/g, '').trim();
            break;
          }
        }
        if (!title) title = fileTitle;
      }

      // Enhanced description extraction
      let description = parsedData.description;
      if (!description) {
        const descPatterns = [
          /(?:finalità|obiettiv[oi]|scopo)[^\n.]{50,300}/i,
          /(?:il presente bando|la presente misura|questo programma)[^\n.]{50,300}/i,
          /(?:sostiene|finanzia|incentiva)[^\n.]{30,200}/i
        ];
        for (const pattern of descPatterns) {
          const match = cleaned.match(pattern);
          if (match) {
            description = match[0].trim();
            break;
          }
        }
      }

      // Enhanced organization extraction
      let organization = parsedData.organization;
      if (!organization) {
        const orgPatterns = [
          /(?:Regione|Provincia|Comune|Città|Metropolitana)[^\n]{5,80}/i,
          /(?:Ministero|Dipartimento|Agenzia)[^\n]{5,80}/i,
          /(?:Camera di Commercio|Unioncamere|Invitalia|MISE|MIMIT)[^\n]{0,50}/i,
          /(?:Direzione|Assessorato|Servizio)[^\n]{10,60}/i
        ];
        for (const pattern of orgPatterns) {
          const match = cleaned.match(pattern);
          if (match) {
            organization = match[0].replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
            break;
          }
        }
      }

      // Enhanced email extraction
      const emailMatches = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
      const contact_email = parsedData.contact_email || (emailMatches ? emailMatches[0] : null);

      // Enhanced website extraction
      const urlMatches = cleaned.match(/https?:\/\/[^\s)]+/gi);
      const website_url = parsedData.website_url || (urlMatches ? urlMatches[0] : null);

      // Enhanced phone extraction
      const phonePatterns = [
        /(?:\+39\s?)?(?:\(?0\)?\s?)?(?:[0-9][\s.-]?){6,12}/g,
        /\b(?:tel|telefono|phone)[:\s]*(?:\+39\s?)?(?:\(?0\)?\s?)?(?:[0-9][\s.-]?){6,12}/gi
      ];
      let contact_phone = parsedData.contact_phone;
      if (!contact_phone) {
        for (const pattern of phonePatterns) {
          const matches = cleaned.match(pattern);
          if (matches) {
            contact_phone = matches[0].replace(/\s+/g, ' ').trim();
            break;
          }
        }
      }

      // Enhanced amount extraction with multiple patterns
      let total_amount = parsedData.total_amount;
      if (total_amount == null) {
        const amountPatterns = [
          /(?:€|EUR|euro)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)/gi,
          /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:€|EUR|euro)/gi,
          /(?:dotazione|importo|budget|risorse)\s*[:\s]*(?:€|EUR|euro)?\s*([0-9]{1,3}(?:[.,][0-9]{3})*)/gi,
          /([0-9]{6,12})\s*(?:euro|EUR)/gi
        ];
        
        for (const pattern of amountPatterns) {
          const matches = cleaned.match(pattern);
          if (matches) {
            const amountStr = matches[0].match(/[0-9.,]+/)?.[0];
            if (amountStr) {
              total_amount = parseFloat(amountStr.replace(/[.,](?=\d{3})/g, '').replace(',', '.'));
              if (total_amount > 1000) break; // Only accept reasonable amounts
            }
          }
        }
      }

      // Enhanced date extraction
      const toISO = (d: string | null) => {
        if (!d) return null;
        const patterns = [
          /(\d{1,2})[\\/.-](\d{1,2})[\\/.-](\d{2,4})/,
          /(\d{1,2})\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i
        ];
        
        for (const pattern of patterns) {
          const m = d.match(pattern);
          if (m) {
            if (pattern.source.includes('gennaio')) {
              const months = {gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12};
              const month = Object.keys(months).find(k => d.toLowerCase().includes(k));
              if (month) return `${m[2]}-${months[month].toString().padStart(2,'0')}-${m[1].padStart(2,'0')}`;
            } else {
              const day = m[1].padStart(2, '0');
              const mon = m[2].padStart(2, '0');
              let y = m[3];
              if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
              return `${y}-${mon}-${day}`;
            }
          }
        }
        return null;
      };

      let application_deadline = parsedData.application_deadline;
      if (!application_deadline) {
        const deadlinePatterns = [
          /(?:scadenza|termine|entro il)[^\n]{0,100}(\d{1,2}[\\/.-]\d{1,2}[\\/.-]\d{2,4})/gi,
          /(\d{1,2}[\\/.-]\d{1,2}[\\/.-]\d{2,4})[^\n]{0,50}(?:scadenza|termine)/gi
        ];
        
        for (const pattern of deadlinePatterns) {
          const match = cleaned.match(pattern);
          if (match) {
            const dateStr = match[0].match(/\d{1,2}[\\/.-]\d{1,2}[\\/.-]\d{2,4}/)?.[0];
            application_deadline = toISO(dateStr);
            if (application_deadline) break;
          }
        }
      }

      // Extract eligibility criteria
      let eligibility_criteria = parsedData.eligibility_criteria;
      if (!eligibility_criteria) {
        const eligibilityPatterns = [
          /(?:possono partecipare|beneficiari|destinatari)[^\n.]{50,300}/gi,
          /(?:requisiti di ammissibilità|criteri di eleggibilità)[^\n.]{50,300}/gi
        ];
        for (const pattern of eligibilityPatterns) {
          const match = cleaned.match(pattern);
          if (match) {
            eligibility_criteria = match[0].trim();
            break;
          }
        }
      }

      parsedData = {
        ...parsedData,
        title,
        description,
        organization,
        contact_email,
        contact_phone,
        website_url,
        total_amount,
        application_deadline,
        eligibility_criteria,
      };

      console.log('🔧 Enhanced fallback extraction completed, filled fields:', countFilled(parsedData));
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