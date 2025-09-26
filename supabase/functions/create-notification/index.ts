import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, userId, title, message, data, priority = 'medium', actionUrl, actionLabel, expiresAt } = await req.json();

    console.log('Creating notification:', { type, userId, title, message, priority });

    // Validate required fields
    if (!type || !userId || !title || !message) {
      console.error('Missing required fields:', { type, userId, title, message });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: type, userId, title, message' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        priority,
        data: data || null,
        action_url: actionUrl || null,
        action_label: actionLabel || null,
        expires_at: expiresAt || null
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    console.log('Notification created successfully:', notification.id);

    // Get user preferences to determine if we should send additional notifications
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    let emailSent = false;
    let pushSent = false;

    // Check if user wants email notifications for this type
    if (preferences?.email_enabled && preferences?.email_types?.includes(type)) {
      // Here you would integrate with your email service (e.g., Resend, SendGrid)
      console.log('Would send email notification for type:', type);
      emailSent = true;
    }

    // Check if user wants push notifications for this type
    if (preferences?.push_enabled && preferences?.push_types?.includes(type)) {
      // Here you would integrate with your push notification service
      console.log('Would send push notification for type:', type);
      pushSent = true;
    }

    // For high priority notifications, consider additional channels
    if (priority === 'urgent' || priority === 'high') {
      console.log('High priority notification - consider additional notification channels');
    }

    return new Response(JSON.stringify({ 
      success: true,
      notification,
      emailSent,
      pushSent
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-notification function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: (error as Error).message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});