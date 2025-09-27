import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings as SettingsIcon, Users, User, Shield, AlertTriangle } from 'lucide-react';
import { UserManagement } from '@/components/settings/UserManagement';
import { UserProfile } from '@/components/settings/UserProfile';
import { useUserRole } from '@/hooks/useUserRole';

export default function Settings() {
  const { userRole, loading, isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState('profile');

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <SettingsIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Impostazioni</h1>
          <p className="text-muted-foreground">
            Gestisci le tue impostazioni e preferenze
          </p>
        </div>
      </div>

      {/* Role-based Access Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Il tuo ruolo attuale è: <strong>{userRole === 'admin' ? 'Amministratore' : 'Utente'}</strong>. 
          {userRole === 'admin' 
            ? ' Hai accesso completo a tutte le funzionalità di amministrazione.'
            : ' Puoi modificare solo le tue impostazioni personali.'
          }
        </AlertDescription>
      </Alert>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Il Mio Profilo
          </TabsTrigger>
          {isAdmin() && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Gestione Utenti
            </TabsTrigger>
          )}
        </TabsList>

        {/* User Profile Tab */}
        <TabsContent value="profile">
          <UserProfile />
        </TabsContent>

        {/* User Management Tab (Admin Only) */}
        {isAdmin() && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}

        {/* Access Denied for Non-Admin Users trying to access admin features */}
        {!isAdmin() && activeTab === 'users' && (
          <TabsContent value="users">
            <Card>
              <CardContent className="p-6">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Non hai i permessi necessari per accedere a questa sezione. 
                    Solo gli amministratori possono gestire gli utenti.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Additional Settings Sections for Future Features */}
      {isAdmin() && (
        <Card>
          <CardHeader>
            <CardTitle>Altre Impostazioni Amministrative</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Sezioni aggiuntive per la configurazione del sistema saranno disponibili qui in futuro.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}