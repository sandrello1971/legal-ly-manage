import { ReactNode } from 'react';
import { useAuth, UserRole } from '@/stores/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { checkAccess, profile } = useAuth();

  if (!profile) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Profilo non caricato. Riprova ad accedere.
        </AlertDescription>
      </Alert>
    );
  }

  if (!checkAccess(allowedRoles)) {
    return fallback || (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Non hai i permessi necessari per accedere a questa sezione.
          Il tuo ruolo: {profile.role}. Ruoli richiesti: {allowedRoles.join(', ')}.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}