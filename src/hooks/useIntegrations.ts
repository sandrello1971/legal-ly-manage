import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Integration {
  id: string;
  name: string;
  type: 'erp' | 'bank_psd2' | 'docusign' | 'email' | 'custom';
  provider: string;
  configuration: any;
  credentials?: any;
  webhook_url?: string;
  is_active: boolean;
  last_sync_at?: string;
  sync_status: 'idle' | 'syncing' | 'error' | 'success';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSyncLog {
  id: string;
  integration_id: string;
  sync_type: string;
  status: 'success' | 'error' | 'partial';
  records_processed: number;
  records_failed: number;
  sync_duration_ms?: number;
  error_details?: any;
  created_at: string;
}

export const useIntegrations = () => {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Integration[];
    }
  });
};

export const useIntegrationSyncLogs = (integrationId?: string) => {
  return useQuery({
    queryKey: ['integrationSyncLogs', integrationId],
    queryFn: async () => {
      let query = supabase
        .from('integration_sync_logs')
        .select('*');
      
      if (integrationId) {
        query = query.eq('integration_id', integrationId);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as IntegrationSyncLog[];
    }
  });
};

export const useCreateIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (integration: Omit<Integration, 'id' | 'created_at' | 'updated_at' | 'last_sync_at' | 'sync_status' | 'error_message'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('integrations')
        .insert({
          user_id: user.id,
          name: integration.name,
          type: integration.type,
          provider: integration.provider,
          configuration: integration.configuration,
          credentials: integration.credentials,
          webhook_url: integration.webhook_url,
          is_active: integration.is_active,
          sync_status: 'idle'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integrazione creata con successo');
    },
    onError: (error) => {
      toast.error('Errore nella creazione dell\'integrazione: ' + error.message);
    }
  });
};

export const useUpdateIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<Omit<Integration, 'id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integrazione aggiornata con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'aggiornamento dell\'integrazione: ' + error.message);
    }
  });
};

export const useDeleteIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integrazione eliminata con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'eliminazione dell\'integrazione: ' + error.message);
    }
  });
};

export const useTestIntegration = () => {
  return useMutation({
    mutationFn: async (integrationId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('integration-hub', {
        body: {
          action: 'test_connection',
          integration_id: integrationId,
          data: {}
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Test di connessione riuscito');
      } else {
        toast.error('Test di connessione fallito: ' + data.error);
      }
    },
    onError: (error) => {
      toast.error('Errore nel test dell\'integrazione: ' + error.message);
    }
  });
};

export const useSyncIntegration = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ integrationId, action, data }: {
      integrationId: string;
      action: string;
      data?: any;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('integration-hub', {
        body: {
          action,
          integration_id: integrationId,
          data: data || {}
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integrationSyncLogs'] });
      
      if (data.success) {
        toast.success(`Sincronizzazione completata: ${variables.action}`);
      } else {
        toast.error(`Sincronizzazione fallita: ${data.error}`);
      }
    },
    onError: (error) => {
      toast.error('Errore nella sincronizzazione: ' + error.message);
    }
  });
};

// Utility functions for integration types
export const getIntegrationTypeLabel = (type: Integration['type']): string => {
  const labels: Record<Integration['type'], string> = {
    erp: 'ERP System',
    bank_psd2: 'Banking PSD2',
    docusign: 'DocuSign',
    email: 'Email Service',
    custom: 'Custom Integration'
  };
  return labels[type] || type;
};

export const getIntegrationProviders = (type: Integration['type']): string[] => {
  const providers: Record<Integration['type'], string[]> = {
    erp: ['SAP', 'Oracle', 'Microsoft Dynamics', 'NetSuite', 'Custom'],
    bank_psd2: ['ING', 'UniCredit', 'Intesa Sanpaolo', 'BPER', 'Custom'],
    docusign: ['DocuSign', 'Adobe Sign', 'HelloSign'],
    email: ['Resend', 'SendGrid', 'Mailgun', 'AWS SES'],
    custom: ['REST API', 'GraphQL', 'SOAP', 'Custom']
  };
  return providers[type] || [];
};

export const getIntegrationActions = (type: Integration['type']): string[] => {
  const actions: Record<Integration['type'], string[]> = {
    erp: ['sync_customers', 'sync_invoices', 'sync_products'],
    bank_psd2: ['get_accounts', 'get_transactions', 'get_balance'],
    docusign: ['send_envelope', 'get_envelope_status', 'download_document'],
    email: ['send_email', 'get_templates'],
    custom: ['custom_sync', 'custom_action']
  };
  return actions[type] || [];
};