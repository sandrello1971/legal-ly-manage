-- Add parsed_data column to existing projects table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'parsed_data'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN parsed_data JSONB;
    END IF;
END $$;