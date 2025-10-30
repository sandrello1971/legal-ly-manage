import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== parse-bank-statement function called ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  try {
    console.log('Processing bank statement...');
    
    const body = await req.json();
    console.log('Request body received:', body);
    
    const { fileUrl, fileName, fileType } = body;
    
    if (!fileUrl || !fileType) {
      console.error('Missing fileUrl or fileType', { fileUrl, fileType });
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${fileType} file: ${fileName}`);

    // Fetch file from storage
    console.log('Fetching file from:', fileUrl);
    const fileResponse = await fetch(fileUrl);
    console.log('File fetch response status:', fileResponse.status);
    
    if (!fileResponse.ok) {
      const errorText = await fileResponse.text();
      console.error('Failed to fetch file:', errorText);
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    // Convert file to appropriate format for parsing
    let content: string;
    const buffer = await fileResponse.arrayBuffer();
    console.log('File downloaded, size:', buffer.byteLength);
    
    if (fileType === 'csv') {
      content = new TextDecoder().decode(buffer);
      console.log('CSV content preview:', content.substring(0, 200));
    } else if (fileType === 'xml' || fileType === 'mt940') {
      content = new TextDecoder().decode(buffer);
      console.log(`${fileType.toUpperCase()} content preview:`, content.substring(0, 200));
    } else if (fileType === 'pdf') {
      // For PDF, we would need a PDF parsing library
      // For now, return a mock response
      console.log('PDF parsing not implemented yet, returning mock data');
      return new Response(JSON.stringify({
        error: 'PDF parsing not yet implemented',
        mockData: generateMockTransactions()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Parse content based on file type
    let parsedData;
    if (fileType === 'csv') {
      parsedData = parseCSV(content);
    } else if (fileType === 'xml') {
      parsedData = parseXML(content);
    } else if (fileType === 'mt940') {
      parsedData = parseMT940(content);
    }

    console.log(`Parsed ${parsedData?.transactions?.length || 0} transactions`);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing bank statement:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process bank statement',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function parseCSV(content: string) {
  console.log('Parsing CSV content...');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Detect separator (comma or semicolon)
  const firstLine = lines[0];
  const separator = firstLine.includes(';') ? ';' : ',';
  console.log('Detected separator:', separator);
  
  const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
  
  console.log('CSV headers:', headers);
  console.log('CSV content preview:', lines.slice(0, 3).join('\n'));
  
  // Detect format type
  const isInvoiceFormat = headers.some(h => 
    h.toLowerCase().includes('fornitore') || 
    h.toLowerCase().includes('numero fattura') ||
    h.toLowerCase().includes('numero_fattura')
  );
  const isItalianBankFormat = headers[0]?.toLowerCase().includes('data');
  
  console.log('Format detected:', { isInvoiceFormat, isItalianBankFormat });
  
  const transactions = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
    
    if (values.length >= 3) {
      let transaction;
      
      if (isInvoiceFormat) {
        // Invoice format: File;Numero Fattura;Fornitore;Descrizione;Importo (€);IVA (%);CUP
        const invoiceNumberIdx = headers.findIndex(h => h.toLowerCase().includes('numero') && h.toLowerCase().includes('fattura'));
        const supplierIdx = headers.findIndex(h => h.toLowerCase().includes('fornitore'));
        const descriptionIdx = headers.findIndex(h => h.toLowerCase().includes('descrizione'));
        const amountIdx = headers.findIndex(h => h.toLowerCase().includes('importo'));
        
        if (supplierIdx >= 0 && amountIdx >= 0) {
          let amountStr = values[amountIdx].trim();
          // Handle both formats: 1200000.0 or 1.200.000,00
          if (amountStr.includes(',')) {
            amountStr = amountStr.replace(/\./g, '').replace(',', '.');
          }
          
          const amount = parseFloat(amountStr) || 0;
          const invoiceNumber = invoiceNumberIdx >= 0 ? values[invoiceNumberIdx] : null;
          const supplier = supplierIdx >= 0 ? values[supplierIdx] : null;
          const description = descriptionIdx >= 0 ? values[descriptionIdx] : 'Invoice';
          
          console.log(`Parsed invoice: ${supplier} - ${invoiceNumber} - €${amount}`);
          
          transaction = {
            transaction_date: new Date().toISOString().split('T')[0], // Use current date as fallback
            counterpart_name: supplier,
            description: `${description}${invoiceNumber ? ` (Fattura ${invoiceNumber})` : ''}`,
            amount: Math.abs(amount),
            transaction_type: 'debit',
            reference_number: invoiceNumber,
            category: categorizeTransaction(description || ''),
          };
        }
      } else if (isItalianBankFormat && values.length >= 4) {
        // Italian bank format: Data;Beneficiario;Descrizione;Importo;Causale
        let amountStr = values[3].trim();
        
        // Check if it's European format (has comma as decimal separator)
        if (amountStr.includes(',')) {
          // European format: remove dots (thousands), replace comma with dot (decimal)
          amountStr = amountStr.replace(/\./g, '').replace(',', '.');
        }
        
        const amount = parseFloat(amountStr) || 0;
        console.log(`Parsing amount: original="${values[3]}", processed="${amountStr}", result=${amount}`);
        
        transaction = {
          transaction_date: parseDate(values[0]) || new Date().toISOString().split('T')[0],
          counterpart_name: values[1] || null,
          description: values[2] || 'Unknown transaction',
          amount: Math.abs(amount),
          transaction_type: amount >= 0 ? 'credit' : 'debit',
          reference_number: values[4] || null,
          category: categorizeTransaction(values[2] || ''),
        };
      } else {
        // Standard format: Date, Description, Amount, Reference, Counterpart
        const amount = parseFloat(values[2]) || 0;
        transaction = {
          transaction_date: parseDate(values[0]) || new Date().toISOString().split('T')[0],
          description: values[1] || 'Unknown transaction',
          amount: Math.abs(amount),
          transaction_type: amount >= 0 ? 'credit' : 'debit',
          reference_number: values[3] || null,
          counterpart_name: values[4] || null,
          category: categorizeTransaction(values[1] || ''),
        };
      }
      
      if (transaction) {
        transactions.push(transaction);
      }
    }
  }

  console.log(`Parsed ${transactions.length} transactions`);

  return {
    account_info: {
      account_number: 'PARSED_FROM_CSV',
      account_name: 'CSV Account',
      bank_name: 'Unknown Bank'
    },
    statement_period: {
      start: transactions[0]?.transaction_date,
      end: transactions[transactions.length - 1]?.transaction_date
    },
    transactions,
    total_transactions: transactions.length
  };
}

function parseXML(content: string) {
  console.log('Parsing XML content...');
  // Basic XML parsing for bank statements (e.g., CAMT.053 format)
  const transactions = [];
  
  // Simple regex-based parsing for demo purposes
  const entryMatches = content.matchAll(/<Ntry>(.*?)<\/Ntry>/gs);
  
  for (const match of entryMatches) {
    const entryContent = match[1];
    const amtMatch = entryContent.match(/<Amt[^>]*>([^<]+)/);
    const dtMatch = entryContent.match(/<BookgDt>.*?<Dt>([^<]+)/);
    const dtlsMatch = entryContent.match(/<Ustrd>([^<]+)/);
    
    if (amtMatch && dtMatch) {
      const transaction = {
        transaction_date: dtMatch[1],
        description: dtlsMatch ? dtlsMatch[1] : 'XML Transaction',
        amount: parseFloat(amtMatch[1]) || 0,
        transaction_type: parseFloat(amtMatch[1]) >= 0 ? 'credit' : 'debit',
        category: categorizeTransaction(dtlsMatch ? dtlsMatch[1] : ''),
      };
      transactions.push(transaction);
    }
  }

  return {
    account_info: {
      account_number: 'PARSED_FROM_XML',
      account_name: 'XML Account',
      bank_name: 'XML Bank'
    },
    statement_period: {
      start: transactions[0]?.transaction_date,
      end: transactions[transactions.length - 1]?.transaction_date
    },
    transactions,
    total_transactions: transactions.length
  };
}

function parseMT940(content: string) {
  console.log('Parsing MT940 content...');
  const transactions = [];
  const lines = content.split('\n');
  
  let currentTransaction: any = {};
  
  for (const line of lines) {
    if (line.startsWith(':61:')) {
      // Transaction line
      if (currentTransaction.transaction_date) {
        transactions.push(currentTransaction);
      }
      
      // Parse MT940 transaction line
      const match = line.match(/:61:(\d{6})(\d{4})?(C|D)(\d+,\d+)(.*)/);
      if (match) {
        currentTransaction = {
          transaction_date: `20${match[1].substring(0, 2)}-${match[1].substring(2, 4)}-${match[1].substring(4, 6)}`,
          transaction_type: match[3] === 'C' ? 'credit' : 'debit',
          amount: parseFloat(match[4].replace(',', '.')),
          reference_number: match[5] || null,
          description: '',
        };
      }
    } else if (line.startsWith(':86:')) {
      // Transaction details
      currentTransaction.description = line.substring(4);
      currentTransaction.category = categorizeTransaction(currentTransaction.description);
    }
  }
  
  if (currentTransaction.transaction_date) {
    transactions.push(currentTransaction);
  }

  return {
    account_info: {
      account_number: 'PARSED_FROM_MT940',
      account_name: 'MT940 Account',
      bank_name: 'MT940 Bank'
    },
    statement_period: {
      start: transactions[0]?.transaction_date,
      end: transactions[transactions.length - 1]?.transaction_date
    },
    transactions,
    total_transactions: transactions.length
  };
}

function parseDate(dateStr: string): string | null {
  // Try various date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
    /(\d{2})\.(\d{2})\.(\d{4})/, // DD.MM.YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      } else if (format === formats[1] || format === formats[2]) {
        return `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
      } else if (format === formats[3]) {
        return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
      }
    }
  }
  
  return null;
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('salary') || desc.includes('stipendio') || desc.includes('payroll')) {
    return 'salary';
  } else if (desc.includes('rent') || desc.includes('affitto') || desc.includes('lease')) {
    return 'rent';
  } else if (desc.includes('fuel') || desc.includes('gas') || desc.includes('carburante')) {
    return 'travel';
  } else if (desc.includes('office') || desc.includes('ufficio') || desc.includes('supplies')) {
    return 'office';
  } else if (desc.includes('food') || desc.includes('restaurant') || desc.includes('meal')) {
    return 'meals';
  } else if (desc.includes('software') || desc.includes('subscription') || desc.includes('saas')) {
    return 'software';
  } else if (desc.includes('consulting') || desc.includes('professional') || desc.includes('services')) {
    return 'professional_services';
  } else {
    return 'other';
  }
}

function generateMockTransactions() {
  return {
    account_info: {
      account_number: 'IT60X0542811101000000123456',
      account_name: 'Business Current Account',
      bank_name: 'Banca Monte dei Paschi'
    },
    statement_period: {
      start: '2024-01-01',
      end: '2024-01-31'
    },
    transactions: [
      {
        transaction_date: '2024-01-15',
        description: 'Office Supplies Purchase',
        amount: -150.00,
        transaction_type: 'debit',
        reference_number: 'TXN001',
        counterpart_name: 'Office Depot',
        category: 'office'
      },
      {
        transaction_date: '2024-01-20',
        description: 'Client Payment Received',
        amount: 2500.00,
        transaction_type: 'credit',
        reference_number: 'TXN002',
        counterpart_name: 'ABC Corp',
        category: 'income'
      },
      {
        transaction_date: '2024-01-25',
        description: 'Software Subscription',
        amount: -99.00,
        transaction_type: 'debit',
        reference_number: 'TXN003',
        counterpart_name: 'Software Co',
        category: 'software'
      }
    ],
    total_transactions: 3
  };
}