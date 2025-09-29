-- Crea tabella per categorie di spesa configurabili
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  max_percentage INTEGER,
  max_amount NUMERIC,
  eligible_expenses TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all active expense categories" 
ON public.expense_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can create expense categories" 
ON public.expense_categories 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their expense categories" 
ON public.expense_categories 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their expense categories" 
ON public.expense_categories 
FOR DELETE 
USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories for Bando SI4.0 2025
INSERT INTO public.expense_categories (name, description, max_percentage, created_by) VALUES
('Consulenza', 'Consulenza erogata direttamente da fornitori qualificati su tecnologie 4.0', NULL, (SELECT id FROM auth.users LIMIT 1)),
('Formazione', 'Formazione specifica su tecnologie 4.0 con attestato di frequenza', NULL, (SELECT id FROM auth.users LIMIT 1)),
('Attrezzature tecnologiche', 'Investimenti in attrezzature tecnologiche e programmi informatici necessari al progetto', NULL, (SELECT id FROM auth.users LIMIT 1)),
('Ingegnerizzazione SW/HW', 'Servizi e tecnologie per ingegnerizzazione di software/hardware del progetto', NULL, (SELECT id FROM auth.users LIMIT 1)),
('Proprietà industriale', 'Spese per la tutela della proprietà industriale (brevetti, marchi, etc.)', NULL, (SELECT id FROM auth.users LIMIT 1)),
('Personale dedicato', 'Spese del personale aziendale dedicato esclusivamente al progetto', 30, (SELECT id FROM auth.users LIMIT 1));