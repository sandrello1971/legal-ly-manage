import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  Plus
} from 'lucide-react';
import { useProjects, type Project } from '@/hooks/useProjects';
import { useExpenses } from '@/hooks/useExpenses';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ProjectDashboardProps {
  project: Project;
  onEditProject: () => void;
  onAddExpense: () => void;
}

export const ProjectDashboard = ({ project, onEditProject, onAddExpense }: ProjectDashboardProps) => {
  const { expenses } = useExpenses(project.id);
  const [budgetWarnings, setBudgetWarnings] = useState<string[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
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

  // Calculate budget utilization
  const budgetUsed = (project.spent_budget / project.total_budget) * 100;
  const remainingBudget = project.remaining_budget;
  const isOverBudget = project.spent_budget > project.total_budget;

  // Check for warnings
  useEffect(() => {
    const warnings = [];
    if (budgetUsed > 90) {
      warnings.push('Budget quasi esaurito (>90%)');
    }
    if (isOverBudget) {
      warnings.push('Budget superato!');
    }
    if (project.end_date && new Date(project.end_date) < new Date()) {
      warnings.push('Progetto scaduto');
    }
    setBudgetWarnings(warnings);
  }, [project, budgetUsed, isOverBudget]);

  const approvedExpenses = expenses?.filter(e => e.is_approved) || [];
  const pendingExpenses = expenses?.filter(e => !e.is_approved) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">{project.title}</h2>
          {project.cup_code && (
            <div className="mt-2 mb-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 border-2 border-primary px-4 py-2 rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Codice CUP:</span>
                <span className="text-lg font-bold text-primary">{project.cup_code}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className={getStatusColor(project.status)}>
              {getStatusLabel(project.status)}
            </Badge>
            {project.project_manager && (
              <Badge variant="outline">{project.project_manager}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onAddExpense}>
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Spesa
          </Button>
          <Button onClick={onEditProject}>
            Modifica Progetto
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {budgetWarnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {budgetWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Overview */}
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
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Speso</p>
                <p className="text-2xl font-bold">{formatCurrency(project.spent_budget)}</p>
                <p className="text-xs text-muted-foreground">{budgetUsed.toFixed(1)}% del budget</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rimanente</p>
                <p className={`text-2xl font-bold ${remainingBudget < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(remainingBudget)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Progresso</p>
                <p className="text-2xl font-bold">{project.progress_percentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Utilizzo Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Expenses Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
              Spese Approvate ({approvedExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {approvedExpenses.length > 0 ? (
              <div className="space-y-3">
                {approvedExpenses.slice(0, 5).map((expense) => (
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
                {approvedExpenses.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    +{approvedExpenses.length - 5} altre spese...
                  </p>
                )}
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
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-yellow-600" />
              Spese in Attesa ({pendingExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingExpenses.length > 0 ? (
              <div className="space-y-3">
                {pendingExpenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <p className="font-medium text-sm">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.expense_date && format(new Date(expense.expense_date), 'dd MMM yyyy', { locale: it })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(expense.amount)}</p>
                      <Badge variant="outline" className="text-xs">
                        {expense.is_approved ? 'approvato' : 'in attesa'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {pendingExpenses.length > 5 && (
                  <p className="text-sm text-muted-foreground">
                    +{pendingExpenses.length - 5} altre spese...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Nessuna spesa in attesa
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Details */}
      {project.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descrizione Progetto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{project.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Progetto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {project.start_date && (
              <div>
                <p className="font-medium">Data Inizio Prevista</p>
                <p className="text-muted-foreground">
                  {format(new Date(project.start_date), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>
            )}
            {project.end_date && (
              <div>
                <p className="font-medium">Data Fine Prevista</p>
                <p className="text-muted-foreground">
                  {format(new Date(project.end_date), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>
            )}
            {project.actual_start_date && (
              <div>
                <p className="font-medium">Data Inizio Effettiva</p>
                <p className="text-muted-foreground">
                  {format(new Date(project.actual_start_date), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>
            )}
            {project.actual_end_date && (
              <div>
                <p className="font-medium">Data Fine Effettiva</p>
                <p className="text-muted-foreground">
                  {format(new Date(project.actual_end_date), 'dd MMMM yyyy', { locale: it })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};