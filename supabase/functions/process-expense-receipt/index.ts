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
    const projectId = formData.get('projectId') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing receipt file:', file.name, 'for project:', projectId);

    // Handle XML files (electronic invoices)
    if (file.type === 'application/xml' || file.type === 'text/xml' || file.name.endsWith('.xml')) {
      return await processXMLInvoice(file, projectId, supabaseUrl, supabaseServiceKey);
    }

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

// Function to process XML electronic invoices
async function processXMLInvoice(file: File, projectId: string, supabaseUrl: string, supabaseServiceKey: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Read XML content
  const xmlContent = await file.text();
  console.log('XML Content length:', xmlContent.length);
  
  // Get project and bando data for validation
  let projectData = null;
  let bandoData = null;
  
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select(`
        *,
        bandi:bando_id (
          title,
          description,
          eligibility_criteria,
          parsed_data
        )
      `)
      .eq('id', projectId)
      .single();
    
    projectData = project;
    bandoData = project?.bandi;
  }
  
  try {
    // Parse XML to extract invoice data
    const invoiceData = parseXMLInvoice(xmlContent);
    
    // Validate project code presence
    const projectCodeValidation = validateProjectCode(xmlContent, projectData);
    
    // Validate coherence with bando
    const bandoCoherence = await validateBandoCoherence(invoiceData, bandoData);
    
    // Determine if the expense should be approved or rejected
    const shouldApprove = projectCodeValidation.isValid && bandoCoherence.isCoherent;
    
    const result = {
      extractedData: invoiceData,
      category: invoiceData.category,
      confidence: shouldApprove ? 0.9 : 0.3,
      validation: {
        projectCode: projectCodeValidation,
        bandoCoherence: bandoCoherence,
        shouldApprove: shouldApprove,
        reasons: [
          ...(projectCodeValidation.reasons || []),
          ...(bandoCoherence.reasons || [])
        ]
      }
    };
    
    console.log('XML Processing result:', result);
    
    return new Response(JSON.stringify(result), {
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json' 
      },
    });
    
  } catch (error) {
    console.error('Error processing XML invoice:', error);
    throw new Error(`Errore nell'elaborazione della fattura XML: ${error.message}`);
  }
}

// Parse XML electronic invoice
function parseXMLInvoice(xmlContent: string) {
  // Extract key information from XML using regex patterns
  // This handles the standard Italian electronic invoice format (FatturaPA)
  
  const extractValue = (pattern: RegExp) => {
    const match = xmlContent.match(pattern);
    return match ? match[1].trim() : null;
  };
  
  const extractAmount = (pattern: RegExp) => {
    const match = xmlContent.match(pattern);
    return match ? parseFloat(match[1].replace(',', '.')) : 0;
  };
  
  // Extract supplier info
  const supplierName = extractValue(/<DenominazioneImpresa>([^<]+)<\/DenominazioneImpresa>/) ||
                      extractValue(/<Denominazione>([^<]+)<\/Denominazione>/) ||
                      extractValue(/<Nome>([^<]+)<\/Nome>/);
  
  // Extract invoice details
  const invoiceNumber = extractValue(/<Numero>([^<]+)<\/Numero>/);
  const invoiceDate = extractValue(/<Data>([^<]+)<\/Data>/);
  
  // Extract amounts
  const totalAmount = extractAmount(/<ImportoTotaleDocumento>([0-9.,]+)<\/ImportoTotaleDocumento>/) ||
                     extractAmount(/<PrezzoTotale>([0-9.,]+)<\/PrezzoTotale>/);
  
  // Extract line items for description
  const descriptions = [];
  const descriptionMatches = xmlContent.match(/<Descrizione>([^<]+)<\/Descrizione>/g);
  if (descriptionMatches) {
    descriptions.push(...descriptionMatches.map(match => 
      match.replace(/<\/?Descrizione>/g, '').trim()
    ));
  }
  
  const description = descriptions.length > 0 ? descriptions.join(', ') : 'Fattura elettronica';
  
  // Auto-classify based on description
  const classification = classifyElectronicInvoice(description, supplierName);
  
  return {
    description: description,
    amount: totalAmount,
    date: invoiceDate || new Date().toISOString().split('T')[0],
    supplier: supplierName,
    receiptNumber: invoiceNumber,
    category: classification.category,
    confidence: classification.confidence,
    invoiceType: 'electronic'
  };
}

// Validate if project code is present in the invoice
function validateProjectCode(xmlContent: string, projectData: any) {
  if (!projectData) {
    return {
      isValid: false,
      reasons: ['Progetto non specificato']
    };
  }
  
  const projectCode = projectData.project_code || projectData.id.slice(0, 8);
  const projectTitle = projectData.title || '';
  
  // Search for project references in various XML fields
  const fieldsToCheck = [
    /<Descrizione>([^<]+)<\/Descrizione>/g,
    /<Causale>([^<]+)<\/Causale>/g,
    /<RiferimentoNumeroLinea>([^<]+)<\/RiferimentoNumeroLinea>/g,
    /<RiferimentoDocumento>([^<]+)<\/RiferimentoDocumento>/g,
    /<Note>([^<]+)<\/Note>/g
  ];
  
  let foundReferences = [];
  
  for (const pattern of fieldsToCheck) {
    const matches = xmlContent.match(pattern);
    if (matches) {
      for (const match of matches) {
        const content = match.replace(/<[^>]+>/g, '').toLowerCase();
        if (content.includes(projectCode.toLowerCase()) || 
            (projectTitle && content.includes(projectTitle.toLowerCase()))) {
          foundReferences.push(content);
        }
      }
    }
  }
  
  return {
    isValid: foundReferences.length > 0,
    references: foundReferences,
    reasons: foundReferences.length > 0 
      ? [`Codice progetto trovato: ${foundReferences.join(', ')}`]
      : ['Codice progetto non trovato nella fattura']
  };
}

