-- Function to update project spent budget
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for INSERT
DROP TRIGGER IF EXISTS trigger_update_project_spent_on_insert ON project_expenses;
CREATE TRIGGER trigger_update_project_spent_on_insert
  AFTER INSERT ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_spent_budget();

-- Trigger for UPDATE
DROP TRIGGER IF EXISTS trigger_update_project_spent_on_update ON project_expenses;
CREATE TRIGGER trigger_update_project_spent_on_update
  AFTER UPDATE OF amount, is_approved, project_id ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_spent_budget();

-- Trigger for DELETE
DROP TRIGGER IF EXISTS trigger_update_project_spent_on_delete ON project_expenses;
CREATE TRIGGER trigger_update_project_spent_on_delete
  AFTER DELETE ON project_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_spent_budget();

-- Update all existing projects with current spent amounts
UPDATE projects
SET 
  spent_budget = COALESCE((
    SELECT SUM(amount)
    FROM project_expenses
    WHERE project_expenses.project_id = projects.id
      AND is_approved = true
  ), 0),
  updated_at = now();