import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ArchivePolicy {
  id: string;
  name: string;
  description?: string;
  retention_period_months: number;
  auto_seal_enabled: boolean;
  legal_requirement?: string;
  document_types: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentArchive {
  id: string;
  document_id: string;
  archive_policy_id: string;
  original_hash: string;
  archived_hash: string;
  digital_signature?: any;
  timestamp_info: any;
  sealed_at?: string;
  retention_expires_at: string;
  archive_path: string;
  file_size: number;
  compression_ratio?: number;
  archived_by: string;
  created_at: string;
  updated_at: string;
  archive_policies?: ArchivePolicy;
  documents?: any;
}

export interface DigitalTimestamp {
  id: string;
  document_id?: string;
  archive_id?: string;
  hash_algorithm: string;
  document_hash: string;
  timestamp_hash: string;
  digital_signature?: string;
  timestamp_authority?: string;
  timestamp_token?: any;
  verification_data?: any;
  created_by: string;
  created_at: string;
}

export const useArchivePolicies = () => {
  return useQuery({
    queryKey: ['archivePolicies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('archive_policies')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ArchivePolicy[];
    }
  });
};

export const useDocumentArchives = (documentId?: string) => {
  return useQuery({
    queryKey: ['documentArchives', documentId],
    queryFn: async () => {
      let query = supabase
        .from('document_archives')
        .select('*');
      
      if (documentId) {
        query = query.eq('document_id', documentId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });
};

export const useDigitalTimestamps = (documentId?: string, archiveId?: string) => {
  return useQuery({
    queryKey: ['digitalTimestamps', documentId, archiveId],
    queryFn: async () => {
      let query = supabase.from('digital_timestamps').select('*');
      
      if (documentId) {
        query = query.eq('document_id', documentId);
      }
      if (archiveId) {
        query = query.eq('archive_id', archiveId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as DigitalTimestamp[];
    },
    enabled: !!(documentId || archiveId)
  });
};

export const useCreateArchivePolicy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (policy: Omit<ArchivePolicy, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('archive_policies')
        .insert({
          ...policy,
          created_by: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archivePolicies'] });
      toast.success('Politica di archiviazione creata con successo');
    },
    onError: (error) => {
      toast.error('Errore nella creazione della politica: ' + error.message);
    }
  });
};

export const useCreateArchive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ documentId, policyId, fileData }: {
      documentId: string;
      policyId: string;
      fileData: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('archive-manager', {
        body: {
          action: 'create_archive',
          documentId,
          policyId,
          fileData
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentArchives'] });
      toast.success('Archivio creato con successo');
    },
    onError: (error) => {
      toast.error('Errore nella creazione dell\'archivio: ' + error.message);
    }
  });
};

export const useCreateTimestamp = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ documentId, archiveId, fileContent, algorithm = 'SHA-256' }: {
      documentId?: string;
      archiveId?: string;
      fileContent: string;
      algorithm?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('digital-timestamping', {
        body: {
          action: 'create_timestamp',
          documentId,
          archiveId,
          fileContent,
          algorithm
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digitalTimestamps'] });
      toast.success('Timestamp digitale creato con successo');
    },
    onError: (error) => {
      toast.error('Errore nella creazione del timestamp: ' + error.message);
    }
  });
};

export const useSealArchive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (archiveId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('archive-manager', {
        body: {
          action: 'seal_archive',
          archiveId
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentArchives'] });
      toast.success('Archivio sigillato con successo');
    },
    onError: (error) => {
      toast.error('Errore nel sigillo dell\'archivio: ' + error.message);
    }
  });
};

export const useVerifyTimestamp = () => {
  return useMutation({
    mutationFn: async (timestampId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('digital-timestamping', {
        body: {
          action: 'verify_timestamp',
          timestampId
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast.success('Verifica timestamp completata');
    },
    onError: (error) => {
      toast.error('Errore nella verifica del timestamp: ' + error.message);
    }
  });
};