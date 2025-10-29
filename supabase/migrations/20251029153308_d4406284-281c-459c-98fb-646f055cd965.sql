-- Forza il ricalcolo del budget speso per tutti i progetti
UPDATE projects
SET spent_budget = COALESCE((
  SELECT SUM(COALESCE(amount_spent, 0))
  FROM project_expenses
  WHERE project_expenses.project_id = projects.id
    AND is_approved = TRUE
), 0)
WHERE id IN (
  SELECT DISTINCT project_id 
  FROM project_expenses 
  WHERE project_id IS NOT NULL
);