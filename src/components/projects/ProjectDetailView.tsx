import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Edit,
  Trash2,
  Euro, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  FileText,
  Target,
  Building2,
  Plus,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { type Project } from '@/hooks/useProjects';
import { useExpenses, type Expense } from '@/hooks/useExpenses';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/config/expenseCategories';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ProjectDetailViewProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onAddExpense: () => void;
}

export const ProjectDetailView = ({ project, onEdit, onDelete, onAddExpense }: ProjectDetailViewProps) => {
  const { expenses, approveExpense, rejectExpense, refetch } = useExpenses(project.id);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return 'Pianificazione';
      case 'in_progress': return 'In Corso';
      case 'on_hold': return 'In Pausa';
      case 'completed': return 'Completato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };

  const handleApproveExpense = async () => {
    if (!selectedExpense) return;
    try {
      await approveExpense(selectedExpense.id, reviewNotes);
      setShowExpenseDialog(false);
      setSelectedExpense(null);
      setReviewNotes('');
      refetch();
    } catch (error) {
      console.error('Error approving expense:', error);
    }
  };

  const handleRejectExpense = async () => {
    if (!selectedExpense) return;
    if (!reviewNotes.trim()) {
      alert('Inserisci una motivazione per il rifiuto');
      return;
    }
    try {
      await rejectExpense(selectedExpense.id, reviewNotes);
      setShowExpenseDialog(false);
      setSelectedExpense(null);
      setReviewNotes('');
      refetch();
    } catch (error) {
      console.error('Error rejecting expense:', error);
    }
  };

  const budgetUsed = (project.spent_budget / project.total_budget) * 100;
  const isOverBudget = project.spent_budget > project.total_budget;
  
  const approvedExpenses = useMemo(() => {
    return expenses?.filter(e => e.is_approved === true) || [];
  }, [expenses]);

  const pendingExpenses = useMemo(() => {
    return expenses?.filter(e => e.is_approved === null) || [];
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-3">{project.title}</h1>
          
          {/* CUP Badge - Prominente */}
          {project.cup_code && (
            <div className="mb-3">
              <div className="inline-flex items-center gap-2 bg-primary/10 border-2 border-primary px-4 py-2 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground">Codice CUP</span>
                  <span className="text-xl font-bold text-primary font-mono">{project.cup_code}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
            {project.project_manager && (
              <Badge variant="outline">
                <Building2 className="h-3 w-3 mr-1" />
                {project.project_manager}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </Button>
        </div>
      </div>

      {/* Budget Warning */}
      {(budgetUsed > 90 || isOverBudget) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {isOverBudget ? 'Budget superato!' : 'Attenzione: budget quasi esaurito (>90%)'}
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Riepilogo</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="expenses">Spese</TabsTrigger>
          <TabsTrigger value="details">Dettagli</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Budget Totale</p>
                    <p className="text-2xl font-bold">{formatCurrency(project.total_budget)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Speso</p>
                    <p className="text-2xl font-bold">{formatCurrency(project.spent_budget)}</p>
                    <p className="text-xs text-muted-foreground">{budgetUsed.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Euro className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Rimanente</p>
                    <p className={`text-2xl font-bold ${project.remaining_budget < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(project.remaining_budget)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Progresso</p>
                    <p className="text-2xl font-bold">{project.progress_percentage}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle>Obiettivo del Progetto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline Progetto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {project.start_date && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Data Inizio Prevista</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(project.start_date), 'dd MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                )}
                {project.end_date && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Data Fine Prevista</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(project.end_date), 'dd MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                )}
                {project.actual_start_date && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Data Inizio Effettiva</p>
                    <p className="text-lg font-semibold text-green-600">
                      {format(new Date(project.actual_start_date), 'dd MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                )}
                {project.actual_end_date && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Data Fine Effettiva</p>
                    <p className="text-lg font-semibold text-green-600">
                      {format(new Date(project.actual_end_date), 'dd MMMM yyyy', { locale: it })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Tab */}
        <TabsContent value="budget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Utilizzo Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress 
                value={Math.min(budgetUsed, 100)} 
                className={`h-4 ${budgetUsed > 90 ? 'bg-red-100' : ''}`}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>0€</span>
                <span>{formatCurrency(project.total_budget)}</span>
              </div>
              {isOverBudget && (
                <p className="text-sm text-red-600 font-medium">
                  Superamento budget: {formatCurrency(project.spent_budget - project.total_budget)}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Totale</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(project.total_budget)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Allocato</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(project.allocated_budget)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {((project.allocated_budget / project.total_budget) * 100).toFixed(1)}% del totale
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Budget Speso</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(project.spent_budget)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {budgetUsed.toFixed(1)}% utilizzato
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestione Spese</h3>
            <Button onClick={onAddExpense}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Spesa
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Spese Approvate ({approvedExpenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {approvedExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {approvedExpenses.map((expense) => (
                      <div key={expense.id} className="flex justify-between items-center border-b pb-2">
                        <div>
                          <p className="font-medium text-sm">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {expense.expense_date && format(new Date(expense.expense_date), 'dd MMM yyyy', { locale: it })}
                          </p>
                        </div>
                        <p className="font-medium">{formatCurrency(expense.amount)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nessuna spesa approvata
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Spese in Attesa ({pendingExpenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingExpenses.length > 0 ? (
                  <div className="space-y-3">
                    {pendingExpenses.map((expense) => (
                      <div 
                        key={expense.id} 
                        className="flex justify-between items-center border-b pb-2 hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setShowExpenseDialog(true);
                          setReviewNotes('');
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{expense.description}</p>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(expense.category)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {expense.expense_date && format(new Date(expense.expense_date), 'dd MMM yyyy', { locale: it })}
                            {expense.supplier_name && ` • ${expense.supplier_name}`}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <p className="font-medium">{formatCurrency(expense.amount)}</p>
                            <Badge variant="outline" className="text-xs">in attesa</Badge>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nessuna spesa in attesa
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          {/* Notes */}
          {project.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{project.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Team Members */}
          {project.team_members && project.team_members.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.team_members.map((member, index) => (
                    <Badge key={index} variant="secondary">{member}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Progetto</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Codice CUP</dt>
                  <dd className="mt-1 text-sm font-mono font-semibold">{project.cup_code || 'Non specificato'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Project Manager</dt>
                  <dd className="mt-1 text-sm">{project.project_manager || 'Non assegnato'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Data Creazione</dt>
                  <dd className="mt-1 text-sm">
                    {format(new Date(project.created_at), 'dd MMMM yyyy HH:mm', { locale: it })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Ultimo Aggiornamento</dt>
                  <dd className="mt-1 text-sm">
                    {format(new Date(project.updated_at), 'dd MMMM yyyy HH:mm', { locale: it })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Review Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisione Spesa</DialogTitle>
          </DialogHeader>
          
          {selectedExpense && (
            <div className="space-y-6">
              {/* Expense Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Descrizione</Label>
                  <p className="font-medium">{selectedExpense.description}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Categoria</Label>
                  <p className="font-medium">{getCategoryLabel(selectedExpense.category)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Importo</Label>
                  <p className="text-xl font-bold">{formatCurrency(selectedExpense.amount)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">
                    {selectedExpense.expense_date && 
                      format(new Date(selectedExpense.expense_date), 'dd MMMM yyyy', { locale: it })}
                  </p>
                </div>
                {selectedExpense.supplier_name && (
                  <div>
                    <Label className="text-muted-foreground">Fornitore</Label>
                    <p className="font-medium">{selectedExpense.supplier_name}</p>
                  </div>
                )}
                {selectedExpense.receipt_number && (
                  <div>
                    <Label className="text-muted-foreground">Numero Ricevuta</Label>
                    <p className="font-medium">{selectedExpense.receipt_number}</p>
                  </div>
                )}
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <Label htmlFor="review-notes">Note di Revisione</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Aggiungi note sulla spesa (opzionale per approvazione, obbligatorie per rifiuto)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowExpenseDialog(false);
                    setSelectedExpense(null);
                    setReviewNotes('');
                  }}
                >
                  Annulla
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectExpense}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rifiuta
                </Button>
                <Button
                  variant="default"
                  className="bg-success hover:bg-success/90"
                  onClick={handleApproveExpense}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approva
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
