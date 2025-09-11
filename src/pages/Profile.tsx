import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';
import { profileSchema, changePasswordSchema, ProfileFormData, ChangePasswordFormData } from '@/lib/validations';
import { User, Lock, Building, Phone, Mail } from 'lucide-react';

export default function Profile() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const { user, profile, updateProfile, changePassword, signOut, loading } = useAuth();
  const { toast } = useToast();

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      company: profile?.company || '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    const { error } = await updateProfile({
      full_name: data.fullName,
      email: data.email,
      phone: data.phone || null,
      company: data.company || null,
    });
    
    if (error) {
      toast({
        title: 'Errore',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profilo aggiornato',
        description: 'Le modifiche sono state salvate con successo.',
      });
    }
  };

  const onPasswordSubmit = async (data: ChangePasswordFormData) => {
    const { error } = await changePassword(data.currentPassword, data.newPassword);
    
    if (error) {
      toast({
        title: 'Errore',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Password cambiata',
        description: 'La tua password è stata aggiornata con successo.',
      });
      passwordForm.reset();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Disconnesso',
      description: 'Hai effettuato il logout con successo.',
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'accountant': return 'secondary';
      case 'auditor': return 'outline';
      default: return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Amministratore';
      case 'manager': return 'Manager';
      case 'accountant': return 'Contabile';
      case 'auditor': return 'Revisore';
      default: return role;
    }
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p>Caricamento profilo...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profilo</h1>
          <p className="text-muted-foreground">
            Gestisci le informazioni del tuo account
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut} disabled={loading}>
          Disconnetti
        </Button>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <User className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold">{profile.full_name || 'Nome non specificato'}</h2>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{profile.email}</span>
              </div>
              <Badge variant={getRoleBadgeVariant(profile.role)}>
                {getRoleLabel(profile.role)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('profile')}
        >
          <User className="h-4 w-4 mr-2" />
          Informazioni
        </Button>
        <Button
          variant={activeTab === 'password' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('password')}
        >
          <Lock className="h-4 w-4 mr-2" />
          Sicurezza
        </Button>
      </div>

      {/* Profile Form */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Personali</CardTitle>
            <CardDescription>
              Aggiorna le tue informazioni personali e di contatto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    {...profileForm.register('fullName')}
                    aria-invalid={profileForm.formState.errors.fullName ? 'true' : 'false'}
                  />
                  {profileForm.formState.errors.fullName && (
                    <p className="text-sm text-destructive" role="alert">
                      {profileForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register('email')}
                    aria-invalid={profileForm.formState.errors.email ? 'true' : 'false'}
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-destructive" role="alert">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      className="pl-10"
                      placeholder="+39 123 456 7890"
                      {...profileForm.register('phone')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Azienda</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      className="pl-10"
                      placeholder="Nome azienda"
                      {...profileForm.register('company')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvataggio...' : 'Salva modifiche'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Password Form */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Cambia Password</CardTitle>
            <CardDescription>
              Aggiorna la tua password per mantenere il tuo account sicuro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password attuale</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register('currentPassword')}
                  aria-invalid={passwordForm.formState.errors.currentPassword ? 'true' : 'false'}
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive" role="alert">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...passwordForm.register('newPassword')}
                  aria-invalid={passwordForm.formState.errors.newPassword ? 'true' : 'false'}
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive" role="alert">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma nuova password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                  aria-invalid={passwordForm.formState.errors.confirmPassword ? 'true' : 'false'}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive" role="alert">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Aggiornamento...' : 'Cambia password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}