import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ComplianceChecklist {
  id: string;
  name: string;
  description?: string;
  regulation_reference: string;
  requirements: any[];
  mandatory_fields: string[];
  document_types: string[];
  retention_min_months?: number;
  retention_max_months?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentCompliance {
  id: string;
  document_id: string;
  checklist_id: string;
  compliance_status: 'compliant' | 'non_compliant' | 'pending' | 'review_required';
  compliance_score?: number;
  requirements_met: any[];
  requirements_failed: any[];
  notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  next_review_date?: string;
  created_at: string;
  updated_at: string;
  compliance_checklists?: ComplianceChecklist;
  documents?: any;
}

export const useComplianceChecklists = () => {
  return useQuery({
    queryKey: ['complianceChecklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_checklists')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ComplianceChecklist[];
    }
  });
};

export const useDocumentCompliance = (documentId?: string) => {
  return useQuery({
    queryKey: ['documentCompliance', documentId],
    queryFn: async () => {
      let query = supabase
        .from('document_compliance')
        .select(`
          *,
          compliance_checklists(id, name, regulation_reference, requirements),
          documents(id, title, file_name)
        `);
      
      if (documentId) {
        query = query.eq('document_id', documentId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DocumentCompliance[];
    }
  });
};

export const useComplianceSummary = () => {
  return useQuery({
    queryKey: ['complianceSummary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_compliance')
        .select(`
          compliance_status,
          compliance_score,
          documents!inner(uploaded_by)
        `);
      
      if (error) throw error;
      
      const summary = {
        total: data.length,
        compliant: data.filter(item => item.compliance_status === 'compliant').length,
        non_compliant: data.filter(item => item.compliance_status === 'non_compliant').length,
        pending: data.filter(item => item.compliance_status === 'pending').length,
        review_required: data.filter(item => item.compliance_status === 'review_required').length,
        average_score: data.length > 0 ? 
          data.reduce((sum, item) => sum + (item.compliance_score || 0), 0) / data.length : 0
      };
      
      return summary;
    }
  });
};

export const useCreateComplianceChecklist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (checklist: Omit<ComplianceChecklist, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('compliance_checklists')
        .insert({
          ...checklist,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceChecklists'] });
      toast.success('Checklist di conformità creata con successo');
    },
    onError: (error) => {
      toast.error('Errore nella creazione della checklist: ' + error.message);
    }
  });
};

export const useCreateDocumentCompliance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (compliance: Omit<DocumentCompliance, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('document_compliance')
        .insert(compliance)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentCompliance'] });
      queryClient.invalidateQueries({ queryKey: ['complianceSummary'] });
      toast.success('Stato di conformità aggiornato con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'aggiornamento della conformità: ' + error.message);
    }
  });
};

export const useUpdateDocumentCompliance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DocumentCompliance> }) => {
      const { data, error } = await supabase
        .from('document_compliance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentCompliance'] });
      queryClient.invalidateQueries({ queryKey: ['complianceSummary'] });
      toast.success('Conformità aggiornata con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'aggiornamento: ' + error.message);
    }
  });
};

export const useExportCertifiedCopy = () => {
  return useMutation({
    mutationFn: async ({ 
      documentId, 
      includeTimestamps = true, 
      includeCompliance = true 
    }: {
      documentId: string;
      includeTimestamps?: boolean;
      includeCompliance?: boolean;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('compliance-export', {
        body: {
          action: 'export_certified_copy',
          documentId,
          includeTimestamps,
          includeCompliance
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast.success('Copia certificata generata con successo');
    },
    onError: (error) => {
      toast.error('Errore nella generazione della copia certificata: ' + error.message);
    }
  });
};

export const useExportComplianceReport = () => {
  return useMutation({
    mutationFn: async ({
      dateFrom,
      dateTo,
      complianceStatus,
      regulations
    }: {
      dateFrom?: string;
      dateTo?: string;
      complianceStatus?: string[];
      regulations?: string[];
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('compliance-export', {
        body: {
          action: 'export_compliance_report',
          dateFrom,
          dateTo,
          complianceStatus,
          regulations
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast.success('Report di conformità generato con successo');
    },
    onError: (error) => {
      toast.error('Errore nella generazione del report: ' + error.message);
    }
  });
};

// Utility function to calculate compliance score
export const calculateComplianceScore = (requirementsMet: any[], totalRequirements: number): number => {
  if (totalRequirements === 0) return 100;
  return Math.round((requirementsMet.length / totalRequirements) * 100);
};

// Utility function to determine compliance status
export const determineComplianceStatus = (score: number): DocumentCompliance['compliance_status'] => {
  if (score >= 95) return 'compliant';
  if (score >= 80) return 'review_required';
  if (score >= 50) return 'pending';
  return 'non_compliant';
};