// Validate coherence with bando requirements
async function validateBandoCoherence(invoiceData: any, bandoData: any) {
  if (!bandoData) {
    return {
      isCoherent: true, // If no bando data, assume coherent
      reasons: ['Nessun bando associato - verifica manuale richiesta']
    };
  }
  
  const description = invoiceData.description?.toLowerCase() || '';
  const supplier = invoiceData.supplier?.toLowerCase() || '';
  const amount = invoiceData.amount || 0;
  
  let coherenceScore = 0;
  let reasons = [];
  
  // Check against bando eligibility criteria
  const eligibilityCriteria = bandoData.eligibility_criteria?.toLowerCase() || '';
  if (eligibilityCriteria) {
    // Look for common expense types mentioned in eligibility
    const eligibleExpenses = [
      'personale', 'attrezzature', 'materiali', 'servizi', 
      'consulenze', 'software', 'hardware', 'formazione'
    ];
    
    const foundEligibleTypes = eligibleExpenses.filter(type => 
      eligibilityCriteria.includes(type) && 
      (description.includes(type) || supplier.includes(type))
    );
    
    if (foundEligibleTypes.length > 0) {
      coherenceScore += 0.5;
      reasons.push(`Coerente con criteri del bando: ${foundEligibleTypes.join(', ')}`);
    }
  }
  
  // Check parsed bando data for expense limits
  const parsedData = bandoData.parsed_data || {};
  if (parsedData.maxExpenseAmount && amount > parsedData.maxExpenseAmount) {
    reasons.push(`Importo ${amount}€ superiore al limite del bando (${parsedData.maxExpenseAmount}€)`);
    coherenceScore -= 0.3;
  } else if (parsedData.maxExpenseAmount) {
    coherenceScore += 0.2;
    reasons.push(`Importo entro i limiti del bando`);
  }
  
  // Additional coherence checks based on invoice category vs bando focus
  const categoryCoherence = checkCategoryCoherence(invoiceData.category, bandoData);
  coherenceScore += categoryCoherence.score;
  reasons.push(...categoryCoherence.reasons);
  
  return {
    isCoherent: coherenceScore >= 0.5,
    coherenceScore: coherenceScore,
    reasons: reasons
  };
}

// Check if expense category is coherent with bando
function checkCategoryCoherence(category: string, bandoData: any) {
  const bandoDescription = (bandoData.description || '').toLowerCase();
  const bandoTitle = (bandoData.title || '').toLowerCase();
  const bandoText = `${bandoDescription} ${bandoTitle}`;
  
  const categoryMappings = {
    'equipment': ['attrezzature', 'hardware', 'macchinari', 'strumenti'],
    'services': ['servizi', 'consulenze', 'assistenza', 'software'],
    'materials': ['materiali', 'forniture', 'cancelleria'],
    'personnel': ['personale', 'risorse umane', 'collaboratori'],
    'travel': ['viaggi', 'trasferte', 'trasporti']
  };
  
  const keywords = categoryMappings[category] || [];
  const foundKeywords = keywords.filter(keyword => bandoText.includes(keyword));
  
  if (foundKeywords.length > 0) {
    return {
      score: 0.3,
      reasons: [`Categoria ${category} coerente con il bando (${foundKeywords.join(', ')})`]
    };
  }
  
  return {
    score: 0.1,
    reasons: [`Categoria ${category} - coerenza da verificare manualmente`]
  };
}

// Classify electronic invoices
function classifyElectronicInvoice(description: string, supplier: string | null) {
  const text = `${description || ''} ${supplier || ''}`.toLowerCase();
  
  // Enhanced classification for electronic invoices
  if (text.includes('consulenza') || text.includes('servizi professional') || 
      text.includes('assistenza tecnica') || text.includes('sviluppo software')) {
    return { category: 'services', confidence: 0.9 };
  }
  
  if (text.includes('licenza software') || text.includes('abbonamento') ||
      text.includes('cloud') || text.includes('saas')) {
    return { category: 'services', confidence: 0.85 };
  }
  
  if (text.includes('hardware') || text.includes('computer') || 
      text.includes('server') || text.includes('attrezzatura')) {
    return { category: 'equipment', confidence: 0.9 };
  }
  
  if (text.includes('materiale') || text.includes('forniture') ||
      text.includes('cancelleria') || text.includes('consumabili')) {
    return { category: 'materials', confidence: 0.8 };
  }
  
  return { category: 'other', confidence: 0.6 };
}