import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Document {
  id: string;
  title: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  document_type?: string;
  status?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export const useDocuments = () => {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      console.log('📄 Fetching documents...');
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📄 Session check:', { hasSession: !!session, hasUser: !!session?.user });
      
      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_name, file_url, file_type, file_size, document_type, status, uploaded_by, created_at, updated_at')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Documents query error:', error);
        throw error;
      }
      
      console.log('📄 Documents fetched:', { count: data?.length || 0 });
      return data as Document[];
    }
  });
};