import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface IntegrationConfig {
  id: string;
  type: string;
  provider: string;
  configuration: any;
  credentials: any;
  is_active: boolean;
}

// Email Integration Handler
async function handleEmailIntegration(config: IntegrationConfig, action: string, data: any) {
  if (config.provider === 'resend') {
    const resend = new Resend(config.credentials.api_key);
    
    switch (action) {
      case 'send_email':
        const emailResult = await resend.emails.send({
          from: data.from || config.configuration.default_from,
          to: data.to,
          subject: data.subject,
          html: data.html || data.text
        });
        
        return { success: true, result: emailResult };
      
      case 'test_connection':
        try {
          // Test the connection by getting the domain info
          const domains = await resend.domains.list();
          return { success: true, message: 'Connection successful', data: domains };
        } catch (error) {
          return { success: false, error: (error as Error).message };
        }
      
      default:
        return { success: false, error: 'Unsupported action for email integration' };
    }
  }
  
  return { success: false, error: 'Unsupported email provider' };
}

// Bank PSD2 Integration Handler (Mock implementation)
async function handleBankIntegration(config: IntegrationConfig, action: string, data: any) {
  // This would integrate with real PSD2 APIs in production
  switch (action) {
    case 'get_accounts':
      // Mock response for demonstration
      return {
        success: true,
        result: {
          accounts: [
            {
              id: 'acc_001',
              name: 'Business Current Account',
              iban: 'IT60 X054 2811 1010 0000 0123 456',
              balance: 15750.00,
              currency: 'EUR'
            },
            {
              id: 'acc_002',
              name: 'Business Savings Account',
              iban: 'IT60 X054 2811 1010 0000 0987 654',
              balance: 45200.00,
              currency: 'EUR'
            }
          ]
        }
      };
    
    case 'get_transactions':
      // Mock transactions
      return {
        success: true,
        result: {
          transactions: [
            {
              id: 'txn_001',
              amount: -250.00,
              description: 'Office supplies - Staples Inc.',
              date: new Date().toISOString(),
              category: 'Office Expenses'
            },
            {
              id: 'txn_002',
              amount: 1500.00,
              description: 'Client payment - ABC Corp',
              date: new Date(Date.now() - 86400000).toISOString(),
              category: 'Revenue'
            }
          ]
        }
      };
    
    case 'test_connection':
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, message: 'Bank connection test successful' };
    
    default:
      return { success: false, error: 'Unsupported action for bank integration' };
  }
}

// DocuSign Integration Handler (Mock implementation)
async function handleDocuSignIntegration(config: IntegrationConfig, action: string, data: any) {
  switch (action) {
    case 'send_envelope':
      // Mock DocuSign envelope creation
      return {
        success: true,
        result: {
          envelope_id: 'env_' + Date.now(),
          status: 'sent',
          recipients: data.recipients,
          documents: data.documents
        }
      };
    
    case 'get_envelope_status':
      return {
        success: true,
        result: {
          envelope_id: data.envelope_id,
          status: Math.random() > 0.5 ? 'completed' : 'sent',
          completed_at: new Date().toISOString()
        }
      };
    
    case 'test_connection':
      return { success: true, message: 'DocuSign connection test successful' };
    
    default:
      return { success: false, error: 'Unsupported action for DocuSign integration' };
  }
}

// ERP Integration Handler (Mock implementation)
async function handleERPIntegration(config: IntegrationConfig, action: string, data: any) {
  switch (action) {
    case 'sync_customers':
      // Mock customer sync
      return {
        success: true,
        result: {
          synced: 25,
          errors: 0,
          customers: [
            { id: 'cust_001', name: 'ABC Corporation', email: 'contact@abc.com' },
            { id: 'cust_002', name: 'XYZ Ltd', email: 'info@xyz.com' }
          ]
        }
      };
    
    case 'sync_invoices':
      return {
        success: true,
        result: {
          synced: 15,
          errors: 1,
          invoices: [
            { id: 'inv_001', number: 'INV-2024-001', amount: 1500.00, status: 'paid' },
            { id: 'inv_002', number: 'INV-2024-002', amount: 2300.00, status: 'pending' }
          ]
        }
      };
    
    case 'test_connection':
      return { success: true, message: 'ERP connection test successful' };
    
    default:
      return { success: false, error: 'Unsupported action for ERP integration' };
  }
}

// Log integration activity
async function logIntegrationActivity(
  integrationId: string,
  syncType: string,
  status: string,
  recordsProcessed = 0,
  recordsFailed = 0,
  errorDetails?: any
) {
  try {
    await supabase
      .from('integration_sync_logs')
      .insert({
        integration_id: integrationId,
        sync_type: syncType,
        status,
        records_processed: recordsProcessed,
        records_failed: recordsFailed,
        error_details: errorDetails,
        sync_duration_ms: Date.now() % 10000 // Mock duration
      });
  } catch (error) {
    console.error('Error logging integration activity:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, integration_id, data } = await req.json();

    if (!action || !integration_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          message: 'action and integration_id are required' 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ 
          error: 'Integration not found or inactive',
          message: 'The specified integration does not exist or is disabled' 
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    let result;
    const startTime = Date.now();

    // Route to specific integration handlers
    switch (integration.type) {
      case 'email':
        result = await handleEmailIntegration(integration, action, data);
        break;
      
      case 'bank_psd2':
        result = await handleBankIntegration(integration, action, data);
        break;
      
      case 'docusign':
        result = await handleDocuSignIntegration(integration, action, data);
        break;
      
      case 'erp':
        result = await handleERPIntegration(integration, action, data);
        break;
      
      default:
        result = { success: false, error: 'Unsupported integration type: ' + integration.type };
    }

    // Log the activity
    await logIntegrationActivity(
      integration_id,
      action,
      result.success ? 'success' : 'error',
      (result.result as any)?.synced || (result.result as any)?.length || 1,
      (result.result as any)?.errors || (result.success ? 0 : 1),
      result.success ? null : { error: result.error }
    );

    // Update integration status
    if (action !== 'test_connection') {
      await supabase
        .from('integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_status: result.success ? 'success' : 'error',
          error_message: result.success ? null : result.error
        })
        .eq('id', integration_id);
    }

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Integration Hub Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: (error as Error).message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});