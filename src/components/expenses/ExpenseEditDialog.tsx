import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Expense } from '@/hooks/useExpenses';

interface ExpenseEditDialogProps {
  expense: Expense;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<Expense>) => Promise<any>;
  projectCategories: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export function ExpenseEditDialog({ 
  expense, 
  open, 
  onOpenChange, 
  onSave,
  projectCategories 
}: ExpenseEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    description: expense.description,
    amount: expense.amount,
    project_category: expense.project_category || '',
    approval_notes: expense.approval_notes || ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(expense.id, {
        description: formData.description,
        amount: formData.amount,
        project_category: formData.project_category,
        approval_notes: formData.approval_notes
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifica Spesa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria Progetto</Label>
              <Select
                value={formData.project_category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_category: value }))}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {projectCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div>
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-xs text-muted-foreground">{cat.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.approval_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, approval_notes: e.target.value }))}
              rows={2}
              placeholder="Aggiungi note o motivazioni della modifica..."
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium mb-1">Informazioni fattura:</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>Numero: {expense.receipt_number || 'N/A'}</div>
              <div>Fornitore: {expense.supplier_name || 'N/A'}</div>
              <div>Data: {new Date(expense.expense_date).toLocaleDateString('it-IT')}</div>
              <div>Categoria std: {expense.category}</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva Modifiche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
