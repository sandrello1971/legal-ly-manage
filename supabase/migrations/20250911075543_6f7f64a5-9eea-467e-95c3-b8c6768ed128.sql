-- Correggi warning sicurezza per le funzioni

-- Ricrea le funzioni con search_path sicuro
DROP FUNCTION IF EXISTS update_project_spent_budget() CASCADE;
DROP FUNCTION IF EXISTS update_project_progress() CASCADE;

-- Funzione per aggiornare automaticamente il budget speso
CREATE OR REPLACE FUNCTION update_project_spent_budget()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Funzione per aggiornare progress progetto basato su milestone
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Ricrea i trigger
CREATE TRIGGER update_spent_budget_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_spent_budget();

CREATE TRIGGER update_progress_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();