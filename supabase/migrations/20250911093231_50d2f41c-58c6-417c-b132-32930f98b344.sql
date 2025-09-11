-- System Health Monitoring
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'response_time', 'db_performance', 'api_status', 'error_rate'
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT, -- 'ms', 'percent', 'count', 'boolean'
  status TEXT NOT NULL DEFAULT 'healthy', -- 'healthy', 'warning', 'critical'
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  metadata JSONB DEFAULT '{}'::jsonb,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System Logs Aggregated
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL, -- 'debug', 'info', 'warn', 'error', 'fatal'
  source TEXT NOT NULL, -- 'api', 'edge_function', 'database', 'integration', 'webhook'
  source_id TEXT, -- specific function/api endpoint
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  user_id UUID,
  session_id TEXT,
  request_id TEXT,
  trace_id TEXT,
  duration_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backup Configuration
CREATE TABLE IF NOT EXISTS public.backup_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  backup_type TEXT NOT NULL, -- 'full', 'incremental', 'documents_only', 'database_only'
  schedule_cron TEXT NOT NULL, -- cron expression
  encryption_enabled BOOLEAN NOT NULL DEFAULT true,
  encryption_key_id TEXT, -- reference to encryption key
  storage_providers JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of storage configs
  retention_days INTEGER NOT NULL DEFAULT 30,
  compression_enabled BOOLEAN NOT NULL DEFAULT true,
  include_tables JSONB DEFAULT '[]'::jsonb, -- specific tables to backup
  exclude_tables JSONB DEFAULT '[]'::jsonb, -- tables to exclude
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMP WITH TIME ZONE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Backup Jobs History
CREATE TABLE IF NOT EXISTS public.backup_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  configuration_id UUID NOT NULL REFERENCES public.backup_configurations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- 'scheduled', 'manual', 'recovery_test'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_size_bytes BIGINT,
  compressed_size_bytes BIGINT,
  files_count INTEGER,
  storage_locations JSONB DEFAULT '[]'::jsonb,
  checksum_sha256 TEXT,
  encryption_metadata JSONB,
  error_message TEXT,
  progress_percentage INTEGER DEFAULT 0,
  backup_path TEXT,
  recovery_tested_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System Alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL, -- 'performance', 'error_rate', 'backup_failed', 'security', 'custom'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  source_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance Baselines for anomaly detection
CREATE TABLE IF NOT EXISTS public.performance_baselines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  baseline_value NUMERIC NOT NULL,
  variance_threshold NUMERIC NOT NULL DEFAULT 20, -- percentage
  calculation_period TEXT NOT NULL, -- 'hourly', 'daily', 'weekly'
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  samples_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_name, calculation_period)
);

-- Enable RLS
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_baselines ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admins only for system monitoring
CREATE POLICY "Admins can manage system health metrics"
  ON public.system_health_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view system logs"
  ON public.system_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert logs"
  ON public.system_logs FOR INSERT
  WITH CHECK (true);

-- Users can manage their backup configurations
CREATE POLICY "Users can manage their backup configurations"
  ON public.backup_configurations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their backup jobs"
  ON public.backup_jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.backup_configurations bc 
      WHERE bc.id = backup_jobs.configuration_id 
      AND bc.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage backup jobs"
  ON public.backup_jobs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update backup jobs"
  ON public.backup_jobs FOR UPDATE
  USING (true);

-- Admins can manage system alerts
CREATE POLICY "Admins can manage system alerts"
  ON public.system_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create alerts"
  ON public.system_alerts FOR INSERT
  WITH CHECK (true);

-- Admins can manage performance baselines
CREATE POLICY "Admins can manage performance baselines"
  ON public.performance_baselines FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_type_time ON public.system_health_metrics(metric_type, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_status ON public.system_health_metrics(status) WHERE status != 'healthy';

CREATE INDEX IF NOT EXISTS idx_system_logs_level_time ON public.system_logs(level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_source_time ON public.system_logs(source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_backup_configurations_user_id ON public.backup_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_configurations_next_run ON public.backup_configurations(next_run_at) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_backup_jobs_config_id ON public.backup_jobs(configuration_id);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status_time ON public.backup_jobs(status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_alerts_severity_time ON public.system_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON public.system_alerts(is_resolved, created_at DESC) WHERE is_resolved = false;

-- Functions for monitoring
CREATE OR REPLACE FUNCTION public.calculate_error_rate(
  time_window_minutes INTEGER DEFAULT 60
)
RETURNS NUMERIC AS $$
DECLARE
  total_requests INTEGER;
  error_requests INTEGER;
BEGIN
  -- Get total requests in time window
  SELECT COUNT(*) INTO total_requests
  FROM public.api_request_logs
  WHERE created_at >= NOW() - (time_window_minutes || ' minutes')::INTERVAL;
  
  -- Get error requests (status >= 400)
  SELECT COUNT(*) INTO error_requests
  FROM public.api_request_logs
  WHERE created_at >= NOW() - (time_window_minutes || ' minutes')::INTERVAL
    AND status_code >= 400;
  
  -- Calculate error rate percentage
  IF total_requests = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((error_requests::NUMERIC / total_requests::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.calculate_avg_response_time(
  time_window_minutes INTEGER DEFAULT 60
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(response_time_ms), 0)
    FROM public.api_request_logs
    WHERE created_at >= NOW() - (time_window_minutes || ' minutes')::INTERVAL
      AND response_time_ms IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for automatic backup scheduling
CREATE OR REPLACE FUNCTION public.schedule_next_backup()
RETURNS VOID AS $$
DECLARE
  config RECORD;
  next_run TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Update next run times for active backup configurations
  FOR config IN 
    SELECT id, schedule_cron
    FROM public.backup_configurations
    WHERE is_active = true
  LOOP
    -- Calculate next run based on cron expression (simplified)
    -- In production, use a proper cron parser
    CASE 
      WHEN config.schedule_cron LIKE '0 0 * * *' THEN -- Daily at midnight
        next_run := DATE_TRUNC('day', NOW() + INTERVAL '1 day');
      WHEN config.schedule_cron LIKE '0 0 * * 0' THEN -- Weekly on Sunday
        next_run := DATE_TRUNC('week', NOW() + INTERVAL '1 week');
      WHEN config.schedule_cron LIKE '0 0 1 * *' THEN -- Monthly
        next_run := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
      ELSE -- Default to daily
        next_run := DATE_TRUNC('day', NOW() + INTERVAL '1 day');
    END CASE;
    
    UPDATE public.backup_configurations
    SET next_run_at = next_run
    WHERE id = config.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER update_backup_configurations_updated_at
  BEFORE UPDATE ON public.backup_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_performance_baselines_updated_at
  BEFORE UPDATE ON public.performance_baselines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();