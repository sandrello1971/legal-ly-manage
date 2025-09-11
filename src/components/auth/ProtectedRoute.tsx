import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, initialized, initialize } = useAuth();

  useEffect(() => {
    if (!initialized) initialize();
  }, [initialized, initialize]);

  console.log('ProtectedRoute state:', { user: !!user, initialized });

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}