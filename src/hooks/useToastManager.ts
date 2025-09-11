import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ToastActionElement } from '@/components/ui/toast';
import { useToast, toast } from '@/hooks/use-toast';
import { Undo2 } from 'lucide-react';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
  action?: ToastActionElement;
  undoable?: boolean;
  onUndo?: () => void;
}

interface ToastManager {
  success: (options: Omit<ToastOptions, 'variant'>) => void;
  error: (options: Omit<ToastOptions, 'variant'>) => void;
  warning: (options: Omit<ToastOptions, 'variant'>) => void;
  info: (options: Omit<ToastOptions, 'variant'>) => void;
  loading: (options: Omit<ToastOptions, 'variant' | 'duration'>) => { dismiss: () => void };
}

export function useToastManager(): ToastManager {
  const showToast = useCallback((options: ToastOptions) => {
    let action = options.action;
    
    if (options.undoable && options.onUndo) {
      action = undefined; // Simplified for now
    }

    return toast({
      title: options.title,
      description: options.description,
      variant: options.variant,
      duration: options.duration || 5000,
      action,
    });
  }, []);

  const success = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    showToast({
      ...options,
      variant: 'default',
      title: options.title || 'Success',
    });
  }, [showToast]);

  const error = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    showToast({
      ...options,
      variant: 'destructive',
      title: options.title || 'Error',
      duration: options.duration || 7000,
    });
  }, [showToast]);

  const warning = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    showToast({
      ...options,
      variant: 'default',
      title: options.title || 'Warning',
    });
  }, [showToast]);

  const info = useCallback((options: Omit<ToastOptions, 'variant'>) => {
    showToast({
      ...options,
      variant: 'default',
      title: options.title || 'Info',
    });
  }, [showToast]);

  const loading = useCallback((options: Omit<ToastOptions, 'variant' | 'duration'>) => {
    const toastResult = toast({
      title: options.title || 'Loading...',
      description: options.description,
      duration: Infinity,
      variant: 'default',
    });

    return { dismiss: toastResult.dismiss };
  }, []);

  return {
    success,
    error,
    warning,
    info,
    loading
  };
}

export const toastManager = {
  operationSuccess: (operation: string, details?: string) => {
    toast({
      title: operation + ' successful',
      description: details,
      variant: 'default',
      duration: 4000,
    });
  },

  operationError: (operation: string, error: any) => {
    toast({
      title: operation + ' failed',
      description: error instanceof Error ? error.message : 'An error occurred',
      variant: 'destructive',
      duration: 6000,
    });
  },

  networkError: () => {
    toast({
      title: 'Connection Error',
      description: 'Please check your internet connection and try again',
      variant: 'destructive',
      duration: 6000,
    });
  },
};