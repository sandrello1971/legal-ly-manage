import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'manager' | 'accountant' | 'auditor';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  company: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  subscription?: any;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string, company?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  initialize: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  checkAccess: (allowedRoles: UserRole[]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: false,
  initialized: false,
  subscription: null,

  initialize: async () => {
    console.log('🚀 Auth initialization started');
    try {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', { event, hasSession: !!session, hasUser: !!session?.user });
        
        if (session?.user) {
          console.log('👤 User authenticated, fetching profile...');
          // Fetch user profile when session changes
          setTimeout(async () => {
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (error) {
                console.error('❌ Profile fetch error:', error);
              }
              
              console.log('📝 Profile fetched:', { hasProfile: !!profile });
              
              set({ 
                user: session.user, 
                session, 
                profile: profile as Profile || null 
              });
            } catch (error) {
              console.error('❌ Error fetching profile:', error);
              set({ 
                user: session.user, 
                session, 
                profile: null 
              });
            }
          }, 0);
        } else {
          console.log('🚪 User logged out');
          set({ user: null, session: null, profile: null });
        }
      });

      // THEN check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 Checking existing session:', { hasSession: !!session, hasUser: !!session?.user });
      
      if (session?.user) {
        try {
          // Fetch user profile
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (error) {
            console.error('❌ Profile init fetch error:', error);
          }
          
          console.log('📝 Initial profile fetched:', { hasProfile: !!profile });
          
          set({ 
            user: session.user, 
            session, 
            profile: profile as Profile || null, 
            initialized: true 
          });
        } catch (error) {
          console.error('❌ Error fetching profile during init:', error);
          set({ 
            user: session.user, 
            session, 
            profile: null, 
            initialized: true 
          });
        }
      } else {
        console.log('❌ No existing session found');
        set({ user: null, session: null, profile: null, initialized: true });
      }

      // Store subscription for cleanup
      set({ subscription });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, session: null, profile: null, initialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email: string, password: string, fullName?: string, company?: string) => {
    set({ loading: true });
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            company: company,
          }
        }
      });
      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: 'Errore inaspettato durante la registrazione' };
    } finally {
      set({ loading: false });
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true });
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: 'Errore durante il reset della password' };
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    set({ loading: true });
    try {
      const { user } = get();
      if (!user) return { error: 'User non autenticato' };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) return { error: error.message };

      // Update local profile
      const { profile } = get();
      if (profile) {
        set({ profile: { ...profile, ...updates } });
      }

      return {};
    } catch (error) {
      return { error: 'Errore durante l\'aggiornamento del profilo' };
    } finally {
      set({ loading: false });
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return { error: 'Errore durante il cambio password' };
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      const { subscription } = get();
      if (subscription) {
        subscription.unsubscribe();
      }
      await supabase.auth.signOut();
      set({ user: null, session: null, profile: null, subscription: null });
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      set({ loading: false });
    }
  },

  hasRole: (role: UserRole) => {
    const { profile } = get();
    return profile?.role === role;
  },

  checkAccess: (allowedRoles: UserRole[]) => {
    const { profile } = get();
    return profile ? allowedRoles.includes(profile.role) : false;
  },
}));