import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WebhookSubscription {
  id: string;
  name: string;
  endpoint_url: string;
  events: string[];
  is_active: boolean;
  max_retries: number;
  retry_delay_seconds: number;
  last_delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  subscription_id: string;
  event_type: string;
  event_data: any;
  delivery_attempts: number;
  last_attempt_at?: string;
  last_response_status?: number;
  last_response_body?: string;
  delivered_at?: string;
  failed_at?: string;
  next_retry_at?: string;
  created_at: string;
}

export const useWebhookSubscriptions = () => {
  return useQuery({
    queryKey: ['webhookSubscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WebhookSubscription[];
    }
  });
};

export const useWebhookEvents = (subscriptionId?: string) => {
  return useQuery({
    queryKey: ['webhookEvents', subscriptionId],
    queryFn: async () => {
      let query = supabase
        .from('webhook_events')
        .select('*');
      
      if (subscriptionId) {
        query = query.eq('subscription_id', subscriptionId);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as WebhookEvent[];
    }
  });
};

export const useCreateWebhookSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subscription: Omit<WebhookSubscription, 'id' | 'created_at' | 'updated_at' | 'last_delivered_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate a secure secret key for webhook signature
      const secretKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .insert({
          user_id: user.id,
          name: subscription.name,
          endpoint_url: subscription.endpoint_url,
          events: subscription.events,
          secret_key: secretKey,
          is_active: subscription.is_active,
          max_retries: subscription.max_retries,
          retry_delay_seconds: subscription.retry_delay_seconds
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { ...data, secret_key: secretKey }; // Return secret only on creation
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['webhookSubscriptions'] });
      toast.success('Sottoscrizione webhook creata con successo');
      
      // Show the secret key to the user
      toast.info(`Secret key: ${data.secret_key}`, {
        duration: 10000,
        description: 'Salva questa chiave per la verifica delle firme!'
      });
    },
    onError: (error) => {
      toast.error('Errore nella creazione della sottoscrizione webhook: ' + error.message);
    }
  });
};

export const useUpdateWebhookSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<Omit<WebhookSubscription, 'id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookSubscriptions'] });
      toast.success('Sottoscrizione webhook aggiornata con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'aggiornamento della sottoscrizione webhook: ' + error.message);
    }
  });
};

export const useDeleteWebhookSubscription = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookSubscriptions'] });
      toast.success('Sottoscrizione webhook eliminata con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'eliminazione della sottoscrizione webhook: ' + error.message);
    }
  });
};

export const useTriggerWebhook = () => {
  return useMutation({
    mutationFn: async ({ eventType, data, userId }: {
      eventType: string;
      data: any;
      userId?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('webhook-manager', {
        body: {
          action: 'trigger',
          event_type: eventType,
          data,
          user_id: userId || session.user.id
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Webhook triggered: ${data.events_created} eventi creati`);
    },
    onError: (error) => {
      toast.error('Errore nel trigger del webhook: ' + error.message);
    }
  });
};

export const useProcessWebhookRetries = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');
      
      const response = await supabase.functions.invoke('webhook-manager', {
        body: { action: 'process_retries' }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookEvents'] });
      toast.success('Coda retry processata con successo');
    },
    onError: (error) => {
      toast.error('Errore nel processare i retry: ' + error.message);
    }
  });
};

// Available webhook event types
export const WEBHOOK_EVENT_TYPES = [
  'document.created',
  'document.updated',
  'document.deleted',
  'expense.created',
  'expense.approved',
  'expense.rejected',
  'project.created',
  'project.updated',
  'project.completed',
  'integration.synced',
  'integration.failed',
  'compliance.checked',
  'archive.created',
  'archive.sealed'
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENT_TYPES[number];

export const getEventTypeDescription = (eventType: string): string => {
  const descriptions: Record<string, string> = {
    'document.created': 'Documento creato',
    'document.updated': 'Documento aggiornato',
    'document.deleted': 'Documento eliminato',
    'expense.created': 'Spesa creata',
    'expense.approved': 'Spesa approvata',
    'expense.rejected': 'Spesa rigettata',
    'project.created': 'Progetto creato',
    'project.updated': 'Progetto aggiornato',
    'project.completed': 'Progetto completato',
    'integration.synced': 'Integrazione sincronizzata',
    'integration.failed': 'Integrazione fallita',
    'compliance.checked': 'Conformità verificata',
    'archive.created': 'Archivio creato',
    'archive.sealed': 'Archivio sigillato'
  };
  return descriptions[eventType] || eventType;
};

export const getDeliveryStatusLabel = (event: WebhookEvent): string => {
  if (event.delivered_at) return 'Consegnato';
  if (event.failed_at) return 'Fallito';
  if (event.next_retry_at) return 'In retry';
  return 'Pending';
};

export const getDeliveryStatusColor = (event: WebhookEvent): string => {
  if (event.delivered_at) return 'text-green-600';
  if (event.failed_at) return 'text-red-600';
  if (event.next_retry_at) return 'text-yellow-600';
  return 'text-blue-600';
};