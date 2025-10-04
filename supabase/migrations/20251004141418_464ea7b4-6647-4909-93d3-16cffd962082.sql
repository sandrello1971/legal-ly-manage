-- Add CUP code field to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS cup_code TEXT;

-- Add index for faster lookups by CUP code
CREATE INDEX IF NOT EXISTS idx_projects_cup_code ON public.projects(cup_code);

-- Add comment to explain the column
COMMENT ON COLUMN public.projects.cup_code IS 'Codice Unico di Progetto (CUP) - required for expense association';