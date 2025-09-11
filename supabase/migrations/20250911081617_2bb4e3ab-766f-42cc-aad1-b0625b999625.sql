-- Create bank statements table
CREATE TABLE public.bank_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'csv', 'xml', 'mt940')),
  file_size INTEGER NOT NULL,
  account_number TEXT,
  account_name TEXT,
  bank_name TEXT,
  statement_period_start DATE,
  statement_period_end DATE,
  opening_balance NUMERIC,
  closing_balance NUMERIC,
  total_transactions INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  parsed_data JSONB,
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank transactions table
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  reference_number TEXT,
  counterpart_account TEXT,
  counterpart_name TEXT,
  category TEXT,
  project_id UUID REFERENCES public.projects(id),
  expense_id UUID REFERENCES public.project_expenses(id),
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciliation_confidence NUMERIC CHECK (reconciliation_confidence >= 0 AND reconciliation_confidence <= 1),
  reconciliation_notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_statements
CREATE POLICY "Users can view their bank statements" 
ON public.bank_statements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their bank statements" 
ON public.bank_statements 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their bank statements" 
ON public.bank_statements 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their bank statements" 
ON public.bank_statements 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for bank_transactions
CREATE POLICY "Users can view transactions from their statements" 
ON public.bank_transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.bank_statements 
    WHERE bank_statements.id = bank_transactions.bank_statement_id 
    AND bank_statements.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create transactions for their statements" 
ON public.bank_transactions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bank_statements 
    WHERE bank_statements.id = bank_transactions.bank_statement_id 
    AND bank_statements.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update transactions from their statements" 
ON public.bank_transactions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.bank_statements 
    WHERE bank_statements.id = bank_transactions.bank_statement_id 
    AND bank_statements.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete transactions from their statements" 
ON public.bank_transactions 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.bank_statements 
    WHERE bank_statements.id = bank_transactions.bank_statement_id 
    AND bank_statements.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_bank_statements_user_id ON public.bank_statements(user_id);
CREATE INDEX idx_bank_statements_status ON public.bank_statements(status);
CREATE INDEX idx_bank_transactions_statement_id ON public.bank_transactions(bank_statement_id);
CREATE INDEX idx_bank_transactions_date ON public.bank_transactions(transaction_date);
CREATE INDEX idx_bank_transactions_reconciled ON public.bank_transactions(is_reconciled);
CREATE INDEX idx_bank_transactions_project_id ON public.bank_transactions(project_id);
CREATE INDEX idx_bank_transactions_expense_id ON public.bank_transactions(expense_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_bank_statements_updated_at
  BEFORE UPDATE ON public.bank_statements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_transactions_updated_at
  BEFORE UPDATE ON public.bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();