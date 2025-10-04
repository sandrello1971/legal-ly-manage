-- Function to recalculate project spent budget
CREATE OR REPLACE FUNCTION recalculate_project_spent_budget()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the spent_budget for the affected project
  UPDATE projects
  SET 
    spent_budget = COALESCE((
      SELECT SUM(amount)
      FROM project_expenses
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        AND is_approved = TRUE
    ), 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_recalculate_spent_budget ON project_expenses;

-- Create trigger on project_expenses
CREATE TRIGGER trigger_recalculate_spent_budget
  AFTER INSERT OR UPDATE OR DELETE ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_project_spent_budget();

-- Recalculate spent budget for all existing projects
UPDATE projects p
SET spent_budget = COALESCE((
  SELECT SUM(amount)
  FROM project_expenses
  WHERE project_id = p.id
    AND is_approved = TRUE
), 0),
updated_at = NOW();