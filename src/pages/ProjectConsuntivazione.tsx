import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, FileText, AlertCircle, Trash2, Pencil, CheckCircle2, XCircle } from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { useExpenses } from '@/hooks/useExpenses';
import { useBankStatements } from '@/hooks/useBankStatements';
import { findBestTransactionMatch, isExpenseReconciled } from '@/lib/reconciliationUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BankStatementUploader } from '@/components/banking/BankStatementUploader';
import { ReconciliationEngine } from '@/components/banking/ReconciliationEngine';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useBandi } from '@/hooks/useBandi';
import { ExpenseEditDialog } from '@/components/expenses/ExpenseEditDialog';

import { Expense } from '@/hooks/useExpenses';

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
  const { expenses, loading: loadingExpenses, deleteExpense, updateExpense, refetch: refetchExpenses } = useExpenses(projectId);
  const { transactions, refetch: refetchTransactions } = useBankStatements();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Get reconciliation status for an expense
  const getExpenseReconciliationStatus = (expenseId: string, expense: Expense) => {
    // First check if manually reconciled
    if (isExpenseReconciled(expenseId, transactions)) {
      return { isReconciled: true, confidence: 100, isManual: true };
    }
    
    // Otherwise check for automatic match
    const match = findBestTransactionMatch(expense, transactions, 80);
    if (match && match.confidence >= 80) {
      return { isReconciled: true, confidence: match.confidence, isManual: false, match };
    }
    
    return { isReconciled: false, confidence: 0, isManual: false };
  };

  const project = useMemo(() => 
    projects.find(p => p.id === projectId),
    [projects, projectId]
  );

  // Extract categories from project's parsed_data
  const projectCategories = useMemo(() => {
    const categories: ExpenseCategory[] = [];
    
    // Get categories from project's parsed budget data
    if (project?.parsed_data?.budget?.categories && project.parsed_data.budget.categories.length > 0) {
      categories.push(...project.parsed_data.budget.categories.map((cat: any) => ({
        id: cat.name.toLowerCase().replace(/\s+/g, '_'),
        name: cat.name,
        description: cat.description || '',
        max_percentage: cat.max_percentage,
        max_amount: cat.allocated_amount
      })));
    }
    
    // Aggiungi categorie dalle spese esistenti che non sono nel budget
    const expenseCategories = new Set(
      expenses
        .map(e => e.project_category || e.category)
        .filter(Boolean)
    );
    
    expenseCategories.forEach(catKey => {
      if (catKey && !categories.some(c => c.id === catKey)) {
        // Aggiungi categoria mancante
        categories.push({
          id: catKey,
          name: catKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: 'Categoria dalle spese',
          max_percentage: null,
          max_amount: null
        });
      }
    });
    
    // Aggiungi categoria "other" per spese senza categoria
    if (!categories.some(c => c.id === 'other')) {
      categories.push({
        id: 'other',
        name: 'Altro',
        description: 'Spese non categorizzate',
        max_percentage: null,
        max_amount: null
      });
    }
    
    return categories;
  }, [project, expenses]);

  // Group expenses by project_category (AI-classified)
  const expensesByCategory = useMemo(() => {
    if (projectCategories.length === 0) return {};
    
    const grouped: Record<string, typeof expenses> = {};
    projectCategories.forEach(cat => {
      grouped[cat.id] = [];
    });

    expenses.forEach(expense => {
      // Use project_category if available (AI-classified), otherwise fallback to category
      const categoryKey = expense.project_category || expense.category;
      
      if (categoryKey) {
        // Se la categoria esiste già, aggiungi la spesa
        if (grouped[categoryKey]) {
          grouped[categoryKey].push(expense);
        } else {
          // Se la categoria non esiste ancora, creala
          console.warn(`Category "${categoryKey}" not found in project categories, creating it`);
          grouped[categoryKey] = [expense];
        }
      } else {
        // Spese senza categoria vanno in "other"
        if (!grouped['other']) {
          grouped['other'] = [];
        }
        grouped['other'].push(expense);
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

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="reconciliation">Riconciliazione Bancaria</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                    <TableHead className="w-[80px]">Azioni</TableHead>
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
                  <React.Fragment key={category.id}>
                    <TableRow
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
                          <TableCell></TableCell>
                        </TableRow>
                        
                        {categoryExpenses.map(expense => {
                          const reconStatus = getExpenseReconciliationStatus(expense.id, expense);
                          // Split description by commas to show multiple items
                          const items = expense.description.split(',').map(item => item.trim()).filter(item => item.length > 0);
                          
                          // Find potential matching transactions for manual reconciliation
                          const matchingTransactions = transactions.filter(t => 
                            !t.is_reconciled && 
                            Math.abs(Math.abs(t.amount) - expense.amount) / expense.amount < 0.2
                          );
                          
                          return (
                          <TableRow key={expense.id} className="border-l-4 border-l-muted">
                            <TableCell className="pl-8">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <FileText className="h-3 w-3 flex-shrink-0" />
                                  <div className="flex-1">
                                    {items.length > 1 ? (
                                      <div className="space-y-0.5">
                                        {items.map((item, idx) => (
                                          <div key={idx} className="flex items-start gap-1.5">
                                            <span className="text-xs mt-0.5">•</span>
                                            <span>{item}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <span>{expense.description}</span>
                                    )}
                                  </div>
                                  {expense.receipt_number && (
                                    <span className="text-xs flex-shrink-0">({expense.receipt_number})</span>
                                  )}
                                  
                                  {/* Reconciliation Status */}
                                  {(() => {
                                    if (reconStatus.isReconciled) {
                                      const matchedTransaction = reconStatus.match?.transaction;
                                      
                                      return (
                                        <div className="flex flex-col gap-1">
                                          <Badge 
                                            variant="default" 
                                            className="bg-green-600 hover:bg-green-700 text-white gap-1 whitespace-nowrap flex-shrink-0"
                                            title={reconStatus.isManual 
                                              ? "Riconciliata manualmente" 
                                              : `Riconciliata automaticamente (${reconStatus.confidence}%)`
                                            }
                                          >
                                            <CheckCircle2 className="h-3 w-3" />
                                            Rendicontabile
                                          </Badge>
                                          {matchedTransaction && (
                                            <div className="text-xs text-muted-foreground">
                                              Mov. bancario: {new Date(matchedTransaction.transaction_date).toLocaleDateString('it-IT')} - €{matchedTransaction.amount.toFixed(2)}
                                              {matchedTransaction.description && (
                                                <span className="block truncate max-w-[200px]" title={matchedTransaction.description}>
                                                  {matchedTransaction.description}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else {
                                      // Check if there's a potential match
                                      const potentialMatch = findBestTransactionMatch(expense, transactions, 50);
                                      
                                      if (potentialMatch && potentialMatch.confidence >= 50) {
                                        return (
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <Badge 
                                              variant="secondary" 
                                              className="bg-yellow-100 text-yellow-800 gap-1 whitespace-nowrap"
                                              title={`Possibile match trovato (${potentialMatch.confidence}%) - Verifica manualmente`}
                                            >
                                              <AlertCircle className="h-3 w-3" />
                                              Verifica richiesta
                                            </Badge>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-6 text-xs"
                                              onClick={() => navigate(`/projects/${projectId}/consuntivazione?tab=riconciliazione`)}
                                            >
                                              Riconcilia
                                            </Button>
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <Badge 
                                          variant="secondary" 
                                          className="gap-1 whitespace-nowrap flex-shrink-0"
                                          title="Nessun pagamento trovato nell'estratto conto"
                                        >
                                          <XCircle className="h-3 w-3" />
                                          Non riconciliata
                                        </Badge>
                                      );
                                    }
                                  })()}
                                </div>
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
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-accent"
                                  onClick={() => setEditingExpense(expense)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Sei sicuro di voler eliminare questa spesa? L'operazione non può essere annullata.
                                        <br /><br />
                                        <strong>Spesa:</strong> {expense.description}
                                        <br />
                                        <strong>Importo:</strong> {formatCurrency(expense.amount)}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteExpense(expense.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Elimina
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                      </TableRow>
                        );
                      })}
                  </React.Fragment>
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
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Carica Estratto Conto Bancario</CardTitle>
              <p className="text-sm text-muted-foreground">
                Carica l'estratto conto per verificare i pagamenti delle fatture del progetto. Formati supportati: CSV, XML, MT940, PDF
              </p>
            </CardHeader>
            <CardContent>
              <BankStatementUploader />
            </CardContent>
          </Card>

          <ReconciliationEngine projectId={projectId} />
        </TabsContent>
      </Tabs>

      {editingExpense && (
        <ExpenseEditDialog
          expense={editingExpense}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSave={updateExpense}
          projectCategories={projectCategories}
        />
      )}
    </div>
  );
}
