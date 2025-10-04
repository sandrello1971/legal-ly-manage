import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';

export interface Project {
  id: string;
  bando_id: string | null;
  title: string;
  cup_code?: string;
  description?: string;
  total_budget: number;
  allocated_budget: number;
  spent_budget: number;
  remaining_budget: number;
  start_date?: string;
  end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress_percentage: number;
  project_manager?: string;
  team_members?: string[];
  project_documents?: string[];
  notes?: string;
  risk_assessment?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useProjects = (bandoId?: string) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (bandoId) {
        query = query.eq('bando_id', bandoId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setProjects(data || []);
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i progetti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: Partial<Project>) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error: createError } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          created_by: user.id
        } as any)
        .select()
        .single();

      if (createError) throw createError;

      setProjects(prev => [data, ...prev]);
      
      toast({
        title: 'Successo',
        description: 'Progetto creato con successo',
      });

      return data;
    } catch (err: any) {
      console.error('Error creating project:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile creare il progetto',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateProject = async (id: string, projectData: Partial<Project>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProjects(prev => prev.map(project => 
        project.id === id ? data : project
      ));

      toast({
        title: 'Successo',
        description: 'Progetto aggiornato con successo',
      });

      return data;
    } catch (err: any) {
      console.error('Error updating project:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile aggiornare il progetto',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setProjects(prev => prev.filter(project => project.id !== id));

      toast({
        title: 'Successo',
        description: 'Progetto eliminato con successo',
      });
    } catch (err: any) {
      console.error('Error deleting project:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile eliminare il progetto',
        variant: 'destructive',
      });
      throw err;
    }
  };

  const getProjectById = async (id: string): Promise<Project | null> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error('Error fetching project:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [bandoId]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    getProjectById,
    refetch: fetchProjects
  };
};