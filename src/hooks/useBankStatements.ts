import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BankStatement {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: 'pdf' | 'csv' | 'xml' | 'mt940';
  file_size: number;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
  statement_period_start?: string;
  statement_period_end?: string;
  opening_balance?: number;
  closing_balance?: number;
  total_transactions: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  parsed_data?: any;
  processing_error?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  bank_statement_id: string;
  transaction_date: string;
  value_date?: string;
  description: string;
  amount: number;
  currency: string;
  transaction_type: 'debit' | 'credit';
  reference_number?: string;
  counterpart_account?: string;
  counterpart_name?: string;
  category?: string;
  project_id?: string;
  expense_id?: string;
  is_reconciled: boolean;
  reconciliation_confidence?: number;
  reconciliation_notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export function useBankStatements() {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  const fetchStatements = async () => {
    if (isFetching) return;
    
    try {
      setIsFetching(true);
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('bank_statements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStatements((data || []) as BankStatement[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bank statements';
      setError(errorMessage);
      console.error('Error fetching bank statements:', err);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const fetchTransactions = async (statementId?: string) => {
    if (isFetching) return;
    
    try {
      setIsFetching(true);
      setLoading(true);
      setError(null);

      let query = supabase
        .from('bank_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (statementId) {
        query = query.eq('bank_statement_id', statementId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions((data || []) as BankTransaction[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const uploadStatement = async (file: File): Promise<string> => {
    try {
      setLoading(true);
      setError(null);

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `bank-statements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create bank statement record
      const { data, error } = await supabase
        .from('bank_statements')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id!,
          file_name: file.name,
          file_url: publicUrl,
          file_type: fileExt as any,
          file_size: file.size,
          status: 'pending',
          total_transactions: 0
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Statement uploaded",
        description: "Bank statement uploaded successfully. Processing will begin shortly.",
      });

      await fetchStatements();
      return data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload statement';
      setError(errorMessage);
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const processStatement = async (statementId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Starting to process statement:', statementId);

      // Update status to processing
      await supabase
        .from('bank_statements')
        .update({ status: 'processing' })
        .eq('id', statementId);

      // Get statement details
      const { data: statement, error: fetchError } = await supabase
        .from('bank_statements')
        .select('*')
        .eq('id', statementId)
        .single();

      if (fetchError) {
        console.error('Error fetching statement:', fetchError);
        throw fetchError;
      }

      console.log('Calling parse-bank-statement edge function with:', {
        fileUrl: statement.file_url,
        fileName: statement.file_name,
        fileType: statement.file_type
      });

      // Call edge function to parse the statement
      const { data: parseResult, error: parseError } = await supabase.functions.invoke('parse-bank-statement', {
        body: {
          fileUrl: statement.file_url,
          fileName: statement.file_name,
          fileType: statement.file_type
        }
      });

      console.log('Parse result:', parseResult);
      console.log('Parse error:', parseError);

      if (parseError) throw parseError;

      if (parseResult.error) {
        // Update statement with error
        await supabase
          .from('bank_statements')
          .update({ 
            status: 'error',
            processing_error: parseResult.error
          })
          .eq('id', statementId);

        throw new Error(parseResult.error);
      }

      // Update statement with parsed data
      await supabase
        .from('bank_statements')
        .update({
          status: 'completed',
          parsed_data: parseResult,
          account_number: parseResult.account_info?.account_number,
          account_name: parseResult.account_info?.account_name,
          bank_name: parseResult.account_info?.bank_name,
          statement_period_start: parseResult.statement_period?.start,
          statement_period_end: parseResult.statement_period?.end,
          total_transactions: parseResult.total_transactions || 0
        })
        .eq('id', statementId);

      // Insert transactions
      if (parseResult.transactions && parseResult.transactions.length > 0) {
        const transactionsToInsert = parseResult.transactions.map((t: any) => ({
          bank_statement_id: statementId,
          transaction_date: t.transaction_date,
          value_date: t.value_date,
          description: t.description,
          amount: t.amount,
          currency: t.currency || 'EUR',
          transaction_type: t.transaction_type,
          reference_number: t.reference_number,
          counterpart_account: t.counterpart_account,
          counterpart_name: t.counterpart_name,
          category: t.category,
          tags: t.tags || []
        }));

        const { error: insertError } = await supabase
          .from('bank_transactions')
          .insert(transactionsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Processing complete",
        description: `Successfully processed ${parseResult.total_transactions || 0} transactions.`,
      });

      await fetchStatements();
      await fetchTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process statement';
      setError(errorMessage);
      
      // Update statement status to error
      await supabase
        .from('bank_statements')
        .update({ 
          status: 'error',
          processing_error: errorMessage
        })
        .eq('id', statementId);

      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTransaction = async (transactionId: string, updates: Partial<BankTransaction>) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('bank_transactions')
        .update(updates)
        .eq('id', transactionId);

      if (error) throw error;

      // Update local state
      setTransactions(prev => 
        prev.map(t => t.id === transactionId ? { ...t, ...updates } : t)
      );

      toast({
        title: "Transaction updated",
        description: "Transaction updated successfully.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
      setError(errorMessage);
      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const reconcileTransaction = async (
    transactionId: string, 
    expenseId: string, 
    confidence: number,
    notes?: string
  ) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('bank_transactions')
        .update({
          expense_id: expenseId,
          is_reconciled: true,
          reconciliation_confidence: confidence,
          reconciliation_notes: notes
        })
        .eq('id', transactionId);

      if (error) throw error;

      // Update local state
      setTransactions(prev => 
        prev.map(t => t.id === transactionId ? { 
          ...t, 
          expense_id: expenseId,
          is_reconciled: true,
          reconciliation_confidence: confidence,
          reconciliation_notes: notes
        } : t)
      );

      toast({
        title: "Transaction reconciled",
        description: "Transaction successfully reconciled with expense.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reconcile transaction';
      setError(errorMessage);
      toast({
        title: "Reconciliation failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const deleteStatement = async (statementId: string) => {
    try {
      setError(null);

      const { error } = await supabase
        .from('bank_statements')
        .delete()
        .eq('id', statementId);

      if (error) throw error;

      setStatements(prev => prev.filter(s => s.id !== statementId));
      setTransactions(prev => prev.filter(t => t.bank_statement_id !== statementId));

      toast({
        title: "Statement deleted",
        description: "Bank statement and associated transactions deleted successfully.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete statement';
      setError(errorMessage);
      toast({
        title: "Delete failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchStatements();
    fetchTransactions();
  }, []);

  return {
    statements,
    transactions,
    loading,
    error,
    uploadStatement,
    processStatement,
    updateTransaction,
    reconcileTransaction,
    deleteStatement,
    fetchStatements,
    fetchTransactions,
    refetch: () => {
      fetchStatements();
      fetchTransactions();
    }
  };
}