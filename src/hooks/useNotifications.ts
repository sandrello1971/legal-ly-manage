import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'expense_processed' | 'expense_approved' | 'expense_rejected' | 'statement_processed' | 'reconciliation_completed' | 'project_deadline' | 'budget_alert' | 'system_alert' | 'anomaly_detected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data?: any;
  is_read: boolean;
  is_archived: boolean;
  read_at?: string;
  expires_at?: string;
  action_url?: string;
  action_label?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  email_types: string[];
  push_types: string[];
  created_at: string;
  updated_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchNotifications = async (filters?: {
    type?: string;
    priority?: string;
    is_read?: boolean;
    is_archived?: boolean;
  }) => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type) {
        query = query.eq('type', filters.type as any);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority as any);
      }
      if (filters?.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read);
      }
      if (filters?.is_archived !== undefined) {
        query = query.eq('is_archived', filters.is_archived);
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications';
      setError(errorMessage);
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read';
      setError(errorMessage);
      console.error('Error marking notification as read:', err);
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: false, 
          read_at: null 
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: false, read_at: undefined }
            : n
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as unread';
      setError(errorMessage);
      console.error('Error marking notification as unread:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.is_read && !n.is_archived)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          unreadIds.includes(n.id)
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );

      toast({
        title: "Success",
        description: `Marked ${unreadIds.length} notifications as read`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all as read';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_archived: true }
            : n
        )
      );

      toast({
        title: "Archived",
        description: "Notification archived successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive notification';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const unarchiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: false })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_archived: false }
            : n
        )
      );

      toast({
        title: "Unarchived",
        description: "Notification restored successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unarchive notification';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      toast({
        title: "Deleted",
        description: "Notification deleted successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const createNotification = async (notification: Partial<Notification>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.user.id,
          title: notification.title!,
          message: notification.message!,
          type: notification.type!,
          priority: notification.priority || 'medium',
          data: notification.data,
          action_url: notification.action_url,
          action_label: notification.action_label,
          expires_at: notification.expires_at
        });

      if (error) throw error;

      await fetchNotifications();

      toast({
        title: "Notification created",
        description: notification.title,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create notification';
      setError(errorMessage);
      console.error('Error creating notification:', err);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('New notification received:', payload);
          
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);

          toast({
            title: newNotification.title,
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Get counts
  const getUnreadCount = () => notifications.filter(n => !n.is_read && !n.is_archived).length;
  const getArchivedCount = () => notifications.filter(n => n.is_archived).length;
  const getTotalCount = () => notifications.length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications,
    preferences,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archiveNotification,
    unarchiveNotification,
    deleteNotification,
    createNotification,
    getUnreadCount,
    getArchivedCount,
    getTotalCount,
    refetch: () => {
      fetchNotifications();
    }
  };
}