-- Force recalculation of spent_budget for all projects
UPDATE projects p
SET spent_budget = COALESCE((
  SELECT SUM(COALESCE(amount_spent, 0))
  FROM project_expenses
  WHERE project_id = p.id
    AND is_approved = TRUE
), 0),
updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT project_id 
  FROM project_expenses 
  WHERE is_approved = TRUE
);