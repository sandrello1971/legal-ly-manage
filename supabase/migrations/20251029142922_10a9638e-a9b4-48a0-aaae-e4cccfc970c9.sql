-- Add amount_spent field to project_expenses to track actual spending vs allocated budget
ALTER TABLE project_expenses 
ADD COLUMN amount_spent numeric DEFAULT 0;

COMMENT ON COLUMN project_expenses.amount_spent IS 'Importo effettivamente speso (può essere diverso dall''importo allocato)';

-- Update existing approved expenses to have amount_spent = amount by default
UPDATE project_expenses 
SET amount_spent = amount 
WHERE is_approved = true AND amount_spent IS NULL;