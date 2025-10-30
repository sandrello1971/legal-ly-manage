-- Fix security warning: add search_path to the function
CREATE OR REPLACE FUNCTION update_project_spent_budget()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the project's spent_budget with the sum of approved expenses
  -- remaining_budget is a generated column and will update automatically
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;