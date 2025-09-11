-- API Keys Management
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- External Integrations
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'erp', 'bank_psd2', 'docusign', 'email', 'custom'
  provider TEXT NOT NULL, -- 'sap', 'ing', 'docusign', 'resend', etc.
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  credentials JSONB, -- encrypted credentials
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'error', 'success'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Webhook Subscriptions
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of event types
  secret_key TEXT NOT NULL, -- for signature verification
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay_seconds INTEGER NOT NULL DEFAULT 300, -- 5 minutes
  last_delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Webhook Events Log
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_response_status INTEGER,
  last_response_body TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- API Request Logs
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id UUID,
  method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  user_agent TEXT,
  ip_address INET,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Integration Sync Logs
CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'manual', 'scheduled', 'webhook'
  status TEXT NOT NULL, -- 'success', 'error', 'partial'
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for API Keys
CREATE POLICY "Users can manage their API keys"
  ON public.api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Integrations
CREATE POLICY "Users can manage their integrations"
  ON public.integrations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Webhook Subscriptions
CREATE POLICY "Users can manage their webhook subscriptions"
  ON public.webhook_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Webhook Events
CREATE POLICY "Users can view webhook events for their subscriptions"
  ON public.webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhook_subscriptions ws 
      WHERE ws.id = webhook_events.subscription_id 
      AND ws.user_id = auth.uid()
    )
  );

-- RLS Policies for API Request Logs
CREATE POLICY "Users can view their API request logs"
  ON public.api_request_logs FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.api_keys ak 
      WHERE ak.id = api_request_logs.api_key_id 
      AND ak.user_id = auth.uid()
    )
  );

-- RLS Policies for Integration Sync Logs
CREATE POLICY "Users can view their integration sync logs"
  ON public.integration_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.integrations i 
      WHERE i.id = integration_sync_logs.integration_id 
      AND i.user_id = auth.uid()
    )
  );

-- System can insert logs
CREATE POLICY "System can insert API request logs"
  ON public.api_request_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can insert webhook events"
  ON public.webhook_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update webhook events"
  ON public.webhook_events FOR UPDATE
  USING (true);

CREATE POLICY "System can insert integration sync logs"
  ON public.integration_sync_logs FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON public.integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_active ON public.integrations(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_user_id ON public.webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active ON public.webhook_subscriptions(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_webhook_events_subscription_id ON public.webhook_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_next_retry ON public.webhook_events(next_retry_at) WHERE next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_request_logs_user_id ON public.api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id ON public.api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON public.api_request_logs(created_at);

-- Functions for API key management
CREATE OR REPLACE FUNCTION public.generate_api_key_hash(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(api_key, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate webhook signature
CREATE OR REPLACE FUNCTION public.validate_webhook_signature(
  payload TEXT,
  signature TEXT,
  secret TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN signature = 'sha256=' || encode(
    digest(payload || secret, 'sha256'), 'hex'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updating timestamps
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();