import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeftRight, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCcw, 
  Target
} from 'lucide-react';
import { useBankStatements, type BankTransaction } from '@/hooks/useBankStatements';
import { useExpenses, type Expense } from '@/hooks/useExpenses';

interface MatchingSuggestion {
  transaction: BankTransaction;
  expense: Expense;
  confidence: number;
  reasons: string[];
  autoMatch: boolean;
}

interface ReconciliationEngineProps {
  projectId?: string;
}

export function ReconciliationEngine({ projectId }: ReconciliationEngineProps = {}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [selectedMatch, setSelectedMatch] = useState<MatchingSuggestion | null>(null);
  const [manualNotes, setManualNotes] = useState('');
  const { transactions, reconcileTransaction, refetch: refetchTransactions } = useBankStatements();
  const { expenses, refetch: refetchExpenses } = useExpenses(projectId);

  // Extract reference numbers from text (invoice numbers, etc.)
  const extractReferences = (text: string): string[] => {
    const patterns = [
      /(?:fattura|ft|inv|invoice)[:\s#]*(\d+(?:\/\d+)?)/gi,
      /(?:n\.?|num|nr)[:\s]*(\d+(?:\/\d+)?)/gi,
      /\b(\d{4,})\b/g, // 4+ digit numbers
    ];
    
    const refs = new Set<string>();
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) refs.add(match[1].replace(/\D/g, ''));
      }
    });
    return Array.from(refs);
  };

  // Calculate semantic similarity between two texts
  const semanticSimilarity = (text1: string, text2: string): number => {
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const common = words1.filter(w => words2.includes(w)).length;
    return (common / Math.max(words1.length, words2.length)) * 100;
  };

  // Fuzzy match for supplier names
  const fuzzySupplierMatch = (name1: string, name2: string): number => {
    const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (n1.includes(n2) || n2.includes(n1)) return 100;
    
    // Check for common words
    const words1 = name1.toLowerCase().split(/\s+/);
    const words2 = name2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(w => w.length > 2 && words2.includes(w)).length;
    
    if (commonWords > 0) {
      return (commonWords / Math.max(words1.length, words2.length)) * 100;
    }
    
    return 0;
  };

  const calculateMatch = (transaction: BankTransaction, expense: Expense): {
    confidence: number;
    reasons: string[];
  } => {
    let confidence = 0;
    const reasons: string[] = [];

    // Amount matching (most important - 50 points)
    const amountDiff = Math.abs(Math.abs(transaction.amount) - expense.amount);
    const amountPercent = (amountDiff / expense.amount) * 100;
    
    if (amountDiff < 0.01) {
      confidence += 50;
      reasons.push('✓ Importo esatto');
    } else if (amountPercent < 2) {
      confidence += 45;
      reasons.push('✓ Importo quasi esatto');
    } else if (amountPercent < 5) {
      confidence += 35;
      reasons.push('~ Importo molto simile');
    } else if (amountPercent < 10) {
      confidence += 20;
      reasons.push('~ Importo simile');
    } else if (amountPercent < 20) {
      confidence += 10;
      reasons.push('~ Importo approssimativo');
    }

    // Supplier name matching (30 points)
    const transactionCounterpart = transaction.counterpart_name?.toLowerCase() || '';
    const transactionDesc = transaction.description.toLowerCase();
    const supplier = expense.supplier_name?.toLowerCase() || '';
    
    if (supplier) {
      let supplierScore = 0;
      
      // Check exact match in counterpart
      if (transactionCounterpart && (transactionCounterpart.includes(supplier) || supplier.includes(transactionCounterpart))) {
        supplierScore = 30;
        reasons.push('✓ Fornitore match esatto');
      } 
      // Check exact match in description
      else if (transactionDesc.includes(supplier) || supplier.includes(transactionDesc)) {
        supplierScore = 25;
        reasons.push('✓ Fornitore nella descrizione');
      }
      // Fuzzy match on counterpart
      else if (transactionCounterpart) {
        const fuzzyScore = fuzzySupplierMatch(transactionCounterpart, supplier);
        if (fuzzyScore > 60) {
          supplierScore = 20;
          reasons.push('~ Fornitore simile');
        } else if (fuzzyScore > 30) {
          supplierScore = 10;
          reasons.push('~ Possibile fornitore');
        }
      }
      
      confidence += supplierScore;
    }

    // Reference number matching (20 points)
    const transactionRefs = extractReferences(transactionDesc);
    const expenseRefs = extractReferences(expense.description);
    const expenseReceiptRefs = expense.receipt_number ? extractReferences(expense.receipt_number) : [];
    
    const allExpenseRefs = [...expenseRefs, ...expenseReceiptRefs];
    const hasCommonRef = transactionRefs.some(tRef => 
      allExpenseRefs.some(eRef => eRef.includes(tRef) || tRef.includes(eRef))
    );
    
    if (hasCommonRef) {
      confidence += 20;
      reasons.push('✓ Numero fattura/riferimento match');
    }

    // Semantic description matching (15 points)
    const expenseDesc = expense.description.toLowerCase();
    const similarity = semanticSimilarity(transactionDesc, expenseDesc);
    
    if (similarity > 50) {
      confidence += 15;
      reasons.push('✓ Descrizioni molto simili');
    } else if (similarity > 25) {
      confidence += 10;
      reasons.push('~ Descrizioni simili');
    } else if (similarity > 10) {
      confidence += 5;
      reasons.push('~ Alcune parole in comune');
    }

    // Date matching (10 points)
    const transactionDate = new Date(transaction.transaction_date);
    const expenseDate = new Date(expense.expense_date);
    const daysDiff = Math.abs((transactionDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      confidence += 10;
      reasons.push('✓ Stessa data');
    } else if (daysDiff <= 3) {
      confidence += 8;
      reasons.push('✓ Entro 3 giorni');
    } else if (daysDiff <= 7) {
      confidence += 5;
      reasons.push('~ Entro una settimana');
    } else if (daysDiff <= 30) {
      confidence += 3;
      reasons.push('~ Entro un mese');
    }

    // Category matching (5 points)
    if (transaction.category && expense.category && transaction.category === expense.category) {
      confidence += 5;
      reasons.push('✓ Categoria match');
    }

    return { confidence: Math.min(confidence, 100), reasons };
  };

  // Calculate matching suggestions
  const matchingSuggestions = useMemo(() => {
    const unreconciled = transactions.filter(t => !t.is_reconciled);
    // Filter expenses that are not already reconciled with a bank transaction
    const availableExpenses = expenses.filter(e => 
      !transactions.some(t => t.expense_id === e.id && t.is_reconciled)
    );
    
    const suggestions: MatchingSuggestion[] = [];

    unreconciled.forEach(transaction => {
      availableExpenses.forEach(expense => {
        const match = calculateMatch(transaction, expense);
        if (match.confidence >= 30) { // Include low confidence matches for manual review
          suggestions.push({
            transaction,
            expense,
            confidence: match.confidence,
            reasons: match.reasons,
            autoMatch: match.confidence >= confidenceThreshold
          });
        }
      });
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }, [transactions, expenses, confidenceThreshold]);

  const filteredSuggestions = useMemo(() => {
    if (!searchTerm) return matchingSuggestions;
    
    return matchingSuggestions.filter(suggestion => 
      suggestion.transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suggestion.expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suggestion.expense.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [matchingSuggestions, searchTerm]);

  const handleAutoReconcile = async () => {
    const autoMatches = filteredSuggestions.filter(s => s.autoMatch);
    
    for (const match of autoMatches) {
      await reconcileTransaction(
        match.transaction.id,
        match.expense.id,
        match.confidence / 100,
        `Auto-reconciled: ${match.reasons.join(', ')}`
      );
    }
    
    // Refresh data after reconciliation
    await refetchTransactions();
    await refetchExpenses();
  };

  const handleManualReconcile = async (suggestion: MatchingSuggestion) => {
    await reconcileTransaction(
      suggestion.transaction.id,
      suggestion.expense.id,
      suggestion.confidence / 100,
      manualNotes || `Manual reconciliation: ${suggestion.reasons.join(', ')}`
    );
    setSelectedMatch(null);
    setManualNotes('');
    
    // Refresh data after reconciliation
    await refetchTransactions();
    await refetchExpenses();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'default';
    if (confidence >= 60) return 'secondary';
    return 'destructive';
  };

  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency
    }).format(Math.abs(amount));
  };

  const autoMatchCount = filteredSuggestions.filter(s => s.autoMatch).length;
  const totalMatches = filteredSuggestions.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Reconciliation Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Total Matches</span>
                </div>
                <div className="text-2xl font-bold">{totalMatches}</div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium">Auto Matches</span>
                </div>
                <div className="text-2xl font-bold text-success">{autoMatchCount}</div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Manual Review</span>
                </div>
                <div className="text-2xl font-bold text-warning">{totalMatches - autoMatchCount}</div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="text-2xl font-bold">{confidenceThreshold}%</div>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search transactions or expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-48">
                <Select value={confidenceThreshold.toString()} onValueChange={(value) => setConfidenceThreshold(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Confidence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50% Confidence</SelectItem>
                    <SelectItem value="60">60% Confidence</SelectItem>
                    <SelectItem value="70">70% Confidence</SelectItem>
                    <SelectItem value="80">80% Confidence</SelectItem>
                    <SelectItem value="90">90% Confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAutoReconcile}
                disabled={autoMatchCount === 0}
                variant="default"
              >
                Auto-reconcile {autoMatchCount} matches
              </Button>
            </div>

            {/* Matching Suggestions */}
            <div className="space-y-4">
              {filteredSuggestions.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    No matching suggestions found. Try adjusting the confidence threshold or check for unreconciled transactions.
                  </AlertDescription>
                </Alert>
              ) : (
                filteredSuggestions.map((suggestion, index) => (
                  <Card key={`${suggestion.transaction.id}-${suggestion.expense.id}`} className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Transaction */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Transaction</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(suggestion.transaction.transaction_date).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        <p className="font-medium">{suggestion.transaction.description}</p>
                        {suggestion.transaction.counterpart_name && (
                          <p className="text-sm text-muted-foreground">
                            {suggestion.transaction.counterpart_name}
                          </p>
                        )}
                        <p className="text-lg font-semibold">
                          {suggestion.transaction.transaction_type === 'credit' ? '+' : '-'}
                          {formatAmount(suggestion.transaction.amount, suggestion.transaction.currency)}
                        </p>
                      </div>

                      {/* Confidence & Reasons */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getConfidenceColor(suggestion.confidence)}>
                            {suggestion.confidence}% Match
                          </Badge>
                          {suggestion.autoMatch && (
                            <Badge variant="default" className="bg-green-500 text-white">Auto</Badge>
                          )}
                        </div>
                        <Progress value={suggestion.confidence} className="h-2" />
                        <div className="space-y-1">
                          {suggestion.reasons.map((reason, idx) => (
                            <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-success" />
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Expense */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">Expense</Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(suggestion.expense.expense_date).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        <p className="font-medium">{suggestion.expense.description}</p>
                        {suggestion.expense.supplier_name && (
                          <p className="text-sm text-muted-foreground">
                            {suggestion.expense.supplier_name}
                          </p>
                        )}
                        <p className="text-lg font-semibold">
                          {formatAmount(suggestion.expense.amount)}
                        </p>
                        
                        <div className="flex gap-2 mt-3">
                          {suggestion.autoMatch ? (
                            <Badge variant="default" className="text-xs bg-green-500 text-white">
                              Will auto-reconcile
                            </Badge>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedMatch(suggestion)}
                                >
                                  Manual Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manual Reconciliation</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Match Details</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="font-medium">Transaction</p>
                                        <p>{suggestion.transaction.description}</p>
                                        <p>{formatAmount(suggestion.transaction.amount)}</p>
                                      </div>
                                      <div>
                                        <p className="font-medium">Expense</p>
                                        <p>{suggestion.expense.description}</p>
                                        <p>{formatAmount(suggestion.expense.amount)}</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Notes (optional)</label>
                                    <Textarea
                                      value={manualNotes}
                                      onChange={(e) => setManualNotes(e.target.value)}
                                      placeholder="Add any notes about this reconciliation..."
                                      className="mt-1"
                                    />
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleManualReconcile(suggestion)}
                                      className="flex-1"
                                    >
                                      Confirm Reconciliation
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => setSelectedMatch(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}