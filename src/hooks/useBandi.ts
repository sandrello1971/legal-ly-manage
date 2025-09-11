import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';

export interface Bando {
  id: string;
  title: string;
  description?: string;
  total_amount?: number;
  application_deadline?: string;
  project_start_date?: string;
  project_end_date?: string;
  status: 'draft' | 'active' | 'expired' | 'completed';
  decree_file_url?: string;
  decree_file_name?: string;
  parsed_data?: any;
  eligibility_criteria?: string;
  evaluation_criteria?: string;
  required_documents?: string[];
  organization?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useBandi = () => {
  const [bandi, setBandi] = useState<Bando[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBandi = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('bandi')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setBandi(data || []);
    } catch (err: any) {
      console.error('Error fetching bandi:', err);
      setError(err.message);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i bandi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createBando = async (bandoData: Partial<Bando>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Convert empty date strings to null
      const processedData = {
        ...bandoData,
        application_deadline: bandoData.application_deadline === '' ? null : bandoData.application_deadline,
        project_start_date: bandoData.project_start_date === '' ? null : bandoData.project_start_date,
        project_end_date: bandoData.project_end_date === '' ? null : bandoData.project_end_date,
        created_by: user.id
      };

      const { data, error: createError } = await supabase
        .from('bandi')
        .insert(processedData as any)
        .select()
        .single();

      if (createError) throw createError;

      setBandi(prev => [data, ...prev]);
      
      toast({
        title: 'Successo',
        description: 'Bando creato con successo',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating bando:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile creare il bando',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateBando = async (id: string, bandoData: Partial<Bando>) => {
    try {
      // Convert empty date strings to null
      const processedData = {
        ...bandoData,
        application_deadline: bandoData.application_deadline === '' ? null : bandoData.application_deadline,
        project_start_date: bandoData.project_start_date === '' ? null : bandoData.project_start_date,
        project_end_date: bandoData.project_end_date === '' ? null : bandoData.project_end_date,
      };

      const { data, error: updateError } = await supabase
        .from('bandi')
        .update(processedData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setBandi(prev => prev.map(bando => 
        bando.id === id ? data : bando
      ));

      toast({
        title: 'Successo',
        description: 'Bando aggiornato con successo',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating bando:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile aggiornare il bando',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteBando = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('bandi')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setBandi(prev => prev.filter(bando => bando.id !== id));

      toast({
        title: 'Successo',
        description: 'Bando eliminato con successo',
      });
    } catch (err: any) {
      console.error('Error deleting bando:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile eliminare il bando',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const getBandoById = async (id: string): Promise<Bando | null> => {
    try {
      const { data, error } = await supabase
        .from('bandi')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching bando:', err);
      return null;
    }
  };

  const parsePdfDecreto = async (fileUrl: string, bandoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('parse-pdf-decreto', {
        body: { fileUrl, bandoId }
      });

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'PDF analizzato con successo',
      });

      // Refresh the bando data
      await fetchBandi();

      return data;
    } catch (err: any) {
      console.error('Error parsing PDF:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Errore durante l\'analisi del PDF',
        variant: 'destructive',
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchBandi();
  }, []);

  return {
    bandi,
    loading,
    error,
    createBando,
    updateBando,
    deleteBando,
    getBandoById,
    parsePdfDecreto,
    refetch: fetchBandi
  };
};