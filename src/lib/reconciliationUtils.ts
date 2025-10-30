import { BankTransaction } from '@/hooks/useBankStatements';
import { Expense } from '@/hooks/useExpenses';

// Extract reference numbers from text (invoice numbers, etc.)
export const extractReferences = (text: string): string[] => {
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
export const semanticSimilarity = (text1: string, text2: string): number => {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const common = words1.filter(w => words2.includes(w)).length;
  return (common / Math.max(words1.length, words2.length)) * 100;
};

// Fuzzy match for supplier names
export const fuzzySupplierMatch = (name1: string, name2: string): number => {
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

export interface ReconciliationMatch {
  confidence: number;
  reasons: string[];
  transaction?: BankTransaction;
}

export const calculateReconciliationMatch = (
  transaction: BankTransaction, 
  expense: Expense
): ReconciliationMatch => {
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

  return { 
    confidence: Math.min(confidence, 100), 
    reasons,
    transaction
  };
};

/**
 * Find the best matching bank transaction for an expense
 * @param expense The expense to match
 * @param transactions All available bank transactions
 * @param minConfidence Minimum confidence threshold (default: 70%)
 * @returns The best match or null if no match found above threshold
 */
export const findBestTransactionMatch = (
  expense: Expense,
  transactions: BankTransaction[],
  minConfidence: number = 70
): ReconciliationMatch | null => {
  let bestMatch: ReconciliationMatch | null = null;

  for (const transaction of transactions) {
    const match = calculateReconciliationMatch(transaction, expense);
    
    if (match.confidence >= minConfidence && 
        (!bestMatch || match.confidence > bestMatch.confidence)) {
      bestMatch = match;
    }
  }

  return bestMatch;
};

/**
 * Check if an expense is reconciled (either manually or automatically)
 */
export const isExpenseReconciled = (
  expenseId: string,
  transactions: BankTransaction[]
): boolean => {
  return transactions.some(t => t.expense_id === expenseId && t.is_reconciled);
};
