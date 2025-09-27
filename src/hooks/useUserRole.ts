import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';

export type AppRole = 'admin' | 'user';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUserRole = async () => {
    if (!user) {
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Se non trova il ruolo, assegna 'user' di default
        if (error.code === 'PGRST116') {
          setUserRole('user');
        } else {
          console.error('Error fetching user role:', error);
          setUserRole('user');
        }
      } else {
        setUserRole(data.role as AppRole);
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setUserRole('user');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = () => userRole === 'admin';
  const isUser = () => userRole === 'user';

  const hasPermission = (requiredRole: AppRole) => {
    if (!userRole) return false;
    
    // Admin has access to everything
    if (userRole === 'admin') return true;
    
    // User has access only to user-level features
    if (userRole === 'user' && requiredRole === 'user') return true;
    
    return false;
  };

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  return {
    userRole,
    loading,
    isAdmin,
    isUser,
    hasPermission,
    refetch: fetchUserRole
  };
};