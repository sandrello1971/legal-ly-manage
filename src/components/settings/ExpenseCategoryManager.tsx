import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tables } from '@/integrations/supabase/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Target, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ExpenseCategory = Tables<'expense_categories'>;

export function ExpenseCategoryManager() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Partial<ExpenseCategory>>({
    name: '',
    description: '',
    max_percentage: undefined,
    max_amount: undefined,
    eligible_expenses: [],
    is_active: true,
    created_by: undefined
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le categorie di spesa",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      max_percentage: undefined,
      max_amount: undefined,
      eligible_expenses: [],
      is_active: true,
      created_by: undefined
    });
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData(category);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (!formData.name?.trim()) {
        toast({
          title: "Errore",
          description: "Il nome della categoria è obbligatorio",
          variant: "destructive"
        });
        return;
      }

      const categoryData = {
        name: formData.name?.trim() || '',
        description: formData.description?.trim() || null,
        max_percentage: formData.max_percentage || null,
        max_amount: formData.max_amount || null,
        eligible_expenses: formData.eligible_expenses || [],
        is_active: formData.is_active ?? true,
        created_by: editingCategory?.created_by || (await supabase.auth.getUser()).data.user?.id
      };

      let error;
      if (editingCategory?.id) {
        const { error: updateError } = await supabase
          .from('expense_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('expense_categories')
          .insert(categoryData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Successo",
        description: `Categoria ${editingCategory ? 'aggiornata' : 'creata'} con successo`
      });

      setIsDialogOpen(false);
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare la categoria",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Categoria eliminata con successo"
      });

      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la categoria",
        variant: "destructive"
      });
    }
  };

  const loadBandoSI40Categories = async () => {
    const si40Categories = [
      {
        name: 'Consulenza',
        description: 'Consulenza erogata direttamente da fornitori qualificati su tecnologie 4.0',
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      },
      {
        name: 'Formazione',
        description: 'Formazione specifica su tecnologie 4.0 con attestato di frequenza',
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      },
      {
        name: 'Attrezzature tecnologiche',
        description: 'Investimenti in attrezzature tecnologiche e programmi informatici necessari al progetto',
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      },
      {
        name: 'Ingegnerizzazione SW/HW',
        description: 'Servizi e tecnologie per ingegnerizzazione di software/hardware del progetto',
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      },
      {
        name: 'Proprietà industriale',
        description: 'Spese per la tutela della proprietà industriale (brevetti, marchi, etc.)',
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      },
      {
        name: 'Personale dedicato',
        description: 'Spese del personale aziendale dedicato esclusivamente al progetto',
        max_percentage: 30,
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }
    ];

    for (const category of si40Categories) {
      try {
        const { error } = await supabase
          .from('expense_categories')
          .insert(category);

        if (error) throw error;
      } catch (error) {
        console.error('Error inserting category:', error);
      }
    }

    toast({
      title: "Successo",
      description: "Categorie del Bando SI4.0 caricate con successo"
    });

    loadCategories();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Gestione Categorie di Spesa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configura qui le categorie di spesa utilizzate per classificare automaticamente i documenti.
              Le categorie definite qui saranno utilizzate dall'AI per l'analisi dei documenti.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Categoria
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Categoria *</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="es. Consulenza"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Descrizione</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrizione dettagliata della categoria"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="max_percentage">Percentuale Massima (%)</Label>
                      <Input
                        id="max_percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.max_percentage || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          max_percentage: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="es. 30"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="max_amount">Importo Massimo (€)</Label>
                      <Input
                        id="max_amount"
                        type="number"
                        min="0"
                        value={formData.max_amount || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          max_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        placeholder="es. 50000"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Annulla
                    </Button>
                    <Button onClick={handleSaveCategory}>
                      {editingCategory ? 'Aggiorna' : 'Crea'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={loadBandoSI40Categories}>
              Carica Categorie Bando SI4.0
            </Button>
          </div>

          {categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Limiti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-[100px]">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {category.max_percentage && (
                          <Badge variant="outline" className="text-xs">
                            Max {category.max_percentage}%
                          </Badge>
                        )}
                        {category.max_amount && (
                          <Badge variant="outline" className="text-xs">
                            €{category.max_amount.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? 'Attiva' : 'Inattiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => category.id && handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <AlertDescription>
                Nessuna categoria configurata. Clicca su "Carica Categorie Bando SI4.0" per importare le categorie standard.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}