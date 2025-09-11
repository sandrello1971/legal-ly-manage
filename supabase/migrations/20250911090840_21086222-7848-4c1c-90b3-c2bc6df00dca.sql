-- Digital Archive and Compliance System

-- Archive retention policies
CREATE TABLE public.archive_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  retention_period_months INTEGER NOT NULL,
  auto_seal_enabled BOOLEAN NOT NULL DEFAULT false,
  legal_requirement TEXT,
  document_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document archives with digital timestamping
CREATE TABLE public.document_archives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  archive_policy_id UUID NOT NULL,
  original_hash TEXT NOT NULL,
  archived_hash TEXT NOT NULL,
  digital_signature JSONB,
  timestamp_info JSONB NOT NULL,
  sealed_at TIMESTAMP WITH TIME ZONE,
  retention_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archive_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  compression_ratio NUMERIC,
  archived_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Digital timestamps and signatures
CREATE TABLE public.digital_timestamps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID,
  archive_id UUID,
  hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  document_hash TEXT NOT NULL,
  timestamp_hash TEXT NOT NULL,
  digital_signature TEXT,
  timestamp_authority TEXT,
  timestamp_token BYTEA,
  verification_data JSONB,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Compliance checklists and requirements
CREATE TABLE public.compliance_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  regulation_reference TEXT NOT NULL,
  requirements JSONB NOT NULL, -- Array of requirement objects
  mandatory_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  document_types TEXT[] DEFAULT ARRAY[]::TEXT[],
  retention_min_months INTEGER,
  retention_max_months INTEGER,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document compliance status
CREATE TABLE public.document_compliance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL,
  checklist_id UUID NOT NULL,
  compliance_status TEXT NOT NULL CHECK (compliance_status IN ('compliant', 'non_compliant', 'pending', 'review_required')),
  compliance_score NUMERIC CHECK (compliance_score >= 0 AND compliance_score <= 100),
  requirements_met JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements_failed JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Archive audit trail
CREATE TABLE public.archive_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  archive_id UUID,
  document_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  user_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.archive_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for archive_policies
CREATE POLICY "Users can manage their archive policies" 
ON public.archive_policies 
FOR ALL 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- RLS Policies for document_archives
CREATE POLICY "Users can view archives of their documents" 
ON public.document_archives 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_archives.document_id 
  AND documents.uploaded_by = auth.uid()
));

CREATE POLICY "Users can create archives for their documents" 
ON public.document_archives 
FOR INSERT 
WITH CHECK (
  auth.uid() = archived_by AND
  EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = document_archives.document_id 
    AND documents.uploaded_by = auth.uid()
  )
);

-- RLS Policies for digital_timestamps
CREATE POLICY "Users can manage timestamps for their documents" 
ON public.digital_timestamps 
FOR ALL 
USING (
  auth.uid() = created_by AND (
    (document_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.documents 
      WHERE documents.id = digital_timestamps.document_id 
      AND documents.uploaded_by = auth.uid()
    )) OR
    (archive_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.document_archives da
      JOIN public.documents d ON da.document_id = d.id
      WHERE da.id = digital_timestamps.archive_id 
      AND d.uploaded_by = auth.uid()
    ))
  )
);

-- RLS Policies for compliance_checklists
CREATE POLICY "Users can manage their compliance checklists" 
ON public.compliance_checklists 
FOR ALL 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- RLS Policies for document_compliance
CREATE POLICY "Users can manage compliance for their documents" 
ON public.document_compliance 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.documents 
  WHERE documents.id = document_compliance.document_id 
  AND documents.uploaded_by = auth.uid()
));

-- RLS Policies for archive_audit_log
CREATE POLICY "Users can view audit logs for their archives" 
ON public.archive_audit_log 
FOR SELECT 
USING (
  (document_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.documents 
    WHERE documents.id = archive_audit_log.document_id 
    AND documents.uploaded_by = auth.uid()
  )) OR
  (archive_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.document_archives da
    JOIN public.documents d ON da.document_id = d.id
    WHERE da.id = archive_audit_log.archive_id 
    AND d.uploaded_by = auth.uid()
  ))
);

CREATE POLICY "System can insert audit logs" 
ON public.archive_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_document_archives_document_id ON public.document_archives(document_id);
CREATE INDEX idx_document_archives_policy_id ON public.document_archives(archive_policy_id);
CREATE INDEX idx_document_archives_retention_expires ON public.document_archives(retention_expires_at);
CREATE INDEX idx_digital_timestamps_document_id ON public.digital_timestamps(document_id);
CREATE INDEX idx_digital_timestamps_archive_id ON public.digital_timestamps(archive_id);
CREATE INDEX idx_document_compliance_document_id ON public.document_compliance(document_id);
CREATE INDEX idx_document_compliance_status ON public.document_compliance(compliance_status);
CREATE INDEX idx_archive_audit_log_document_id ON public.archive_audit_log(document_id);
CREATE INDEX idx_archive_audit_log_archive_id ON public.archive_audit_log(archive_id);

-- Functions for automatic archive management
CREATE OR REPLACE FUNCTION public.calculate_retention_expiry(
  retention_months INTEGER,
  archive_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN archive_date + (retention_months || ' months')::INTERVAL;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_document_hash(
  file_content BYTEA,
  algorithm TEXT DEFAULT 'sha256'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE algorithm
    WHEN 'sha256' THEN
      RETURN encode(digest(file_content, 'sha256'), 'hex');
    WHEN 'sha512' THEN
      RETURN encode(digest(file_content, 'sha512'), 'hex');
    ELSE
      RAISE EXCEPTION 'Unsupported hash algorithm: %', algorithm;
  END CASE;
END;
$$;

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION public.log_archive_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.archive_audit_log (
      archive_id,
      document_id,
      action,
      details,
      user_id,
      ip_address
    ) VALUES (
      NEW.id,
      NEW.document_id,
      'archive_created',
      jsonb_build_object(
        'archive_policy_id', NEW.archive_policy_id,
        'retention_expires_at', NEW.retention_expires_at,
        'file_size', NEW.file_size
      ),
      NEW.archived_by,
      inet_client_addr()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.archive_audit_log (
      archive_id,
      document_id,
      action,
      details,
      user_id,
      ip_address
    ) VALUES (
      NEW.id,
      NEW.document_id,
      CASE WHEN OLD.sealed_at IS NULL AND NEW.sealed_at IS NOT NULL THEN 'archive_sealed'
           ELSE 'archive_updated' END,
      jsonb_build_object(
        'old_values', to_jsonb(OLD),
        'new_values', to_jsonb(NEW)
      ),
      auth.uid(),
      inet_client_addr()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for audit logging
CREATE TRIGGER archive_audit_trigger
  AFTER INSERT OR UPDATE ON public.document_archives
  FOR EACH ROW EXECUTE FUNCTION public.log_archive_activity();

-- Trigger for updating timestamps
CREATE TRIGGER update_archive_policies_updated_at
  BEFORE UPDATE ON public.archive_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_archives_updated_at
  BEFORE UPDATE ON public.document_archives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_checklists_updated_at
  BEFORE UPDATE ON public.compliance_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_compliance_updated_at
  BEFORE UPDATE ON public.document_compliance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();