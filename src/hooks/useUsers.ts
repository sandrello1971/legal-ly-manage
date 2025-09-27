import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';

export type AppRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  role?: AppRole;
  user_roles?: { role: AppRole }[];
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user roles and basic user info from user_roles table
      // We join with auth.users using RPC to get email information
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at
        `);

      if (rolesError) throw rolesError;

      // Transform the data - we can't directly access auth.users email 
      // so we'll use a different approach for user management
      const usersWithRoles = userRoles?.map(userRole => ({
        id: userRole.user_id,
        email: `user-${userRole.user_id.substring(0, 8)}@domain.com`, // Placeholder
        created_at: userRole.created_at,
        role: userRole.role as AppRole
      })) || [];

      setUsers(usersWithRoles);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare gli utenti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: AppRole, changeReason?: string) => {
    try {
      const { error } = await supabase.rpc('update_user_role_secure', {
        p_target_user_id: userId,
        p_new_role: newRole,
        p_change_reason: changeReason
      });

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: 'Successo',
        description: 'Ruolo utente aggiornato con successo',
      });

      return true;
    } catch (err: any) {
      console.error('Error updating user role:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile aggiornare il ruolo utente',
        variant: 'destructive',
      });
      return false;
    }
  };

  const inviteUser = async (email: string, role: AppRole = 'user') => {
    try {
      // For now, we'll create a simple invitation system
      // In a real application, you'd send an actual email invitation
      toast({
        title: 'Funzionalità in sviluppo',
        description: 'L\'invito utenti sarà disponibile presto. Per ora, gli utenti devono registrarsi autonomamente.',
      });

      return false;
    } catch (err: any) {
      console.error('Error inviting user:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile inviare l\'invito',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Instead of deleting the auth user, we'll just remove their role
      // This effectively deactivates them from the system
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));

      toast({
        title: 'Successo',
        description: 'Utente disattivato con successo',
      });

      return true;
    } catch (err: any) {
      console.error('Error deactivating user:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile disattivare l\'utente',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    updateUserRole,
    inviteUser,
    deleteUser
  };
};