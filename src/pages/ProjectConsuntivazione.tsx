import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useExpenses } from '@/hooks/useExpenses';
import { useBandi } from '@/hooks/useBandi';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  max_percentage: number | null;
  max_amount: number | null;
}

export default function ProjectConsuntivazione() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, loading: loadingProjects } = useProjects();
  const { expenses, loading: loadingExpenses } = useExpenses(projectId);
  const { bandi, loading: loadingBandi } = useBandi();

  const project = useMemo(() => 
    projects.find(p => p.id === projectId),
    [projects, projectId]
  );

  // Get bando associated with project
  const bando = useMemo(() => {
    if (!project?.bando_id) return null;
    return bandi.find(b => b.id === project.bando_id);
  }, [project, bandi]);

  // Extract categories from bando or use standard categories as fallback
  const projectCategories = useMemo(() => {
    // Try to get categories from bando first
    if (bando?.parsed_data?.expense_categories && bando.parsed_data.expense_categories.length > 0) {
      return bando.parsed_data.expense_categories.map((cat: any) => ({
        id: cat.name.toLowerCase().replace(/\s+/g, '_'),
        name: cat.name,
        description: cat.description || '',
        max_percentage: cat.max_percentage,
        max_amount: cat.max_amount
      }));
    }
    
    // Fallback to standard expense categories (matching the enum in the database)
    return [
      { id: 'personnel', name: 'Personale', description: 'Costi del personale', max_percentage: null, max_amount: null },
      { id: 'equipment', name: 'Attrezzature', description: 'Attrezzature e strumentazione', max_percentage: null, max_amount: null },
      { id: 'materials', name: 'Materiali', description: 'Materiali di consumo', max_percentage: null, max_amount: null },
      { id: 'services', name: 'Servizi', description: 'Servizi esterni', max_percentage: null, max_amount: null },
      { id: 'travel', name: 'Viaggi', description: 'Spese di viaggio e trasferta', max_percentage: null, max_amount: null },
      { id: 'other', name: 'Altro', description: 'Altre spese', max_percentage: null, max_amount: null }
    ];
  }, [bando]);

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    if (projectCategories.length === 0) return {};
    
    const grouped: Record<string, typeof expenses> = {};
    projectCategories.forEach(cat => {
      grouped[cat.id] = [];
    });

    expenses.forEach(expense => {
      if (expense.category && grouped[expense.category]) {
        grouped[expense.category].push(expense);
      }
    });

    return grouped;
  }, [expenses, projectCategories]);

  // Calculate budget per category
  const budgetPerCategory = useMemo(() => {
    if (!project?.total_budget || projectCategories.length === 0) return {};
    
    const budgets: Record<string, number> = {};
    
    projectCategories.forEach(cat => {
      if (cat.max_amount) {
        budgets[cat.id] = cat.max_amount;
      } else if (cat.max_percentage) {
        budgets[cat.id] = (project.total_budget * cat.max_percentage) / 100;
      } else {
        // Se non ha limiti specifici, distribuisci equamente il budget rimanente
        budgets[cat.id] = 0;
      }
    });

    // Calcola budget non allocato
    const allocatedBudget = Object.values(budgets).reduce((sum, val) => sum + val, 0);
    const remainingBudget = project.total_budget - allocatedBudget;
    const categoriesWithoutBudget = projectCategories.filter(cat => !budgets[cat.id]);
    
    if (categoriesWithoutBudget.length > 0 && remainingBudget > 0) {
      const equalShare = remainingBudget / categoriesWithoutBudget.length;
      categoriesWithoutBudget.forEach(cat => {
        budgets[cat.id] = equalShare;
      });
    }

    return budgets;
  }, [project, projectCategories]);

  // Calculate spent per category
  const spentPerCategory = useMemo(() => {
    const spent: Record<string, number> = {};
    
    projectCategories.forEach(cat => {
      spent[cat.id] = 0;
    });

    Object.entries(expensesByCategory).forEach(([category, categoryExpenses]) => {
      spent[category] = categoryExpenses.reduce(
        (sum, expense) => sum + (expense.amount || 0),
        0
      );
    });

    return spent;
  }, [expensesByCategory, projectCategories]);

  // Calculate totals
  const totalBudget = project?.total_budget || 0;
  const totalSpent = Object.values(spentPerCategory).reduce((sum, val) => sum + val, 0);

  const getRowColor = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 100 && percentage <= 100.5) return 'bg-success/20'; // Verde - esattamente 100%
    if (percentage < 100) return 'bg-warning/20'; // Giallo - dentro budget
    return 'bg-destructive/20'; // Rosso - fuori budget
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loadingProjects || loadingExpenses || loadingBandi) {
    return (
      <div className="container mx-auto py-8">
        <p>Caricamento...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <p>Progetto non trovato</p>
      </div>
    );
  }

  if (projectCategories.length === 0) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/bandi')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Consuntivazione Progetto</h1>
              <p className="text-muted-foreground">{project.title}</p>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <div>
                <p className="font-medium">Nessuna categoria di spesa definita</p>
                <p className="text-sm">Il bando associato a questo progetto non ha categorie di spesa configurate. Contatta l'amministratore per configurare le categorie.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/bandi')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Consuntivazione Progetto</h1>
            <p className="text-muted-foreground">{project.title}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Totale Progetto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Budget Totale</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Speso</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Residuo</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget - totalSpent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dettaglio per Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Categoria / Fattura</TableHead>
                <TableHead>Fornitore</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Speso</TableHead>
                <TableHead className="text-right">Residuo</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectCategories.map(category => {
                const budget = budgetPerCategory[category.id] || 0;
                const spent = spentPerCategory[category.id] || 0;
                const remaining = budget - spent;
                const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                const categoryExpenses = expensesByCategory[category.id] || [];

                return (
                  <>
                    <TableRow
                      key={category.id}
                      className={getRowColor(spent, budget)}
                    >
                      <TableCell className="font-bold">
                        <div>
                          <div>{category.name}</div>
                          {category.description && (
                            <div className="text-xs text-muted-foreground font-normal">{category.description}</div>
                          )}
                          {(category.max_percentage || category.max_amount) && (
                            <div className="text-xs text-muted-foreground font-normal">
                              {category.max_percentage && `Max: ${category.max_percentage}%`}
                              {category.max_amount && ` (€${category.max_amount.toLocaleString('it-IT')})`}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(budget)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(spent)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(remaining)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {percentage.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    
                    {categoryExpenses.map(expense => (
                      <TableRow key={expense.id} className="border-l-4 border-l-muted">
                        <TableCell className="pl-8">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>{expense.description}</span>
                            {expense.receipt_number && (
                              <span className="text-xs">({expense.receipt_number})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {expense.supplier_name || '-'}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
              
              <TableRow className="bg-muted font-bold">
                <TableCell>TOTALE GENERALE</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right">{formatCurrency(totalBudget)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalSpent)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalBudget - totalSpent)}</TableCell>
                <TableCell className="text-right">
                  {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
