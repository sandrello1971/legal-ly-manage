-- Update function to use amount_spent instead of amount for calculating spent budget
CREATE OR REPLACE FUNCTION recalculate_project_spent_budget()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the spent_budget for the affected project using amount_spent
  UPDATE projects
  SET 
    spent_budget = COALESCE((
      SELECT SUM(COALESCE(amount_spent, 0))
      FROM project_expenses
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        AND is_approved = TRUE
    ), 0),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculate spent budget for all existing projects using amount_spent
UPDATE projects p
SET spent_budget = COALESCE((
  SELECT SUM(COALESCE(amount_spent, 0))
  FROM project_expenses
  WHERE project_id = p.id
    AND is_approved = TRUE
), 0),
updated_at = NOW();