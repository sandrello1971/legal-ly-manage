import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, initialized } = useAuth();

  // Remove initialization from ProtectedRoute to prevent loops
  // Initialization is handled by Layout component

  console.log('🛡️ ProtectedRoute state:', { user: !!user, initialized, userId: user?.id });

  if (!initialized) {
    console.log('⏳ Still initializing auth...');
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