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
  const { transactions, reconcileTransaction } = useBankStatements();
  const { expenses } = useExpenses(projectId);

  // Calculate matching suggestions
  const matchingSuggestions = useMemo(() => {
    const unreconciled = transactions.filter(t => !t.is_reconciled);
    const pendingExpenses = expenses.filter(e => !e.is_approved);
    
    const suggestions: MatchingSuggestion[] = [];

    unreconciled.forEach(transaction => {
      pendingExpenses.forEach(expense => {
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

  const calculateMatch = (transaction: BankTransaction, expense: Expense): {
    confidence: number;
    reasons: string[];
  } => {
    let confidence = 0;
    const reasons: string[] = [];

    // Amount matching (most important)
    const amountDiff = Math.abs(Math.abs(transaction.amount) - expense.amount);
    const amountPercent = (amountDiff / expense.amount) * 100;
    
    if (amountDiff < 0.01) {
      confidence += 50;
      reasons.push('Exact amount match');
    } else if (amountPercent < 5) {
      confidence += 40;
      reasons.push('Very close amount match');
    } else if (amountPercent < 10) {
      confidence += 25;
      reasons.push('Close amount match');
    } else if (amountPercent < 20) {
      confidence += 10;
      reasons.push('Approximate amount match');
    }

    // Date matching
    const transactionDate = new Date(transaction.transaction_date);
    const expenseDate = new Date(expense.expense_date);
    const daysDiff = Math.abs((transactionDate.getTime() - expenseDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      confidence += 25;
      reasons.push('Same date');
    } else if (daysDiff <= 3) {
      confidence += 15;
      reasons.push('Within 3 days');
    } else if (daysDiff <= 7) {
      confidence += 10;
      reasons.push('Within a week');
    } else if (daysDiff <= 30) {
      confidence += 5;
      reasons.push('Within a month');
    }

    // Description/supplier matching
    const transactionDesc = transaction.description.toLowerCase();
    const expenseDesc = expense.description.toLowerCase();
    const supplier = expense.supplier_name?.toLowerCase() || '';
    
    if (supplier && (transactionDesc.includes(supplier) || supplier.includes(transactionDesc))) {
      confidence += 20;
      reasons.push('Supplier name match');
    } else if (transactionDesc.includes(expenseDesc) || expenseDesc.includes(transactionDesc)) {
      confidence += 15;
      reasons.push('Description similarity');
    }

    // Category matching
    if (transaction.category && expense.category && transaction.category === expense.category) {
      confidence += 10;
      reasons.push('Category match');
    }

    // Reference number matching
    if (transaction.reference_number && expense.receipt_number && 
        transaction.reference_number === expense.receipt_number) {
      confidence += 15;
      reasons.push('Reference number match');
    }

    return { confidence: Math.min(confidence, 100), reasons };
  };

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