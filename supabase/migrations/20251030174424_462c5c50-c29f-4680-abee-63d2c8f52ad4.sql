-- Enable RLS on bank_transactions table
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all bank transactions
CREATE POLICY "Users can view bank transactions"
ON bank_transactions
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert transactions
CREATE POLICY "Authenticated users can insert transactions"
ON bank_transactions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their transactions
CREATE POLICY "Users can update transactions"
ON bank_transactions
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Policy: Users can delete transactions
CREATE POLICY "Users can delete transactions"
ON bank_transactions
FOR DELETE
USING (auth.uid() IS NOT NULL);