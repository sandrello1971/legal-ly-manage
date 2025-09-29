import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/config/expenseCategories';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Brain, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Settings, 
  Edit, 
  Save,
  RotateCcw,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { useExpenses, type Expense } from '@/hooks/useExpenses';

interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  category: string;
  confidence_threshold: number;
  is_active: boolean;
  success_rate: number;
  total_applications: number;
  created_at: string;
}

interface ClassificationSuggestion {
  expenseId: string;
  originalCategory: string;
  suggestedCategory: string;
  confidence: number;
  reasons: string[];
  similarExpenses: Expense[];
}

export function ExpenseAutoClassifier() {
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [suggestions, setSuggestions] = useState<ClassificationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ClassificationRule | null>(null);
  const [isEditingRule, setIsEditingRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    keywords: '',
    category: '',
    confidence_threshold: 0.8,
    is_active: true
  });

  const { expenses, updateExpense } = useExpenses();

  // Load classification rules from database
  useEffect(() => {
    // TODO: Load actual classification rules from database
    setRules([]);
    setSuggestions([]);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-success';
    if (confidence >= 0.7) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Alta';
    if (confidence >= 0.7) return 'Media';
    return 'Bassa';
  };

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category;
  };

  const handleApplySuggestion = async (suggestion: ClassificationSuggestion, feedback: 'accept' | 'reject') => {
    try {
      if (feedback === 'accept') {
        const expense = expenses.find(e => e.id === suggestion.expenseId);
        if (expense) {
          await updateExpense(expense.id, { category: suggestion.suggestedCategory as any });
        }
      }
      
      // Remove suggestion after feedback
      setSuggestions(prev => prev.filter(s => s.expenseId !== suggestion.expenseId));
    } catch (error) {
      console.error('Error applying suggestion:', error);
    }
  };

  const handleSaveRule = () => {
    if (selectedRule && isEditingRule) {
      // Update existing rule
      setRules(prev => prev.map(rule => 
        rule.id === selectedRule.id 
          ? { ...rule, ...newRule, keywords: newRule.keywords.split(',').map(k => k.trim()) }
          : rule
      ));
    } else {
      // Create new rule
      const rule: ClassificationRule = {
        id: Date.now().toString(),
        ...newRule,
        keywords: newRule.keywords.split(',').map(k => k.trim()),
        success_rate: 0,
        total_applications: 0,
        created_at: new Date().toISOString()
      };
      setRules(prev => [...prev, rule]);
    }
    
    setSelectedRule(null);
    setIsEditingRule(false);
    setNewRule({
      name: '',
      description: '',
      keywords: '',
      category: '',
      confidence_threshold: 0.8,
      is_active: true
    });
  };

  const handleEditRule = (rule: ClassificationRule) => {
    setSelectedRule(rule);
    setIsEditingRule(true);
    setNewRule({
      name: rule.name,
      description: rule.description,
      keywords: rule.keywords.join(', '),
      category: rule.category,
      confidence_threshold: rule.confidence_threshold,
      is_active: rule.is_active
    });
  };

  const toggleRuleStatus = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, is_active: !rule.is_active } : rule
    ));
  };

  const runClassification = async () => {
    setLoading(true);
    // Simulate classification process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Regole Attive</p>
                <p className="text-2xl font-bold">{rules.filter(r => r.is_active).length}</p>
              </div>
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasso di Successo Medio</p>
                <p className="text-2xl font-bold text-success">
                  {rules.length > 0 ? (rules.reduce((sum, r) => sum + r.success_rate, 0) / rules.length).toFixed(1) : 0}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suggerimenti Attivi</p>
                <p className="text-2xl font-bold text-warning">{suggestions.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classification Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Classificazione Automatica
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={runClassification} disabled={loading}>
                {loading ? 'Classificando...' : 'Esegui Classificazione'}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Nuova Regola
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {isEditingRule ? 'Modifica Regola' : 'Nuova Regola di Classificazione'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="rule-name">Nome Regola</Label>
                      <Input
                        id="rule-name"
                        value={newRule.name}
                        onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Es. Spese di Viaggio"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="rule-description">Descrizione</Label>
                      <Input
                        id="rule-description"
                        value={newRule.description}
                        onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Descrizione della regola"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="rule-keywords">Parole Chiave (separate da virgola)</Label>
                      <Input
                        id="rule-keywords"
                        value={newRule.keywords}
                        onChange={(e) => setNewRule(prev => ({ ...prev, keywords: e.target.value }))}
                        placeholder="taxi, treno, aereo, hotel"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="rule-category">Categoria Target</Label>
                      <Select value={newRule.category} onValueChange={(value) => setNewRule(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona categoria" />
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
                      <Label htmlFor="rule-threshold">Soglia di Confidenza: {newRule.confidence_threshold}</Label>
                      <Input
                        id="rule-threshold"
                        type="range"
                        min="0.5"
                        max="1"
                        step="0.05"
                        value={newRule.confidence_threshold}
                        onChange={(e) => setNewRule(prev => ({ ...prev, confidence_threshold: parseFloat(e.target.value) }))}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="rule-active"
                        checked={newRule.is_active}
                        onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="rule-active">Regola attiva</Label>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleSaveRule} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        {isEditingRule ? 'Aggiorna' : 'Crea'} Regola
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedRule(null);
                          setIsEditingRule(false);
                          setNewRule({
                            name: '',
                            description: '',
                            keywords: '',
                            category: '',
                            confidence_threshold: 0.8,
                            is_active: true
                          });
                        }}
                      >
                        Annulla
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analizzando spese con AI...</span>
                <span>Elaborazione in corso</span>
              </div>
              <Progress value={undefined} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggerimenti di Riclassificazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((suggestion) => {
                const expense = expenses.find(e => e.id === suggestion.expenseId);
                return (
                  <div key={suggestion.expenseId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{expense?.description || 'Spesa sconosciuta'}</p>
                          <Badge variant="outline" className={getConfidenceColor(suggestion.confidence)}>
                            {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Da: <strong>{getCategoryLabel(suggestion.originalCategory)}</strong></span>
                          <span>→</span>
                          <span>A: <strong>{getCategoryLabel(suggestion.suggestedCategory)}</strong></span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApplySuggestion(suggestion, 'accept')}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplySuggestion(suggestion, 'reject')}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Motivazioni:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {suggestion.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classification Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Regole di Classificazione</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Parole Chiave</TableHead>
                <TableHead>Soglia</TableHead>
                <TableHead>Successo</TableHead>
                <TableHead>Applicazioni</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(rule.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                      {rule.keywords.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{rule.keywords.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{Math.round(rule.confidence_threshold * 100)}%</TableCell>
                  <TableCell className="text-success font-medium">{rule.success_rate.toFixed(1)}%</TableCell>
                  <TableCell>{rule.total_applications}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => toggleRuleStatus(rule.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRule(rule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {rules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna regola di classificazione configurata.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}