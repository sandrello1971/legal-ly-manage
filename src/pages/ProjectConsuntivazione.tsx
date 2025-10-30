import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useExpenses } from '@/hooks/useExpenses';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/config/expenseCategories';

export default function ProjectConsuntivazione() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, loading: loadingProjects } = useProjects();
  const { expenses, loading: loadingExpenses } = useExpenses(projectId);

  const project = useMemo(() => 
    projects.find(p => p.id === projectId),
    [projects, projectId]
  );

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const grouped: Record<ExpenseCategory, typeof expenses> = {
      consulting: [],
      training: [],
      equipment: [],
      engineering: [],
      intellectual_property: [],
      personnel: [],
    };

    expenses.forEach(expense => {
      if (expense.category && grouped[expense.category as ExpenseCategory]) {
        grouped[expense.category as ExpenseCategory].push(expense);
      }
    });

    return grouped;
  }, [expenses]);

  // Calculate budget per category (distribute equally for now)
  const budgetPerCategory = useMemo(() => {
    if (!project?.total_budget) return {};
    
    const categories = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];
    const equalShare = project.total_budget / categories.length;
    
    return categories.reduce((acc, category) => {
      acc[category] = equalShare;
      return acc;
    }, {} as Record<ExpenseCategory, number>);
  }, [project]);

  // Calculate spent per category
  const spentPerCategory = useMemo(() => {
    const spent: Record<ExpenseCategory, number> = {
      consulting: 0,
      training: 0,
      equipment: 0,
      engineering: 0,
      intellectual_property: 0,
      personnel: 0,
    };

    Object.entries(expensesByCategory).forEach(([category, categoryExpenses]) => {
      spent[category as ExpenseCategory] = categoryExpenses.reduce(
        (sum, expense) => sum + (expense.amount || 0),
        0
      );
    });

    return spent;
  }, [expensesByCategory]);

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

  if (loadingProjects || loadingExpenses) {
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
              {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map(category => {
                const budget = budgetPerCategory[category] || 0;
                const spent = spentPerCategory[category] || 0;
                const remaining = budget - spent;
                const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                const categoryExpenses = expensesByCategory[category] || [];

                return (
                  <>
                    <TableRow
                      key={category}
                      className={getRowColor(spent, budget)}
                    >
                      <TableCell className="font-bold">
                        {EXPENSE_CATEGORY_LABELS[category]}
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
