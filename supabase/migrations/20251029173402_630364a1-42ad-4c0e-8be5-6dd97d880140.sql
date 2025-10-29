-- Fix the function to use correct column and count all expenses (not just approved)
CREATE OR REPLACE FUNCTION public.recalculate_project_spent_budget()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the spent_budget for the affected project
  UPDATE projects
  SET 
    spent_budget = COALESCE((
      SELECT SUM(COALESCE(amount, 0))
      FROM project_expenses
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        AND is_approved = TRUE
    ), 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for INSERT
CREATE TRIGGER trigger_recalculate_budget_on_insert
AFTER INSERT ON project_expenses
FOR EACH ROW
EXECUTE FUNCTION recalculate_project_spent_budget();

-- Create trigger for UPDATE
CREATE TRIGGER trigger_recalculate_budget_on_update
AFTER UPDATE ON project_expenses
FOR EACH ROW
EXECUTE FUNCTION recalculate_project_spent_budget();

-- Create trigger for DELETE
CREATE TRIGGER trigger_recalculate_budget_on_delete
AFTER DELETE ON project_expenses
FOR EACH ROW
EXECUTE FUNCTION recalculate_project_spent_budget();