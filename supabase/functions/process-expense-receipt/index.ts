import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing receipt file:', file.name);

    // Convert file to base64 for OpenAI Vision API
    const bytes = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    const mimeType = file.type;

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Use OpenAI Vision API to extract receipt data
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting structured data from receipts and invoices. 
            Extract the following information and return it as JSON:
            - description: A clear description of what was purchased
            - amount: The total amount as a number
            - date: The date in YYYY-MM-DD format
            - supplier: The vendor/supplier name
            - receiptNumber: The receipt/invoice number if available
            - category: Suggested category (personnel, equipment, materials, services, travel, other)
            - confidence: Your confidence in the extraction (0.0 to 1.0)
            
            If you cannot find certain information, use null for that field.
            Be as accurate as possible with amounts and dates.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract the receipt information from this image and return it as JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const extractedText = data.choices[0].message.content;
    console.log('Extracted text:', extractedText);

    // Parse the JSON response from OpenAI
    let extractedData;
    try {
      // Clean the response to extract JSON
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback extraction
      extractedData = {
        description: 'Spesa da ricevuta',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        supplier: null,
        receiptNumber: null,
        category: 'other',
        confidence: 0.3
      };
    }

    // Auto-classify based on description and supplier
    const classification = await classifyExpense(extractedData.description, extractedData.supplier);
    
    const result = {
      extractedData: {
        ...extractedData,
        category: classification.category || extractedData.category
      },
      category: classification.category || extractedData.category,
      confidence: Math.min(extractedData.confidence || 0.5, classification.confidence || 0.5),
      classificationReasons: classification.reasons || []
    };

    console.log('Final result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-expense-receipt function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      extractedData: null,
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to classify expenses based on content
async function classifyExpense(description: string, supplier: string | null) {
  const text = `${description || ''} ${supplier || ''}`.toLowerCase();
  
  // Simple rule-based classification
  if (text.includes('taxi') || text.includes('uber') || text.includes('treno') || 
      text.includes('aereo') || text.includes('hotel') || text.includes('albergo') ||
      text.includes('benzina') || text.includes('autostrada') || text.includes('viaggio')) {
    return {
      category: 'travel',
      confidence: 0.9,
      reasons: ['Contiene parole chiave di viaggio']
    };
  }
  
  if (text.includes('software') || text.includes('licenza') || text.includes('hosting') ||
      text.includes('dominio') || text.includes('cloud') || text.includes('server')) {
    return {
      category: 'services',
      confidence: 0.85,
      reasons: ['Contiene parole chiave di servizi IT']
    };
  }
  
  if (text.includes('carta') || text.includes('penna') || text.includes('stampante') ||
      text.includes('toner') || text.includes('cancelleria') || text.includes('materiale')) {
    return {
      category: 'materials',
      confidence: 0.8,
      reasons: ['Contiene parole chiave di materiali']
    };
  }
  
  if (text.includes('consulenza') || text.includes('servizio') || text.includes('assistenza') ||
      text.includes('manutenzione') || text.includes('riparazione')) {
    return {
      category: 'services',
      confidence: 0.75,
      reasons: ['Contiene parole chiave di servizi']
    };
  }
  
  if (text.includes('computer') || text.includes('laptop') || text.includes('monitor') ||
      text.includes('stampante') || text.includes('attrezzatura') || text.includes('hardware')) {
    return {
      category: 'equipment',
      confidence: 0.8,
      reasons: ['Contiene parole chiave di attrezzature']
    };
  }
  
  return {
    category: 'other',
    confidence: 0.5,
    reasons: ['Nessuna categoria specifica identificata']
  };
}