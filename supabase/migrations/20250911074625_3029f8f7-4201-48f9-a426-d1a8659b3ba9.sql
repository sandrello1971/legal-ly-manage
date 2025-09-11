-- Nuovo sistema completo di gestione documenti

-- Elimina la tabella documents esistente
DROP TABLE IF EXISTS public.documents CASCADE;

-- Crea enum per stati documento
CREATE TYPE document_status AS ENUM ('pending', 'approved', 'rejected', 'archived');

-- Crea enum per tipi documento
CREATE TYPE document_type AS ENUM ('invoice', 'contract', 'receipt', 'report', 'other');

-- Tabella fornitori
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  vat_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Italy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella categorie
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella tags
CREATE TABLE public.document_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6B7280',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabella documenti principale
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Metadati business
  document_type document_type DEFAULT 'other',
  category_id UUID REFERENCES public.categories(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  document_date DATE,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  invoice_number TEXT,
  notes TEXT,
  status document_status DEFAULT 'pending',
  
  -- Metadata sistema
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('italian', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, ''))
  ) STORED
);

-- Tabella di collegamento documenti-tags (many-to-many)
CREATE TABLE public.document_tag_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.document_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(document_id, tag_id)
);

-- Indici per performance
CREATE INDEX idx_documents_search ON public.documents USING gin(search_vector);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_category ON public.documents(category_id);
CREATE INDEX idx_documents_supplier ON public.documents(supplier_id);
CREATE INDEX idx_documents_date ON public.documents(document_date);
CREATE INDEX idx_documents_type ON public.documents(document_type);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);

-- Trigger per updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies

-- Suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers" ON public.suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage suppliers" ON public.suppliers
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories" ON public.categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage categories" ON public.categories
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Document Tags
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags" ON public.document_tags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage tags" ON public.document_tags
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their documents" ON public.documents
  FOR SELECT USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can create documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their documents" ON public.documents
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their documents" ON public.documents
  FOR DELETE USING (auth.uid() = uploaded_by);

-- Document Tag Relations
ALTER TABLE public.document_tag_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their document tags" ON public.document_tag_relations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.documents 
      WHERE documents.id = document_tag_relations.document_id 
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Storage Policies (aggiorna quelle esistenti)
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Inserisci categorie predefinite
INSERT INTO public.categories (name, description, color) VALUES
  ('Fatture', 'Fatture di acquisto e vendita', '#EF4444'),
  ('Contratti', 'Contratti e accordi', '#3B82F6'),
  ('Ricevute', 'Ricevute e scontrini', '#10B981'),
  ('Report', 'Report e documenti analitici', '#8B5CF6'),
  ('Documenti Legali', 'Documenti legali e normativi', '#F59E0B');

-- Inserisci tag predefiniti
INSERT INTO public.document_tags (name, color) VALUES
  ('Urgente', '#EF4444'),
  ('Da Verificare', '#F59E0B'),
  ('Completato', '#10B981'),
  ('In Lavorazione', '#3B82F6'),
  ('Archiviato', '#6B7280');