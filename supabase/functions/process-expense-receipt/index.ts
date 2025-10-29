import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
      error: (error as Error).message,
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
  } else {
    // Se non c'è projectId, prova a trovare il progetto dal contenuto XML
    const xmlContent = await file.text();
    const extractedProjectCodes = extractProjectCodesFromXML(xmlContent);
    
    if (extractedProjectCodes.length > 0) {
      console.log('Searching for projects with codes/titles:', extractedProjectCodes);
      
      // Cerca progetti per titolo
      const { data: projects } = await supabase
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
        .or(`title.in.(${extractedProjectCodes.join(',')})`);
      
      if (projects && projects.length > 0) {
        projectData = projects[0];
        bandoData = projects[0]?.bandi;
        console.log('Found project by XML content:', projectData.title, 'ID:', projectData.id);
      } else {
        console.log('No project found for codes:', extractedProjectCodes);
      }
    }
  }
  
  try {
    // Parse XML to extract invoice data (xmlContent already available from above)
    const invoiceData = parseXMLInvoice(xmlContent);
    
    // Validate project code presence
    const projectCodeValidation = validateProjectCode(xmlContent, projectData);
    
    // Validate coherence with bando (first level: eligible according to tender criteria)
    const bandoCoherence = await validateBandoCoherence(invoiceData, bandoData);
    
    // Validate coherence with project (second level: mentioned in project proposal)
    const projectCoherence = await validateProjectCoherence(invoiceData, projectData, bandoData);
    
    // Determine if the expense should be approved or rejected
    const shouldApprove = projectCodeValidation.isValid && bandoCoherence.isCoherent && projectCoherence.isCoherent;
    
    // Calculate confidence based on ALL validation results
    let confidence = 0.3; // Base confidence
    let confidenceExplanation = '';
    
    // CRITICAL: If bando says NOT eligible, confidence must be LOW regardless of CUP
    if (!bandoCoherence.isCoherent) {
      confidence = Math.min(0.4, bandoCoherence.coherenceScore / 100); // Max 40% if not eligible
      confidenceExplanation = `Confidenza bassa: la spesa non sembra ammissibile secondo i criteri del bando (${Math.round(bandoCoherence.coherenceScore)}% coerenza con bando).`;
    }
    // If project says NOT mentioned in proposal, confidence is MEDIUM
    else if (!projectCoherence.isCoherent) {
      confidence = Math.min(0.65, projectCoherence.coherenceScore / 100); // Max 65% if not in project
      confidenceExplanation = `Confidenza media: la spesa non era esplicitamente prevista nella proposta progettuale. ${projectCodeValidation.cupFound ? 'CUP trovato, ' : ''}bando coerente al ${Math.round(bandoCoherence.coherenceScore)}%.`;
    }
    // If project gives warning (score 50-70), confidence is MEDIUM-HIGH
    else if (projectCoherence.coherenceScore < 70) {
      confidence = projectCoherence.coherenceScore / 100; // Use AI score directly (50-70%)
      confidenceExplanation = `Confidenza media: ${projectCodeValidation.cupFound ? 'CUP presente, ' : ''}bando coerente al ${Math.round(bandoCoherence.coherenceScore)}%, ma la spesa potrebbe non essere stata esplicitamente menzionata nel progetto (${Math.round(projectCoherence.coherenceScore)}%). Richiede verifica manuale.`;
    }
    // Everything is OK - high confidence
    else {
      // Start with project code validation confidence
      if (projectCodeValidation.cupFound) {
        confidence = 0.90; // High confidence base
        confidenceExplanation = `Confidenza alta: CUP trovato nella fattura, coerenza con bando al ${Math.round(bandoCoherence.coherenceScore)}% e con progetto al ${Math.round(projectCoherence.coherenceScore)}%.`;
      } else if (projectCodeValidation.isValid) {
        confidence = 0.75; // Good confidence base
        confidenceExplanation = `Confidenza buona: riferimento progetto trovato, coerenza con bando al ${Math.round(bandoCoherence.coherenceScore)}% e con progetto al ${Math.round(projectCoherence.coherenceScore)}%.`;
      } else {
        confidenceExplanation = `Confidenza media: coerenza con bando al ${Math.round(bandoCoherence.coherenceScore)}% e con progetto al ${Math.round(projectCoherence.coherenceScore)}%.`;
      }
      
      // Adjust based on coherence scores
      const avgCoherenceScore = (bandoCoherence.coherenceScore + projectCoherence.coherenceScore) / 2;
      confidence = Math.min(0.95, (confidence + (avgCoherenceScore / 100)) / 2);
    }
    
    const result = {
      extractedData: invoiceData,
      category: invoiceData.category,
      confidence: confidence,
      confidenceExplanation: confidenceExplanation,
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
    throw new Error(`Errore nell'elaborazione della fattura XML: ${(error as Error).message}`);
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
  const causale = extractValue(/<Causale>([^<]+)<\/Causale>/);
  
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
    causale: causale,
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
  
  const projectTitle = projectData.title || '';
  const projectId = projectData.id ? projectData.id.slice(0, 8) : '';
  const projectCUP = projectData.cup_code || '';
  
  let foundReferences = [];
  let cupFound = false;
  
  // PRIORITY 1: Check for CUP code in dedicated XML fields
  if (projectCUP) {
    const cupPatterns = [
      /<CodiceCUP>([^<]+)<\/CodiceCUP>/g,
      /<RiferimentoTesto>([^<]+)<\/RiferimentoTesto>/g,
      /<Causale>([^<]*CUP[^<]*)<\/Causale>/gi
    ];
    
    for (const pattern of cupPatterns) {
      const matches = Array.from(xmlContent.matchAll(pattern));
      for (const match of matches) {
        const content = match[1].trim();
        if (content.includes(projectCUP)) {
          foundReferences.push(`CUP: ${projectCUP}`);
          cupFound = true;
          break;
        }
      }
      if (cupFound) break;
    }
  }
  
  // PRIORITY 2: Search for project references in various XML fields
  if (!cupFound) {
    const fieldsToCheck = [
      /<Descrizione>([^<]+)<\/Descrizione>/g,
      /<Causale>([^<]+)<\/Causale>/g,
      /<RiferimentoNumeroLinea>([^<]+)<\/RiferimentoNumeroLinea>/g,
      /<RiferimentoDocumento>([^<]+)<\/RiferimentoDocumento>/g,
      /<Note>([^<]+)<\/Note>/g,
      /<AltriDatiGestionali>[\s\S]*?<RiferimentoTesto>([^<]+)<\/RiferimentoTesto>[\s\S]*?<\/AltriDatiGestionali>/g
    ];
    
    for (const pattern of fieldsToCheck) {
      const matches = xmlContent.match(pattern);
      if (matches) {
        for (const match of matches) {
          const content = match.replace(/<[^>]+>/g, '').toLowerCase();
          // Cerca per CUP, titolo progetto o ID progetto
          if ((projectCUP && content.includes(projectCUP.toLowerCase())) ||
              (projectTitle && content.includes(projectTitle.toLowerCase())) ||
              (projectId && content.includes(projectId.toLowerCase()))) {
            foundReferences.push(content.substring(0, 100)); // Limit length
          }
        }
      }
    }
  }
  
  console.log('Project validation:', {
    projectTitle,
    projectId,
    projectCUP,
    cupFound,
    foundReferences,
    xmlContent: xmlContent.substring(0, 500) + '...'
  });
  
  return {
    isValid: cupFound || foundReferences.length > 0,
    references: foundReferences,
    cupFound: cupFound,
    reasons: (cupFound || foundReferences.length > 0)
      ? cupFound 
        ? [`✓ Codice CUP ${projectCUP} trovato nella fattura`]
        : [`Riferimento progetto trovato: ${foundReferences[0].substring(0, 80)}...`]
      : [`✗ Codice CUP ${projectCUP} non trovato nella fattura elettronica. Verifica che il CUP sia presente nel campo <CodiceCUP> o nella causale.`]
  };
}

// Validate coherence with bando requirements (FIRST LEVEL: general eligibility)
async function validateBandoCoherence(invoiceData: any, bandoData: any) {
  if (!bandoData) {
    return {
      isCoherent: true,
      coherenceScore: 100,
      reasons: ['Nessun bando associato - verifica manuale richiesta']
    };
  }
  
  const causale = invoiceData.causale?.toLowerCase() || '';
  
  // Check for explicit non-eligibility in causale
  const nonEligibilityKeywords = [
    'non ammissibile', 'inammissibile', 'fuori perimetro',
    'non ammissibili', 'inammissibili', 'non eleggibile',
    'escluso dal bando', 'esclusa dal bando'
  ];
  
  const foundNonEligibility = nonEligibilityKeywords.some(keyword => 
    causale.includes(keyword)
  );
  
  if (foundNonEligibility) {
    return {
      isCoherent: false,
      coherenceScore: 0,
      reasons: ['⛔ La causale indica esplicitamente che la spesa NON è ammissibile per questo bando']
    };
  }
  
  // Use AI to analyze if services are eligible according to bando criteria
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      const aiAnalysis = await analyzeBandoEligibilityWithAI(
        invoiceData,
        bandoData,
        LOVABLE_API_KEY
      );
      
      if (aiAnalysis) {
        return aiAnalysis;
      }
    }
  } catch (error) {
    console.error('AI bando eligibility analysis failed, falling back to keyword matching:', error);
  }
  
  // Fallback to keyword-based analysis
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

