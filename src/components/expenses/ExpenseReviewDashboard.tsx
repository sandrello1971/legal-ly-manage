import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/config/expenseCategories';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  FileText, 
  MessageSquare,
  History,
  Eye,
  Download,
  Edit
} from 'lucide-react';
import { useExpenses, type Expense } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ReviewAction {
  expenseId: string;
  action: 'approve' | 'reject';
  notes?: string;
}

export function ExpenseReviewDashboard() {
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | ''>('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [amountSpent, setAmountSpent] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Expense>>({});

  const { expenses, loading, approveExpense, rejectExpense, updateExpense, refetch } = useExpenses();
  const { projects } = useProjects();
  const { user } = useAuth();

  // Filter and search expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'pending' && expense.is_approved === null) ||
                          (statusFilter === 'approved' && expense.is_approved === true) ||
                          (statusFilter === 'rejected' && expense.is_approved === false);
      
      const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;

      return matchesSearch && matchesStatus && matchesProject;
    });
  }, [expenses, searchTerm, statusFilter, projectFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = expenses.length;
    const pending = expenses.filter(e => e.is_approved === null).length;
    const approved = expenses.filter(e => e.is_approved === true).length;
    const rejected = expenses.filter(e => e.is_approved === false).length;
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const approvedAmount = expenses.filter(e => e.is_approved === true).reduce((sum, e) => sum + e.amount, 0);

    return { total, pending, approved, rejected, totalAmount, approvedAmount };
  }, [expenses]);

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    if (checked) {
      setSelectedExpenses(prev => [...prev, expenseId]);
    } else {
      setSelectedExpenses(prev => prev.filter(id => id !== expenseId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(filteredExpenses.map(e => e.id));
    } else {
      setSelectedExpenses([]);
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedExpenses.length === 0) return;

    try {
      for (const expenseId of selectedExpenses) {
        if (bulkAction === 'approve') {
          await approveExpense(expenseId, bulkNotes);
        } else {
          await rejectExpense(expenseId, bulkNotes);
        }
      }
      
      setSelectedExpenses([]);
      setBulkAction('');
      setBulkNotes('');
      refetch();
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const handleSingleAction = async (expense: Expense, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        // Update expense with amount_spent before approving
        const spentAmount = amountSpent !== null ? amountSpent : expense.amount;
        await updateExpense(expense.id, { amount_spent: spentAmount });
        await approveExpense(expense.id, reviewNotes);
      } else {
        await rejectExpense(expense.id, reviewNotes);
      }
      
      setSelectedExpense(null);
      setReviewNotes('');
      setAmountSpent(null);
      refetch();
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  const handleEditExpense = async () => {
    if (!selectedExpense || !editForm) return;

    try {
      await updateExpense(selectedExpense.id, editForm);
      setIsEditing(false);
      setEditForm({});
      setSelectedExpense(null);
      refetch();
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  const startEditing = (expense: Expense) => {
    setEditForm({
      description: expense.description,
      amount: expense.amount,
      amount_spent: expense.amount_spent,
      category: expense.category,
      supplier_name: expense.supplier_name,
      receipt_number: expense.receipt_number,
      expense_date: expense.expense_date,
      project_id: expense.project_id
    });
    setIsEditing(true);
  };

  const getStatusBadge = (expense: Expense) => {
    if (expense.is_approved === null) {
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />In Attesa</Badge>;
    } else if (expense.is_approved) {
      return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Approvata</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rifiutata</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category;
  };

  if (loading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Totale Spese</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Attesa</p>
                <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approvate</p>
                <p className="text-2xl font-bold text-success">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Importo Totale</p>
                <p className="text-2xl font-bold">€{stats.totalAmount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Approvato</p>
                <p className="text-sm font-medium">€{stats.approvedAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Cerca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cerca per descrizione o fornitore..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status-filter">Stato</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="pending">In Attesa</SelectItem>
                  <SelectItem value="approved">Approvate</SelectItem>
                  <SelectItem value="rejected">Rifiutate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="project-filter">Progetto</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i progetti</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setProjectFilter('all');
              }}>
                <Filter className="h-4 w-4 mr-2" />
                Reset Filtri
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedExpenses.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium">
                  {selectedExpenses.length} spese selezionate
                </p>
                <Select value={bulkAction} onValueChange={(value: any) => setBulkAction(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Azione in blocco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approve">Approva tutte</SelectItem>
                    <SelectItem value="reject">Rifiuta tutte</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Note (opzionale)"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="w-64"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedExpenses([])}>
                  Annulla
                </Button>
                <Button onClick={handleBulkAction} disabled={!bulkAction}>
                  Applica
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Spese da Revisionare</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedExpenses.length === filteredExpenses.length && filteredExpenses.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead>Progetto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornitore</TableHead>
                <TableHead>Importo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const project = projects.find(p => p.id === expense.project_id);
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedExpenses.includes(expense.id)}
                        onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        {expense.receipt_number && (
                          <p className="text-xs text-muted-foreground">#{expense.receipt_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{project?.title || 'N/A'}</TableCell>
                    <TableCell>{getCategoryLabel(expense.category)}</TableCell>
                    <TableCell>{expense.supplier_name || 'N/A'}</TableCell>
                    <TableCell className="font-medium">€{expense.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(expense.expense_date), 'dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>{getStatusBadge(expense)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {/* Pulsante di modifica diretta */}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedExpense(expense);
                                startEditing(expense);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Modifica Spesa</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="quick-edit-description">Descrizione</Label>
                                <Input
                                  id="quick-edit-description"
                                  value={editForm.description || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="quick-edit-amount">Importo Allocato</Label>
                                <Input
                                  id="quick-edit-amount"
                                  type="number"
                                  step="0.01"
                                  value={editForm.amount || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="quick-edit-amount-spent">Importo Speso</Label>
                                <Input
                                  id="quick-edit-amount-spent"
                                  type="number"
                                  step="0.01"
                                  value={editForm.amount_spent !== undefined ? editForm.amount_spent : ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, amount_spent: parseFloat(e.target.value) || 0 }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="quick-edit-category">Categoria</Label>
                                <Select 
                                  value={editForm.category || ''} 
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value as any }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="consulting">Consulenza</SelectItem>
                                    <SelectItem value="training">Formazione</SelectItem>
                                    <SelectItem value="equipment">Attrezzature tecnologiche</SelectItem>
                                    <SelectItem value="engineering">Ingegnerizzazione SW/HW</SelectItem>
                                    <SelectItem value="intellectual_property">Proprietà industriale</SelectItem>
                                    <SelectItem value="personnel">Personale dedicato</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="quick-edit-date">Data Spesa</Label>
                                <Input
                                  id="quick-edit-date"
                                  type="date"
                                  value={editForm.expense_date || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, expense_date: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="quick-edit-supplier">Fornitore</Label>
                                <Input
                                  id="quick-edit-supplier"
                                  value={editForm.supplier_name || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label htmlFor="quick-edit-receipt">Numero Ricevuta</Label>
                                <Input
                                  id="quick-edit-receipt"
                                  value={editForm.receipt_number || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, receipt_number: e.target.value }))}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label htmlFor="quick-edit-project">Progetto</Label>
                                <Select 
                                  value={editForm.project_id || ''} 
                                  onValueChange={(value) => setEditForm(prev => ({ ...prev, project_id: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {projects.map((project) => (
                                      <SelectItem key={project.id} value={project.id}>
                                        {project.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-2 flex gap-2 pt-4">
                                <Button onClick={handleEditExpense} className="flex-1">
                                  Salva Modifiche
                                </Button>
                                <DialogClose asChild>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setIsEditing(false);
                                      setEditForm({});
                                    }}
                                    className="flex-1"
                                  >
                                    Annulla
                                  </Button>
                                </DialogClose>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Pulsante di visualizzazione dettagli */}
                        <Dialog>
                           <DialogTrigger asChild>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => {
                                 setSelectedExpense(expense);
                                 setIsEditing(false);
                                 setEditForm({});
                               }}
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                           </DialogTrigger>
                           <DialogContent className="max-w-3xl">
                             <DialogHeader>
                               <DialogTitle>
                                 <div className="flex items-center justify-between">
                                   <span>{isEditing ? 'Modifica Spesa' : 'Dettagli Spesa'}</span>
                                   <Button
                                     variant={isEditing ? "destructive" : "outline"}
                                     size="sm"
                                     onClick={() => {
                                       if (isEditing) {
                                         setIsEditing(false);
                                         setEditForm({});
                                       } else {
                                         startEditing(selectedExpense);
                                       }
                                     }}
                                   >
                                     <Edit className="h-4 w-4 mr-2" />
                                     {isEditing ? 'Annulla Modifica' : 'Modifica'}
                                   </Button>
                                 </div>
                               </DialogTitle>
                             </DialogHeader>
                             {selectedExpense && (
                               <Tabs defaultValue="details" className="w-full">
                                 <TabsList>
                                   <TabsTrigger value="details">Dettagli</TabsTrigger>
                                   <TabsTrigger value="history">Storico</TabsTrigger>
                                 </TabsList>
                                 
                                 <TabsContent value="details" className="space-y-4">
                                   {isEditing ? (
                                     <div className="grid grid-cols-2 gap-4">
                                       <div>
                                         <Label htmlFor="edit-description">Descrizione</Label>
                                         <Input
                                           id="edit-description"
                                           value={editForm.description || ''}
                                           onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                         />
                                       </div>
                                        <div>
                                          <Label htmlFor="edit-amount">Importo Allocato</Label>
                                          <Input
                                            id="edit-amount"
                                            type="number"
                                            step="0.01"
                                            value={editForm.amount || ''}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-amount-spent">Importo Speso</Label>
                                          <Input
                                            id="edit-amount-spent"
                                            type="number"
                                            step="0.01"
                                            value={editForm.amount_spent || ''}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, amount_spent: parseFloat(e.target.value) || 0 }))}
                                          />
                                        </div>
                                       <div>
                                         <Label htmlFor="edit-category">Categoria</Label>
                                         <Select 
                                           value={editForm.category || ''} 
                                           onValueChange={(value) => setEditForm(prev => ({ ...prev, category: value as any }))}
                                         >
                                           <SelectTrigger>
                                             <SelectValue />
                                           </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="consulting">Consulenza</SelectItem>
                                              <SelectItem value="training">Formazione</SelectItem>
                                              <SelectItem value="equipment">Attrezzature tecnologiche</SelectItem>
                                              <SelectItem value="engineering">Ingegnerizzazione SW/HW</SelectItem>
                                              <SelectItem value="intellectual_property">Proprietà industriale</SelectItem>
                                              <SelectItem value="personnel">Personale dedicato</SelectItem>
                                            </SelectContent>
                                         </Select>
                                       </div>
                                       <div>
                                         <Label htmlFor="edit-date">Data Spesa</Label>
                                         <Input
                                           id="edit-date"
                                           type="date"
                                           value={editForm.expense_date || ''}
                                           onChange={(e) => setEditForm(prev => ({ ...prev, expense_date: e.target.value }))}
                                         />
                                       </div>
                                       <div>
                                         <Label htmlFor="edit-supplier">Fornitore</Label>
                                         <Input
                                           id="edit-supplier"
                                           value={editForm.supplier_name || ''}
                                           onChange={(e) => setEditForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                                         />
                                       </div>
                                       <div>
                                         <Label htmlFor="edit-receipt">Numero Ricevuta</Label>
                                         <Input
                                           id="edit-receipt"
                                           value={editForm.receipt_number || ''}
                                           onChange={(e) => setEditForm(prev => ({ ...prev, receipt_number: e.target.value }))}
                                         />
                                       </div>
                                       <div className="col-span-2">
                                         <Label htmlFor="edit-project">Progetto</Label>
                                         <Select 
                                           value={editForm.project_id || ''} 
                                           onValueChange={(value) => setEditForm(prev => ({ ...prev, project_id: value }))}
                                         >
                                           <SelectTrigger>
                                             <SelectValue />
                                           </SelectTrigger>
                                           <SelectContent>
                                             {projects.map((project) => (
                                               <SelectItem key={project.id} value={project.id}>
                                                 {project.title}
                                               </SelectItem>
                                             ))}
                                           </SelectContent>
                                         </Select>
                                       </div>
                                       <div className="col-span-2 flex gap-2 pt-4">
                                         <Button onClick={handleEditExpense} className="flex-1">
                                           Salva Modifiche
                                         </Button>
                                         <Button 
                                           variant="outline" 
                                           onClick={() => {
                                             setIsEditing(false);
                                             setEditForm({});
                                           }}
                                           className="flex-1"
                                         >
                                           Annulla
                                         </Button>
                                       </div>
                                     </div>
                                   ) : (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Descrizione</Label>
                                          <p className="text-sm">{selectedExpense.description}</p>
                                        </div>
                                        <div>
                                          <Label>Importo Allocato</Label>
                                          <p className="text-sm font-medium">€{selectedExpense.amount.toFixed(2)}</p>
                                        </div>
                                        {selectedExpense.is_approved && selectedExpense.amount_spent !== undefined && (
                                          <div>
                                            <Label>Importo Speso</Label>
                                            <p className="text-sm font-medium">€{selectedExpense.amount_spent.toFixed(2)}</p>
                                          </div>
                                        )}
                                       <div>
                                         <Label>Categoria</Label>
                                         <p className="text-sm">{getCategoryLabel(selectedExpense.category)}</p>
                                       </div>
                                       <div>
                                         <Label>Data Spesa</Label>
                                         <p className="text-sm">{format(new Date(selectedExpense.expense_date), 'dd/MM/yyyy', { locale: it })}</p>
                                       </div>
                                       <div>
                                         <Label>Fornitore</Label>
                                         <p className="text-sm">{selectedExpense.supplier_name || 'N/A'}</p>
                                       </div>
                                       <div>
                                         <Label>Numero Ricevuta</Label>
                                         <p className="text-sm">{selectedExpense.receipt_number || 'N/A'}</p>
                                       </div>
                                       <div>
                                         <Label>Progetto</Label>
                                         <p className="text-sm">{projects.find(p => p.id === selectedExpense.project_id)?.title || 'N/A'}</p>
                                       </div>
                                     </div>
                                   )}

                                   {selectedExpense.approval_notes && (
                                     <div>
                                       <Label>Note di Approvazione</Label>
                                       <p className="text-sm bg-muted p-2 rounded">
                                         {selectedExpense.approval_notes}
                                       </p>
                                     </div>
                                   )}

                                    {/* Azioni di approvazione solo per spese in attesa */}
                                    {selectedExpense.is_approved === null && !isEditing && (
                                      <div className="space-y-4 border-t pt-4">
                                        <div>
                                          <Label htmlFor="amount-spent">Importo Effettivamente Speso</Label>
                                          <Input
                                            id="amount-spent"
                                            type="number"
                                            step="0.01"
                                            value={amountSpent !== null ? amountSpent : selectedExpense.amount}
                                            onChange={(e) => setAmountSpent(parseFloat(e.target.value) || 0)}
                                            placeholder="Importo speso..."
                                          />
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Importo allocato: €{selectedExpense.amount.toFixed(2)}
                                          </p>
                                        </div>
                                        <div>
                                          <Label htmlFor="review-notes">Note di Revisione</Label>
                                         <Textarea
                                           id="review-notes"
                                           value={reviewNotes}
                                           onChange={(e) => setReviewNotes(e.target.value)}
                                           placeholder="Aggiungi note per la revisione..."
                                         />
                                       </div>
                                       
                                       <div className="flex gap-2">
                                         <Button
                                           onClick={() => handleSingleAction(selectedExpense, 'approve')}
                                           className="flex-1"
                                         >
                                           <CheckCircle className="h-4 w-4 mr-2" />
                                           Approva
                                         </Button>
                                        <Button
                                          variant="destructive"
                                          onClick={() => handleSingleAction(selectedExpense, 'reject')}
                                          className="flex-1"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Rifiuta
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </TabsContent>
                                
                                <TabsContent value="history">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <History className="h-4 w-4" />
                                      <span>Creata il {format(new Date(selectedExpense.created_at), 'dd/MM/yyyy HH:mm', { locale: it })}</span>
                                    </div>
                                    
                                    {selectedExpense.approved_at && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 text-success" />
                                        <span>
                                          {selectedExpense.is_approved ? 'Approvata' : 'Rifiutata'} il {' '}
                                          {format(new Date(selectedExpense.approved_at), 'dd/MM/yyyy HH:mm', { locale: it })}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TabsContent>
                              </Tabs>
                            )}
                          </DialogContent>
                        </Dialog>

                        {expense.receipt_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredExpenses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna spesa trovata con i filtri selezionati.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}