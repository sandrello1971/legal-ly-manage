import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Search, ArrowUpDown, TrendingUp, TrendingDown, Tag, Building2 } from 'lucide-react';
import { useBankStatements, type BankTransaction } from '@/hooks/useBankStatements';
import { useProjects } from '@/hooks/useProjects';

export function TransactionParser() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const { transactions, updateTransaction } = useBankStatements();
  const { projects } = useProjects();

  // Auto-categorization rules
  const categorizationRules = [
    { keyword: 'salary', category: 'salary', priority: 1 },
    { keyword: 'stipendio', category: 'salary', priority: 1 },
    { keyword: 'rent', category: 'rent', priority: 2 },
    { keyword: 'affitto', category: 'rent', priority: 2 },
    { keyword: 'fuel', category: 'travel', priority: 3 },
    { keyword: 'carburante', category: 'travel', priority: 3 },
    { keyword: 'office', category: 'office', priority: 4 },
    { keyword: 'ufficio', category: 'office', priority: 4 },
    { keyword: 'restaurant', category: 'meals', priority: 5 },
    { keyword: 'meal', category: 'meals', priority: 5 },
    { keyword: 'software', category: 'software', priority: 6 },
    { keyword: 'subscription', category: 'software', priority: 6 },
    { keyword: 'consulting', category: 'professional_services', priority: 7 },
    { keyword: 'professional', category: 'professional_services', priority: 7 }
  ];

  // Project relevance scoring
  const calculateProjectRelevance = (transaction: BankTransaction) => {
    if (!projects.length) return [];

    return projects.map(project => {
      let score = 0;
      const description = transaction.description.toLowerCase();
      const counterpart = transaction.counterpart_name?.toLowerCase() || '';

      // Check if description contains project keywords
      if (project.title && description.includes(project.title.toLowerCase())) {
        score += 50;
      }
      if (project.description && description.includes(project.description.toLowerCase())) {
        score += 30;
      }

      // Check transaction amount patterns
      if (project.total_budget && Math.abs(transaction.amount) <= project.total_budget) {
        score += 20;
      }

      // Check date ranges
      if (project.start_date && project.end_date) {
        const transactionDate = new Date(transaction.transaction_date);
        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);
        
        if (transactionDate >= startDate && transactionDate <= endDate) {
          score += 30;
        }
      }

      return {
        project,
        score: Math.min(score, 100),
        confidence: score > 50 ? 'high' : score > 20 ? 'medium' : 'low'
      };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  // Auto-categorize transactions
  const autoCategorizeTransaction = (transaction: BankTransaction) => {
    const description = transaction.description.toLowerCase();
    
    for (const rule of categorizationRules) {
      if (description.includes(rule.keyword)) {
        return {
          category: rule.category,
          confidence: 0.8 - (rule.priority * 0.1)
        };
      }
    }
    
    return { category: 'other', confidence: 0.3 };
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.counterpart_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      const matchesType = typeFilter === 'all' || transaction.transaction_type === typeFilter;
      const matchesProject = projectFilter === 'all' || transaction.project_id === projectFilter;

      return matchesSearch && matchesCategory && matchesType && matchesProject;
    });
  }, [transactions, searchTerm, categoryFilter, typeFilter, projectFilter]);

  const handleBulkCategorize = async () => {
    for (const transactionId of selectedTransactions) {
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction && !transaction.category) {
        const { category } = autoCategorizeTransaction(transaction);
        await updateTransaction(transactionId, { category });
      }
    }
    setSelectedTransactions([]);
  };

  const handleAssignToProject = async (projectId: string) => {
    for (const transactionId of selectedTransactions) {
      await updateTransaction(transactionId, { project_id: projectId });
    }
    setSelectedTransactions([]);
  };

  const toggleTransactionSelection = (transactionId: string) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const getTransactionIcon = (type: 'debit' | 'credit') => {
    return type === 'credit' ? (
      <TrendingUp className="h-4 w-4 text-success" />
    ) : (
      <TrendingDown className="h-4 w-4 text-destructive" />
    );
  };

  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency
    }).format(Math.abs(amount));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Transaction Parser & Categorizer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="travel">Travel</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="meals">Meals</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="professional_services">Professional Services</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedTransactions.length > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedTransactions.length} transaction(s) selected
                </span>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkCategorize}
                >
                  <Tag className="h-4 w-4 mr-1" />
                  Auto-categorize
                </Button>
                <Select onValueChange={handleAssignToProject}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Assign to project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Transactions Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTransactions.length === filteredTransactions.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTransactions(filteredTransactions.map(t => t.id));
                          } else {
                            setSelectedTransactions([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Reconciled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => {
                    const projectRelevance = calculateProjectRelevance(transaction);
                    const autoCategorization = transaction.category ? null : autoCategorizeTransaction(transaction);
                    
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTransactions.includes(transaction.id)}
                            onCheckedChange={() => toggleTransactionSelection(transaction.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(transaction.transaction_date).toLocaleDateString('it-IT')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            {transaction.counterpart_name && (
                              <p className="text-sm text-muted-foreground">
                                {transaction.counterpart_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            <span className={transaction.transaction_type === 'credit' ? 'text-success' : 'text-destructive'}>
                              {transaction.transaction_type === 'credit' ? '+' : '-'}
                              {formatAmount(transaction.amount, transaction.currency)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transaction.category ? (
                            <Badge variant="outline">{transaction.category}</Badge>
                          ) : autoCategorization ? (
                            <Badge variant="secondary" className="opacity-60">
                              {autoCategorization.category} (suggested)
                            </Badge>
                          ) : (
                            <Badge variant="outline">uncategorized</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.project_id ? (
                            <Badge variant="outline">
                              {projects.find(p => p.id === transaction.project_id)?.title || 'Unknown'}
                            </Badge>
                          ) : projectRelevance.length > 0 ? (
                            <div className="space-y-1">
                              {projectRelevance.slice(0, 1).map(item => (
                                <Badge 
                                  key={item.project.id} 
                                  variant="secondary" 
                                  className="opacity-60"
                                >
                                  {item.project.title} ({item.score}%)
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.is_reconciled ? "default" : "secondary"} className={transaction.is_reconciled ? "bg-success text-success-foreground" : ""}>
                            {transaction.is_reconciled ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found matching your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}