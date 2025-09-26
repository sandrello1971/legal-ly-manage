import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface ApiKeyData {
  id: string;
  user_id: string;
  permissions: string[];
  rate_limit_per_hour: number;
  is_active: boolean;
}

interface RateLimitData {
  requests: number;
  window_start: Date;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Rate limiting cache (in production, use Redis)
const rateLimitCache = new Map<string, RateLimitData>();

async function validateApiKey(apiKey: string): Promise<ApiKeyData | null> {
  if (!apiKey) return null;

  try {
    const keyHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(apiKey)
    );
    const keyHashHex = Array.from(new Uint8Array(keyHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, permissions, rate_limit_per_hour, is_active')
      .eq('key_hash', keyHashHex)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as ApiKeyData;
  } catch (error) {
    console.error('Error validating API key:', error);
    return null;
  }
}

async function checkRateLimit(keyId: string, hourlyLimit: number): Promise<boolean> {
  const now = new Date();
  const hourWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  
  const cacheKey = `${keyId}-${hourWindow.getTime()}`;
  const current = rateLimitCache.get(cacheKey);

  if (!current) {
    rateLimitCache.set(cacheKey, { requests: 1, window_start: hourWindow });
    return true;
  }

  if (current.requests >= hourlyLimit) {
    return false;
  }

  current.requests++;
  return true;
}

async function logApiRequest(
  apiKeyId: string,
  userId: string,
  method: string,
  endpoint: string,
  statusCode: number,
  responseTimeMs: number,
  requestSize?: number,
  responseSize?: number,
  errorMessage?: string
) {
  try {
    await supabase
      .from('api_request_logs')
      .insert({
        api_key_id: apiKeyId,
        user_id: userId,
        method,
        endpoint,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        request_size_bytes: requestSize,
        response_size_bytes: responseSize,
        error_message: errorMessage
      });
  } catch (error) {
    console.error('Error logging API request:', error);
  }
}

async function handleDocumentsEndpoint(request: Request, apiKeyData: ApiKeyData, method: string) {
  const startTime = Date.now();
  
  try {
    if (method === 'GET') {
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_name, file_type, document_type, status, created_at, updated_at')
        .eq('uploaded_by', apiKeyData.user_id)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const responseTime = Date.now() - startTime;
      await logApiRequest(
        apiKeyData.id,
        apiKeyData.user_id,
        method,
        '/documents',
        200,
        responseTime
      );

      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (method === 'POST') {
      const body = await request.json();
      
      if (!body.title || !body.file_url) {
        const responseTime = Date.now() - startTime;
        await logApiRequest(
          apiKeyData.id,
          apiKeyData.user_id,
          method,
          '/documents',
          400,
          responseTime,
          undefined,
          undefined,
          'Missing required fields: title, file_url'
        );

        return new Response(
          JSON.stringify({ error: 'Missing required fields: title, file_url' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: body.title,
          file_name: body.file_name || body.title,
          file_url: body.file_url,
          file_type: body.file_type || 'unknown',
          file_size: body.file_size || 0,
          mime_type: body.mime_type || 'application/octet-stream',
          document_type: body.document_type || 'other',
          uploaded_by: apiKeyData.user_id,
          description: body.description
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const responseTime = Date.now() - startTime;
      await logApiRequest(
        apiKeyData.id,
        apiKeyData.user_id,
        method,
        '/documents',
        201,
        responseTime
      );

      return new Response(
        JSON.stringify({ data }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      apiKeyData.id,
      apiKeyData.user_id,
      method,
      '/documents',
      500,
      responseTime,
      undefined,
      undefined,
      (error as Error).message
    );

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

async function handleExpensesEndpoint(request: Request, apiKeyData: ApiKeyData, method: string) {
  const startTime = Date.now();
  
  try {
    if (method === 'GET') {
      const url = new URL(request.url);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = parseInt(url.searchParams.get('offset') || '0');

      const { data, error } = await supabase
        .from('project_expenses')
        .select('id, description, amount, category, expense_date, is_approved, created_at')
        .eq('created_by', apiKeyData.user_id)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const responseTime = Date.now() - startTime;
      await logApiRequest(
        apiKeyData.id,
        apiKeyData.user_id,
        method,
        '/expenses',
        200,
        responseTime
      );

      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    const responseTime = Date.now() - startTime;
    await logApiRequest(
      apiKeyData.id,
      apiKeyData.user_id,
      method,
      '/expenses',
      500,
      responseTime,
      undefined,
      undefined,
      (error as Error).message
    );

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'API key required',
          message: 'Include your API key in the X-API-Key header' 
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Validate API key
    const apiKeyData = await validateApiKey(apiKey);
    if (!apiKeyData) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid API key',
          message: 'The provided API key is invalid or inactive' 
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check rate limit
    const withinRateLimit = await checkRateLimit(apiKeyData.id, apiKeyData.rate_limit_per_hour);
    if (!withinRateLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: `You have exceeded your rate limit of ${apiKeyData.rate_limit_per_hour} requests per hour`,
          retry_after: 3600 - (Date.now() % 3600000) / 1000
        }),
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': apiKeyData.rate_limit_per_hour.toString(),
            'X-RateLimit-Remaining': '0',
            ...corsHeaders 
          },
        }
      );
    }

    // Route to specific endpoints
    const path = url.pathname;
    const method = req.method;

    if (path === '/documents' || path === '/documents/') {
      if (!apiKeyData.permissions.includes('documents:read') && method === 'GET') {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions for documents:read' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }
      if (!apiKeyData.permissions.includes('documents:write') && method === 'POST') {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions for documents:write' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }
      return await handleDocumentsEndpoint(req, apiKeyData, method);
    }

    if (path === '/expenses' || path === '/expenses/') {
      if (!apiKeyData.permissions.includes('expenses:read')) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions for expenses:read' }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }
      return await handleExpensesEndpoint(req, apiKeyData, method);
    }

    // API Info endpoint
    if (path === '/' || path === '/info') {
      return new Response(
        JSON.stringify({
          name: 'Document Management API',
          version: '1.0.0',
          endpoints: {
            '/documents': {
              GET: 'List user documents',
              POST: 'Create new document'
            },
            '/expenses': {
              GET: 'List user expenses'
            }
          },
          authentication: 'API Key required in X-API-Key header',
          rate_limits: `${apiKeyData.rate_limit_per_hour} requests per hour`
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Route not found
    return new Response(
      JSON.stringify({ 
        error: 'Endpoint not found',
        available_endpoints: ['/documents', '/expenses', '/info']
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});