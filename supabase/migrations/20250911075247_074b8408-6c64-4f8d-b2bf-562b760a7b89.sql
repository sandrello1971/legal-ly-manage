-- Sistema completo per gestione bandi e progetti

-- Enum per stati bandi
CREATE TYPE bando_status AS ENUM ('draft', 'active', 'expired', 'completed');

-- Enum per stati progetti  
CREATE TYPE project_status AS ENUM ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled');

-- Enum per tipi milestone
CREATE TYPE milestone_type AS ENUM ('deliverable', 'payment', 'review', 'deadline');

-- Enum per categorie spese
CREATE TYPE expense_category AS ENUM ('personnel', 'equipment', 'materials', 'services', 'travel', 'other');

-- Tabella bandi
CREATE TABLE public.bandi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  total_amount DECIMAL(12,2),
  application_deadline DATE,
  project_start_date DATE,
  project_end_date DATE,
  status bando_status DEFAULT 'draft',
  
  -- File decreto e parsing
  decree_file_url TEXT,
  decree_file_name TEXT,
  parsed_data JSONB, -- Dati estratti dal PDF
  
  -- Criteri e requisiti
  eligibility_criteria TEXT,
  evaluation_criteria TEXT,
  required_documents TEXT[],
  
  -- Informazioni organizzazione
  organization TEXT,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,
  
  -- Metadati
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('italian', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(organization, ''))
  ) STORED
);

-- Tabella progetti
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bando_id UUID REFERENCES public.bandi(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  
  -- Budget e finanze
  total_budget DECIMAL(12,2) NOT NULL,
  allocated_budget DECIMAL(12,2) DEFAULT 0,
  spent_budget DECIMAL(12,2) DEFAULT 0,
  remaining_budget DECIMAL(12,2) GENERATED ALWAYS AS (total_budget - spent_budget) STORED,
  
  -- Timeline
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  -- Stato e progress
  status project_status DEFAULT 'planning',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Team e responsabilità
  project_manager TEXT,
  team_members TEXT[],
  
  -- Documenti e note
  project_documents TEXT[],
  notes TEXT,
  risk_assessment TEXT,
  
  -- Metadati
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella milestone
CREATE TABLE public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  type milestone_type DEFAULT 'deliverable',
  
  -- Timeline
  due_date DATE NOT NULL,
  completed_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- Budget collegato
  budget_amount DECIMAL(10,2),
  
  -- Priority e dipendenze
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5), -- 1=highest, 5=lowest
  depends_on_milestone_id UUID REFERENCES public.project_milestones(id),
  
  -- Deliverables
  deliverables TEXT[],
  completion_criteria TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella spese progetto
CREATE TABLE public.project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id),
  
  description TEXT NOT NULL,
  category expense_category NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE NOT NULL,
  
  -- Documenti giustificativi
  receipt_url TEXT,
  receipt_number TEXT,
  supplier_name TEXT,
  
  -- Approvazione
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella alert e notifiche
CREATE TABLE public.project_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id),
  
  alert_type TEXT NOT NULL, -- 'budget_warning', 'deadline_approaching', 'milestone_overdue', 'budget_exceeded'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  is_read BOOLEAN DEFAULT FALSE,
  read_by UUID,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Alert thresholds
  threshold_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Indici per performance
CREATE INDEX idx_bandi_status ON public.bandi(status);
CREATE INDEX idx_bandi_deadline ON public.bandi(application_deadline);
CREATE INDEX idx_bandi_search ON public.bandi USING gin(search_vector);
CREATE INDEX idx_bandi_created_by ON public.bandi(created_by);

CREATE INDEX idx_projects_bando ON public.projects(bando_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_dates ON public.projects(start_date, end_date);
CREATE INDEX idx_projects_created_by ON public.projects(created_by);

CREATE INDEX idx_milestones_project ON public.project_milestones(project_id);
CREATE INDEX idx_milestones_due_date ON public.project_milestones(due_date);
CREATE INDEX idx_milestones_completed ON public.project_milestones(is_completed);

CREATE INDEX idx_expenses_project ON public.project_expenses(project_id);
CREATE INDEX idx_expenses_category ON public.project_expenses(category);
CREATE INDEX idx_expenses_date ON public.project_expenses(expense_date);
CREATE INDEX idx_expenses_approved ON public.project_expenses(is_approved);

CREATE INDEX idx_alerts_project ON public.project_alerts(project_id);
CREATE INDEX idx_alerts_active ON public.project_alerts(is_active);
CREATE INDEX idx_alerts_severity ON public.project_alerts(severity);

-- Trigger per updated_at
CREATE TRIGGER update_bandi_updated_at
  BEFORE UPDATE ON public.bandi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Funzione per aggiornare automaticamente il budget speso
CREATE OR REPLACE FUNCTION update_project_spent_budget()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.projects 
  SET spent_budget = (
    SELECT COALESCE(SUM(amount), 0) 
    FROM public.project_expenses 
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
    AND is_approved = TRUE
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornamento automatico budget
CREATE TRIGGER update_spent_budget_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_spent_budget();

-- Funzione per aggiornare progress progetto basato su milestone
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_milestones INTEGER;
  completed_milestones INTEGER;
  new_progress INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_completed = TRUE)
  INTO total_milestones, completed_milestones
  FROM public.project_milestones 
  WHERE project_id = COALESCE(NEW.project_id, OLD.project_id);
  
  IF total_milestones > 0 THEN
    new_progress := ROUND((completed_milestones::DECIMAL / total_milestones) * 100);
    
    UPDATE public.projects 
    SET progress_percentage = new_progress
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornamento automatico progress
CREATE TRIGGER update_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();

-- RLS Policies

-- Bandi
ALTER TABLE public.bandi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bandi" ON public.bandi
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create bandi" ON public.bandi
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their bandi" ON public.bandi
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their bandi" ON public.bandi
  FOR DELETE USING (auth.uid() = created_by);

-- Projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects" ON public.projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their projects" ON public.projects
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their projects" ON public.projects
  FOR DELETE USING (auth.uid() = created_by);

-- Milestones
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage milestones of their projects" ON public.project_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_milestones.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Expenses
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage expenses of their projects" ON public.project_expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_expenses.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Alerts
ALTER TABLE public.project_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage alerts of their projects" ON public.project_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE projects.id = project_alerts.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Inserisci dati di esempio
INSERT INTO public.bandi (title, description, total_amount, application_deadline, status, organization, created_by) VALUES
  ('Bando Innovazione Digitale 2024', 'Finanziamenti per progetti di trasformazione digitale delle PMI', 500000.00, '2024-12-31', 'active', 'Regione Lazio', '00000000-0000-0000-0000-000000000000'),
  ('Fondo Sviluppo Sostenibile', 'Contributi per progetti di economia circolare e sostenibilità ambientale', 750000.00, '2024-11-30', 'active', 'Ministero dell''Ambiente', '00000000-0000-0000-0000-000000000000'),
  ('Bando Ricerca e Sviluppo', 'Finanziamenti per progetti di R&S in collaborazione università-imprese', 1000000.00, '2024-10-15', 'draft', 'MIUR', '00000000-0000-0000-0000-000000000000');