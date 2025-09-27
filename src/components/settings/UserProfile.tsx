import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Mail, Calendar, Shield, Key } from 'lucide-react';
import { useAuth } from '@/stores/auth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const UserProfile = () => {
  const { user } = useAuth();
  const { userRole } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Amministratore';
      case 'user':
        return 'Utente';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Errore',
        description: 'Le password non coincidono',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'Errore',
        description: 'La password deve essere di almeno 6 caratteri',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Password aggiornata con successo',
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      console.error('Error updating password:', err);
      toast({
        title: 'Errore',
        description: err.message || 'Impossibile aggiornare la password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert>
            <AlertDescription>
              Devi essere autenticato per visualizzare il profilo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informazioni Profilo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">Ruolo</Label>
                <div>
                  <Badge variant={getRoleBadgeVariant(userRole || 'user') as any}>
                    {getRoleLabel(userRole || 'user')}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">Data Registrazione</Label>
                <p className="font-medium">
                  {format(new Date(user.created_at), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Key className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-sm text-muted-foreground">ID Utente</Label>
                <p className="font-mono text-sm text-muted-foreground">{user.id}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Cambia Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="current-password">Password Attuale</Label>
            <Input
              id="current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Inserisci la password attuale"
            />
          </div>
          
          <div>
            <Label htmlFor="new-password">Nuova Password</Label>
            <Input
              id="new-password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Inserisci la nuova password"
            />
          </div>
          
          <div>
            <Label htmlFor="confirm-password">Conferma Nuova Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Conferma la nuova password"
            />
          </div>
          
          <Button 
            onClick={handlePasswordChange}
            disabled={loading || !passwordForm.newPassword || !passwordForm.confirmPassword}
          >
            {loading ? 'Aggiornamento...' : 'Aggiorna Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};