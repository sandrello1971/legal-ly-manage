import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';

export interface Expense {
  id: string;
  project_id: string;
  milestone_id?: string;
  category: 'personnel' | 'equipment' | 'materials' | 'services' | 'travel' | 'other';
  description: string;
  amount: number;
  expense_date: string;
  supplier_name?: string;
  receipt_number?: string;
  receipt_url?: string;
  is_approved?: boolean;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseUpload {
  file: File;
  projectId: string;
  milestoneId?: string;
  category?: string;
  confidence?: number;
  extractedData?: {
    description: string;
    amount: number;
    date: string;
    supplier?: string;
    receiptNumber?: string;
    invoiceType?: 'electronic' | 'traditional';
  };
  validation?: {
    projectCode?: {
      isValid: boolean;
      references?: string[];
      reasons?: string[];
    };
    bandoCoherence?: {
      isCoherent: boolean;
      coherenceScore?: number;
      reasons?: string[];
    };
    shouldApprove: boolean;
    reasons?: string[];
  };
}

export const useExpenses = (projectId?: string) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('project_expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setExpenses(data || []);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setError(err.message);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le spese',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createExpense = async (expenseData: Partial<Expense>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error: createError } = await supabase
        .from('project_expenses')
        .insert({
          ...expenseData,
          created_by: user.id
        } as any)
        .select()
        .single();

      if (createError) throw createError;

      setExpenses(prev => [data, ...prev]);
      
      toast({
        title: 'Successo',
        description: 'Spesa creata con successo',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating expense:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile creare la spesa',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateExpense = async (id: string, expenseData: Partial<Expense>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('project_expenses')
        .update(expenseData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setExpenses(prev => prev.map(expense => 
        expense.id === id ? data : expense
      ));

      toast({
        title: 'Successo',
        description: 'Spesa aggiornata con successo',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating expense:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile aggiornare la spesa',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('project_expenses')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setExpenses(prev => prev.filter(expense => expense.id !== id));

      toast({
        title: 'Successo',
        description: 'Spesa eliminata con successo',
      });
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile eliminare la spesa',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const approveExpense = async (id: string, notes?: string) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error: approveError } = await supabase
        .from('project_expenses')
        .update({
          is_approved: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes
        })
        .eq('id', id)
        .select()
        .single();

      if (approveError) throw approveError;

      setExpenses(prev => prev.map(expense => 
        expense.id === id ? data : expense
      ));

      toast({
        title: 'Successo',
        description: 'Spesa approvata con successo',
      });

      return data;
    } catch (err: any) {
      console.error('Error approving expense:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile approvare la spesa',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const rejectExpense = async (id: string, notes: string) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error: rejectError } = await supabase
        .from('project_expenses')
        .update({
          is_approved: false,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes
        })
        .eq('id', id)
        .select()
        .single();

      if (rejectError) throw rejectError;

      setExpenses(prev => prev.map(expense => 
        expense.id === id ? data : expense
      ));

      toast({
        title: 'Successo',
        description: 'Spesa rifiutata',
      });

      return data;
    } catch (err: any) {
      console.error('Error rejecting expense:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile rifiutare la spesa',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const processExpenseReceipt = async (formData: FormData): Promise<any> => {
    try {
      const { data, error } = await supabase.functions.invoke('process-expense-receipt', {
        body: formData
      });

      if (error) throw error;

      return data;
    } catch (err: any) {
      console.error('Error processing receipt:', err);
      toast({
        title: 'Errore',
        description: 'Impossibile processare la ricevuta',
        variant: 'destructive',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [projectId]);

  return {
    expenses,
    loading,
    error,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    rejectExpense,
    processExpenseReceipt,
    refetch: fetchExpenses
  };
};