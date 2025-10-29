-- Add unique constraint to prevent duplicate invoices
-- Only applies when receipt_number is not null
CREATE UNIQUE INDEX unique_receipt_per_project 
ON project_expenses (receipt_number, supplier_name, project_id) 
WHERE receipt_number IS NOT NULL AND receipt_number != '';

-- Add a file_hash column to detect identical files even with different names
ALTER TABLE project_expenses 
ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- Add index on file_hash for quick lookups
CREATE INDEX IF NOT EXISTS idx_project_expenses_file_hash 
ON project_expenses(file_hash) 
WHERE file_hash IS NOT NULL;