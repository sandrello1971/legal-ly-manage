-- Add project_category column to store AI-classified project-specific categories
-- This preserves the exact category from the tender document without mapping

ALTER TABLE project_expenses
ADD COLUMN IF NOT EXISTS project_category TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_project_expenses_project_category
ON project_expenses(project_category);

-- Add comment to explain the purpose
COMMENT ON COLUMN project_expenses.project_category IS 
'Category specifica del progetto come classificata dalla AI (es: investimenti_materiali, investimenti_immateriali, consulenza). Il campo category rimane per compatibilità con lo schema standard.';