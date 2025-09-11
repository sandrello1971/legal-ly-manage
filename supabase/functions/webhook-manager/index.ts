import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface WebhookSubscription {
  id: string;
  endpoint_url: string;
  events: string[];
  secret_key: string;
  is_active: boolean;
  max_retries: number;
  retry_delay_seconds: number;
}

interface WebhookEvent {
  id?: string;
  subscription_id: string;
  event_type: string;
  event_data: any;
  delivery_attempts: number;
  next_retry_at?: string;
}

// Generate webhook signature for security
function generateSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return 'sha256=' + Array.from(hmac.digest())
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Deliver webhook to endpoint
async function deliverWebhook(subscription: WebhookSubscription, event: WebhookEvent): Promise<{
  success: boolean;
  status?: number;
  response?: string;
  error?: string;
}> {
  try {
    const payload = JSON.stringify({
      id: event.id,
      event_type: event.event_type,
      data: event.event_data,
      timestamp: new Date().toISOString(),
      subscription_id: subscription.id
    });

    const signature = generateSignature(payload, subscription.secret_key);

    const response = await fetch(subscription.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': event.event_type,
        'User-Agent': 'DocumentManager-Webhooks/1.0'
      },
      body: payload,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const responseText = await response.text();

    return {
      success: response.ok,
      status: response.status,
      response: responseText
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Process webhook delivery with retries
async function processWebhookEvent(eventId: string) {
  try {
    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventId);
      return;
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('id', event.subscription_id)
      .eq('is_active', true)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found or inactive:', event.subscription_id);
      return;
    }

    // Check if event type is subscribed
    if (!subscription.events.includes(event.event_type)) {
      console.log('Event type not subscribed:', event.event_type);
      return;
    }

    // Attempt delivery
    const deliveryResult = await deliverWebhook(subscription, event);
    const now = new Date().toISOString();

    if (deliveryResult.success) {
      // Mark as delivered
      await supabase
        .from('webhook_events')
        .update({
          delivered_at: now,
          last_attempt_at: now,
          last_response_status: deliveryResult.status,
          last_response_body: deliveryResult.response,
          delivery_attempts: event.delivery_attempts + 1
        })
        .eq('id', eventId);

      // Update subscription last delivered time
      await supabase
        .from('webhook_subscriptions')
        .update({ last_delivered_at: now })
        .eq('id', subscription.id);

      console.log('Webhook delivered successfully:', eventId);

    } else {
      // Handle failed delivery
      const newAttempts = event.delivery_attempts + 1;
      const shouldRetry = newAttempts < subscription.max_retries;
      
      const updates: any = {
        delivery_attempts: newAttempts,
        last_attempt_at: now,
        last_response_status: deliveryResult.status,
        last_response_body: deliveryResult.response || deliveryResult.error
      };

      if (shouldRetry) {
        // Schedule retry with exponential backoff
        const backoffMinutes = Math.pow(2, newAttempts - 1) * (subscription.retry_delay_seconds / 60);
        const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);
        updates.next_retry_at = nextRetry.toISOString();
      } else {
        // Max retries reached
        updates.failed_at = now;
        updates.next_retry_at = null;
      }

      await supabase
        .from('webhook_events')
        .update(updates)
        .eq('id', eventId);

      console.log(`Webhook delivery failed (attempt ${newAttempts}/${subscription.max_retries}):`, eventId);
    }

  } catch (error) {
    console.error('Error processing webhook event:', error);
  }
}

// Process retry queue
async function processRetryQueue() {
  try {
    const now = new Date().toISOString();
    
    // Get events that need to be retried
    const { data: retryEvents, error } = await supabase
      .from('webhook_events')
      .select('id')
      .lte('next_retry_at', now)
      .is('delivered_at', null)
      .is('failed_at', null)
      .limit(10);

    if (error) {
      console.error('Error fetching retry events:', error);
      return;
    }

    if (retryEvents && retryEvents.length > 0) {
      console.log(`Processing ${retryEvents.length} retry events`);
      
      // Process each event
      for (const event of retryEvents) {
        await processWebhookEvent(event.id);
        // Small delay between retries to avoid overwhelming endpoints
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

  } catch (error) {
    console.error('Error processing retry queue:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'trigger';

    if (action === 'process_retries') {
      // Process retry queue
      await processRetryQueue();
      
      return new Response(
        JSON.stringify({ success: true, message: 'Retry queue processed' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    if (action === 'trigger') {
      const { event_type, data, user_id } = await req.json();

      if (!event_type || !data) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required parameters',
            message: 'event_type and data are required' 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Get all active subscriptions for this event type
      const { data: subscriptions, error: subError } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .eq('is_active', true)
        .contains('events', [event_type]);

      if (subError) {
        throw new Error('Error fetching subscriptions: ' + subError.message);
      }

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No active subscriptions found for event type',
            event_type 
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Filter subscriptions by user if user_id is provided
      const targetSubscriptions = user_id 
        ? subscriptions.filter(sub => sub.user_id === user_id)
        : subscriptions;

      if (targetSubscriptions.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No subscriptions found for the specified user',
            event_type,
            user_id 
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // Create webhook events for each subscription
      const webhookEvents = [];
      for (const subscription of targetSubscriptions) {
        const { data: event, error: eventError } = await supabase
          .from('webhook_events')
          .insert({
            subscription_id: subscription.id,
            event_type,
            event_data: data,
            delivery_attempts: 0
          })
          .select()
          .single();

        if (eventError) {
          console.error('Error creating webhook event:', eventError);
          continue;
        }

        webhookEvents.push(event);
        
        // Process immediately in the background
        processWebhookEvent(event.id).catch(error => {
          console.error('Background processing error:', error);
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Created ${webhookEvents.length} webhook events`,
          events_created: webhookEvents.length,
          event_type
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: 'Invalid action',
        available_actions: ['trigger', 'process_retries']
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Webhook Manager Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});