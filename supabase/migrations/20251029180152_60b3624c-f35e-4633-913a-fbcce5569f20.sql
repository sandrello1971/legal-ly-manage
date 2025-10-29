-- Correct the expense amount to reflect only the portion allocated to this project
UPDATE project_expenses
SET amount = 700000.00,
    updated_at = NOW()
WHERE id = '40fa71c6-653f-41b1-8126-49172a6ff1d7';