// FIRST LEVEL: Analyze if services are eligible according to bando criteria
async function analyzeBandoEligibilityWithAI(
  invoiceData: any,
  bandoData: any,
  apiKey: string
): Promise<{ isCoherent: boolean; coherenceScore: number; reasons: string[] } | null> {
  const prompt = `Analizza se i servizi/prodotti descritti in questa fattura sono AMMISSIBILI secondo i criteri generali del bando.

FATTURA:
- Fornitore: ${invoiceData.supplier}
- Descrizione: ${invoiceData.description || 'Non specificata'}
- Categoria: ${invoiceData.category}
- Importo: €${invoiceData.amount}
- Causale: ${invoiceData.causale || 'Non specificata'}

BANDO:
- Nome: ${bandoData.title || bandoData.name || 'Non specificato'}
- Criteri di ammissibilità: ${bandoData.eligibility_criteria || 'Non specificati'}
- Descrizione: ${bandoData.description || 'Non specificata'}

Valuta SOLO se questi servizi/prodotti sono ammissibili secondo i criteri GENERALI del bando, indipendentemente dal progetto specifico.
Rispondi SOLO con un oggetto JSON (senza markdown):
{
  "isCoherent": boolean,
  "coherenceScore": number (0-100),
  "reasons": ["motivo1", "motivo2", ...]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Sei un esperto di bandi pubblici italiani. Valuta SOLO l\'ammissibilità generale secondo i criteri del bando. Rispondi SOLO con JSON valido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return null;
    }

    // Parse JSON response (remove markdown if present)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', content);
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      isCoherent: analysis.isCoherent,
      coherenceScore: analysis.coherenceScore,
      reasons: analysis.reasons || []
    };
  } catch (error) {
    console.error('Error in AI analysis:', error);
    return null;
  }
}

// Check if expense category is coherent with bando (SI4.0 2025 categories)
function checkCategoryCoherence(category: string, bandoData: any) {
  const bandoDescription = (bandoData.description || '').toLowerCase();
  const bandoTitle = (bandoData.title || '').toLowerCase();
  const eligibilityCriteria = (bandoData.eligibility_criteria || '').toLowerCase();
  const bandoText = `${bandoDescription} ${bandoTitle} ${eligibilityCriteria}`;
  
  // Enhanced category mappings for SI4.0 2025 Bando
  const categoryMappings = {
    'equipment': [
      // Attrezzature tecnologiche
      'attrezzature', 'hardware', 'macchinari', 'strumenti', 'strumentazione',
      // Infrastrutture
      'infrastrutture', 'infrastruttura', 'laboratorio', 'laboratori',
      // Tecnologie specifiche
      'tecnologie', 'tecnologico', 'tecnologica', 'impianti', 'impianto',
      // Ricerca e innovazione
      'ricerca', 'innovazione', 'sperimentazione',
      // Software e programmi
      'software', 'programmi informatici', 'licenze', 'cloud',
      // Tecnologie 4.0
      '4.0', 'industria 4.0', 'trasformazione digitale', 'digitale',
      'iot', 'intelligenza artificiale', 'automazione', 'robot'
    ],
    'consulting': [
      'consulenza', 'consulenze', 'consulente', 'assistenza tecnica',
      'servizi professional', 'advisory', 'supporto tecnico', 'audit'
    ],
    'training': [
      'formazione', 'corso', 'corsi', 'training', 'workshop',
      'certificazione', 'didattica', 'competenze'
    ],
    'engineering': [
      'sviluppo', 'ingegnerizzazione', 'engineering', 'prototipazione',
      'testing', 'collaudo', 'integrazione', 'customizzazione'
    ],
    'intellectual_property': [
      'brevetto', 'brevetti', 'marchio', 'proprietà intellettuale',
      'proprietà industriale', 'tutela', 'registrazione'
    ],
    'personnel': [
      'personale', 'risorse umane', 'collaboratori', 'dipendenti',
      'team', 'dedicato al progetto'
    ],
    // Legacy categories
    'services': ['servizi', 'consulenze', 'assistenza'],
    'materials': ['materiali', 'forniture', 'cancelleria'],
    'travel': ['viaggi', 'trasferte', 'trasporti']
  };
  
  const keywords: string[] = (categoryMappings as any)[category] || [];
  const foundKeywords = keywords.filter((keyword: string) => bandoText.includes(keyword));
  
  if (foundKeywords.length > 0) {
    return {
      score: 0.5, // Increased to reach coherence threshold
      reasons: [`Categoria ${category} coerente con il bando (trovato: ${foundKeywords.slice(0, 3).join(', ')})`]
    };
  }
  
  // For 'equipment' category, check if bando is about research infrastructure
  if (category === 'equipment' && (
    bandoText.includes('ricerca') || 
    bandoText.includes('tecnolog') ||
    bandoText.includes('innovaz') ||
    bandoText.includes('infrast')
  )) {
    return {
      score: 0.45, // Just below threshold - needs more verification
      reasons: [`Categoria ${category} probabilmente ammissibile per bando su ricerca/tecnologia`]
    };
  }
  
  return {
    score: 0.1,
    reasons: [`Categoria ${category} - coerenza da verificare manualmente`]
  };
}

// Extract potential project codes from XML content
function extractProjectCodesFromXML(xmlContent: string): string[] {
  const codes = new Set<string>();
  
  // Pattern per cercare codici progetto nelle descrizioni
  const descriptionMatches = xmlContent.match(/<Descrizione>([^<]+)<\/Descrizione>/g);
  if (descriptionMatches) {
    descriptionMatches.forEach(match => {
      const content = match.replace(/<\/?Descrizione>/g, '').trim();
      // Cerca pattern come "noscite001", "progetto123", etc.
      const projectMatches = content.match(/\b[a-zA-Z]+\d{3,}\b/g);
      if (projectMatches) {
        projectMatches.forEach(code => codes.add(code.toLowerCase()));
      }
    });
  }
  
  // Cerca anche in altri campi
  const otherFields = [
    /<Causale>([^<]+)<\/Causale>/g,
    /<Note>([^<]+)<\/Note>/g,
    /<RiferimentoDocumento>([^<]+)<\/RiferimentoDocumento>/g
  ];
  
  otherFields.forEach(pattern => {
    const matches = xmlContent.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const content = match.replace(/<[^>]+>/g, '').trim();
        const projectMatches = content.match(/\b[a-zA-Z]+\d{3,}\b/g);
        if (projectMatches) {
          projectMatches.forEach(code => codes.add(code.toLowerCase()));
        }
      });
    }
  });
  
  return Array.from(codes);
}

// Classify electronic invoices based on SI4.0 2025 categories
function classifyElectronicInvoice(description: string, supplier: string | null) {
  const text = `${description || ''} ${supplier || ''}`.toLowerCase();
  
  // CONSTRUCTION/RENOVATION: Lavori di adeguamento spazi e installazione (alta priorità)
  const constructionKeywords = [
    'lavori di adeguamento', 'adeguamento locali', 'adeguamento spazi',
    'ristrutturazione', 'canalizzazioni', 'prese elettriche', 'rinforzi',
    'pavimentazione', 'controsoffitti', 'impianti elettrici', 'climatizzazione',
    'opere murarie', 'opere edili', 'installazione impianti', 'predisposizione',
    'edilizia', 'edile', 'cantiere', 'lavori edili'
  ];
  
  for (const keyword of constructionKeywords) {
    if (text.includes(keyword)) {
      return { category: 'equipment', confidence: 0.92 }; // Categoria equipment perché rientra negli investimenti materiali
    }
  }
  
  // EQUIPMENT: Attrezzature tecnologiche e programmi informatici
  const equipmentKeywords = [
    // Hardware e attrezzature generiche
    'hardware', 'computer', 'server', 'attrezzatura', 'attrezzature',
    // Macchinari e impianti
    'macchinari', 'macchinario', 'impianto', 'impianti', 'installazione',
    // Strumentazione scientifica e di laboratorio
    'strumento', 'strumenti', 'strumentazione', 'spettrometro', 'microscopio',
    'laser', 'sensori', 'robot', 'robotica', 'automazione',
    // Tecnologie 4.0
    'iot', 'internet of things', 'intelligenza artificiale', 'machine learning',
    'realtà aumentata', 'realtà virtuale', 'stampa 3d', 'additive manufacturing',
    'big data', 'cloud computing', 'cybersecurity', 'blockchain',
    // Software e licenze
    'software', 'licenza', 'abbonamento', 'cloud', 'saas', 'programma informatico',
    // Apparecchiature scientifiche
    'apparecchiature scientifiche', 'apparecchiature'
  ];
  
  for (const keyword of equipmentKeywords) {
    if (text.includes(keyword)) {
      return { category: 'equipment', confidence: 0.92 };
    }
  }
  
  // CONSULTING: Consulenza su tecnologie 4.0
  const consultingKeywords = [
    'consulenza', 'consulente', 'servizi professional', 'advisory',
    'assistenza tecnica', 'supporto tecnico', 'analisi', 'audit',
    'progettazione', 'design', 'studio di fattibilità'
  ];
  
  for (const keyword of consultingKeywords) {
    if (text.includes(keyword)) {
      return { category: 'consulting', confidence: 0.88 };
    }
  }
  
  // ENGINEERING: Servizi per ingegnerizzazione SW/HW
  const engineeringKeywords = [
    'sviluppo', 'development', 'ingegnerizzazione', 'engineering',
    'prototipazione', 'testing', 'collaudo', 'integrazione sistemi',
    'personalizzazione', 'customizzazione'
  ];
  
  for (const keyword of engineeringKeywords) {
    if (text.includes(keyword)) {
      return { category: 'engineering', confidence: 0.87 };
    }
  }
  
  // TRAINING: Formazione su tecnologie 4.0
  const trainingKeywords = [
    'formazione', 'corso', 'training', 'workshop', 'seminario',
    'certificazione', 'attestato', 'didattica'
  ];
  
  for (const keyword of trainingKeywords) {
    if (text.includes(keyword)) {
      return { category: 'training', confidence: 0.90 };
    }
  }
  
  // INTELLECTUAL_PROPERTY: Tutela proprietà industriale
  const ipKeywords = [
    'brevetto', 'patent', 'marchio', 'trademark', 'proprietà intellettuale',
    'proprietà industriale', 'tutela', 'registrazione'
  ];
  
  for (const keyword of ipKeywords) {
    if (text.includes(keyword)) {
      return { category: 'intellectual_property', confidence: 0.93 };
    }
  }
  
  // PERSONNEL: Spese del personale (raramente in fatture esterne)
  const personnelKeywords = [
    'personale', 'dipendente', 'risorse umane', 'salario', 'stipendio'
  ];
  
  for (const keyword of personnelKeywords) {
    if (text.includes(keyword)) {
      return { category: 'personnel', confidence: 0.85 };
    }
  }
  
  // If contains "ricerca" or "infrastruttura" likely equipment
  if (text.includes('ricerca') || text.includes('infrastruttura')) {
    return { category: 'equipment', confidence: 0.75 };
  }
  
  return { category: 'other', confidence: 0.3 };
}

// SECOND LEVEL: Validate if services are mentioned in the specific project proposal
async function validateProjectCoherence(invoiceData: any, projectData: any, bandoData: any) {
  if (!projectData || !projectData.description) {
    return {
      isCoherent: true,
      coherenceScore: 50,
      reasons: ['⚠️ Nessuna descrizione progetto disponibile - verifica manuale necessaria']
    };
  }
  
  // Use AI to check if invoice services were mentioned in project proposal
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      const aiAnalysis = await analyzeProjectCoherenceWithAI(
        invoiceData,
        projectData,
        bandoData,
        LOVABLE_API_KEY
      );
      
      if (aiAnalysis) {
        return aiAnalysis;
      }
    }
  } catch (error) {
    console.error('AI project coherence analysis failed:', error);
  }
  
  // Fallback: assume coherent but require manual check
  return {
    isCoherent: true,
    coherenceScore: 50,
    reasons: ['⚠️ Impossibile verificare automaticamente - controllo manuale necessario']
  };
}

// SECOND LEVEL AI: Analyze if services were mentioned in project proposal
async function analyzeProjectCoherenceWithAI(
  invoiceData: any,
  projectData: any,
  bandoData: any,
  apiKey: string
): Promise<{ isCoherent: boolean; coherenceScore: number; reasons: string[] } | null> {
  const prompt = `Analizza se i servizi/prodotti di questa fattura erano stati MENZIONATI o PREVISTI nella proposta di progetto.

FATTURA:
- Fornitore: ${invoiceData.supplier}
- Descrizione: ${invoiceData.description || 'Non specificata'}
- Categoria: ${invoiceData.category}
- Importo: €${invoiceData.amount}

PROGETTO APPROVATO:
- Titolo: ${projectData.title || projectData.name}
- Descrizione/Obiettivi: ${projectData.description}
- Budget previsto: €${projectData.total_budget || 'Non specificato'}

BANDO DI RIFERIMENTO:
- Nome: ${bandoData?.title || bandoData?.name || 'Non specificato'}

Valuta se i servizi fatturati erano ESPLICITAMENTE o IMPLICITAMENTE previsti nella descrizione del progetto approvato.
Se NON erano menzionati/previsti, anche se potrebbero essere ammissibili per il bando, devi segnalarlo come warning.

Rispondi SOLO con JSON (senza markdown):
{
  "isCoherent": boolean,
  "coherenceScore": number (0-100, usa 50-70 per warning),
  "reasons": ["motivo1", "motivo2", ...]
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Sei un revisore di progetti finanziati. Verifica se i servizi fatturati erano previsti nella proposta progettuale. Sii rigoroso: se qualcosa non era menzionato, segnalalo. Rispondi SOLO con JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      console.error('AI API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response:', content);
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      isCoherent: analysis.isCoherent,
      coherenceScore: analysis.coherenceScore,
      reasons: analysis.reasons || []
    };
  } catch (error) {
    console.error('Error in project coherence AI analysis:', error);
    return null;
  }
}