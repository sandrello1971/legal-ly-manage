
-- Force recalculation of spent_budget for all existing approved expenses
-- by triggering the UPDATE trigger
UPDATE project_expenses 
SET updated_at = NOW() 
WHERE is_approved = TRUE;
