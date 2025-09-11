import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  rate_limit_per_hour: number;
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiRequestLog {
  id: string;
  method: string;
  endpoint: string;
  status_code: number;
  response_time_ms?: number;
  created_at: string;
  user_agent?: string;
  ip_address?: string;
  error_message?: string;
}

export const useApiKeys = () => {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ApiKey[];
    }
  });
};

export const useApiRequestLogs = (apiKeyId?: string) => {
  return useQuery({
    queryKey: ['apiRequestLogs', apiKeyId],
    queryFn: async () => {
      let query = supabase
        .from('api_request_logs')
        .select('*');
      
      if (apiKeyId) {
        query = query.eq('api_key_id', apiKeyId);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as ApiRequestLog[];
    }
  });
};

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (keyData: {
      name: string;
      permissions: string[];
      rate_limit_per_hour: number;
      expires_at?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate a secure API key
      const apiKey = 'sk_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Generate key hash for storage
      const encoder = new TextEncoder();
      const keyData_encoded = encoder.encode(apiKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', keyData_encoded);
      const keyHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name: keyData.name,
          key_hash: keyHash,
          key_prefix: 'sk_' + apiKey.slice(3, 11),
          permissions: keyData.permissions,
          rate_limit_per_hour: keyData.rate_limit_per_hour,
          expires_at: keyData.expires_at || null,
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { ...data, api_key: apiKey }; // Return the key only on creation
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('Chiave API creata con successo');
      
      // Show the API key to the user (they won't see it again)
      toast.info(`Salva questa chiave: ${data.api_key}`, {
        duration: 10000,
        description: 'Non potrai rivederla di nuovo!'
      });
    },
    onError: (error) => {
      toast.error('Errore nella creazione della chiave API: ' + error.message);
    }
  });
};

export const useUpdateApiKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: {
      id: string;
      updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'rate_limit_per_hour' | 'is_active' | 'expires_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('Chiave API aggiornata con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'aggiornamento della chiave API: ' + error.message);
    }
  });
};

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('Chiave API eliminata con successo');
    },
    onError: (error) => {
      toast.error('Errore nell\'eliminazione della chiave API: ' + error.message);
    }
  });
};