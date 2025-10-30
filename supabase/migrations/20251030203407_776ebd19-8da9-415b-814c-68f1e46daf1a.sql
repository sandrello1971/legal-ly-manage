-- Fix security warning: Set search_path for the function
CREATE OR REPLACE FUNCTION update_project_spent_budget()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET 
    spent_budget = COALESCE((
      SELECT SUM(amount)
      FROM project_expenses
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        AND is_approved = true
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';