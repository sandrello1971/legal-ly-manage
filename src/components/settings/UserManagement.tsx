import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, UserPlus } from 'lucide-react';
import { useUsers, type AppRole } from '@/hooks/useUsers';
import { useAuth } from '@/stores/auth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const UserManagement = () => {
  const { users, loading, updateUserRole, inviteUser, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('user');
  
  // Role change form state
  const [newRole, setNewRole] = useState<AppRole>('user');
  const [changeReason, setChangeReason] = useState('');

  const handleInviteUser = async () => {
    if (!inviteEmail) return;
    
    const success = await inviteUser(inviteEmail, inviteRole);
    if (success) {
      setInviteEmail('');
      setInviteRole('user');
      setInviteDialogOpen(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    
    const success = await updateUserRole(selectedUser, newRole, changeReason);
    if (success) {
      setEditRoleDialogOpen(false);
      setSelectedUser(null);
      setChangeReason('');
    }
  };

  const openEditRoleDialog = (userId: string, currentRole: AppRole) => {
    setSelectedUser(userId);
    setNewRole(currentRole);
    setEditRoleDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'admin':
        return 'Amministratore';
      case 'user':
        return 'Utente';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Gestione Utenti
          </CardTitle>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invita Utente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invita Nuovo Utente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="utente@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Ruolo</Label>
                  <Select value={inviteRole} onValueChange={(value: AppRole) => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Utente</SelectItem>
                      <SelectItem value="admin">Amministratore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button onClick={handleInviteUser}>
                    Invia Invito
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Data Registrazione</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role || 'user')}>
                      {getRoleLabel(user.role || 'user')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'dd MMM yyyy', { locale: it })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.id !== currentUser?.id && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditRoleDialog(user.id, user.role || 'user')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Elimina Utente</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Sei sicuro di voler eliminare l'utente {user.email}? 
                                  Questa azione non può essere annullata.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Elimina
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Ruolo Utente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-role">Nuovo Ruolo</Label>
              <Select value={newRole} onValueChange={(value: AppRole) => setNewRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Utente</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="reason">Motivo della Modifica</Label>
              <Textarea
                id="reason"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="Inserisci il motivo della modifica del ruolo..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleUpdateRole}>
                Aggiorna Ruolo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};