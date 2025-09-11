import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, initialized, initialize } = useAuth();

  console.log('🛡️ ProtectedRoute render:', { user: !!user, initialized, userId: user?.id });

  // Initialize auth if not already done
  useEffect(() => {
    if (!initialized) {
      console.log('🛡️ Initializing auth from ProtectedRoute...');
      initialize();
    }
  }, [initialized, initialize]);

  if (!initialized) {
    console.log('⏳ ProtectedRoute: Still initializing auth...');
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
    console.log('🚫 No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('✅ User authenticated, showing protected content');
  return <>{children}</>;
}