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

      // Fetch all users with their roles
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Fetch user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine user data with roles
      const usersWithRoles = authUsers.users.map(authUser => {
        const userRole = userRoles?.find(ur => ur.user_id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          role: userRole?.role as AppRole || 'user'
        };
      });

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
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });

      if (error) throw error;

      // Set the user role after invitation
      if (data.user) {
        await updateUserRole(data.user.id, role, 'User invited');
      }

      await fetchUsers(); // Refresh the list

      toast({
        title: 'Successo',
        description: 'Invito inviato con successo',
      });

      return true;
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
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== userId));

      toast({
        title: 'Successo',
        description: 'Utente eliminato con successo',
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile eliminare l\'utente',
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