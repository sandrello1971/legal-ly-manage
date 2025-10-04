import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useBandi, type Bando } from "@/hooks/useBandi";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/use-toast";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";
import { BandoDetailTabs } from "./BandoDetailTabs";
import { BandoDetailOverview } from "./BandoDetailOverview";
import { BandoDetailProjects } from "./BandoDetailProjects";

interface BandoDetailWithTabsProps {
  bandoId: string;
  onBack: () => void;
  onEdit: (bando: Bando) => void;
  onDelete: (id: string) => void;
}

export const BandoDetailWithTabs = ({ bandoId, onBack, onEdit, onDelete }: BandoDetailWithTabsProps) => {
  const [bando, setBando] = useState<Bando | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseData, setExpenseData] = useState<{
    description: string;
    amount: number;
    expense_date: string;
    category: 'personnel' | 'equipment' | 'materials' | 'services' | 'travel' | 'other';
    notes?: string;
  }>({
    description: '',
    amount: 0,
    expense_date: '',
    category: 'other',
    notes: ''
  });
  
  const { getBandoById } = useBandi();
  const { projects, refetch: refetchProjects } = useProjects(bandoId);
  const { createExpense } = useExpenses();
  const { toast } = useToast();

  useEffect(() => {
    const fetchBando = async () => {
      try {
        setLoading(true);
        const bandoData = await getBandoById(bandoId);
        setBando(bandoData);
      } catch (error) {
        console.error('Error fetching bando:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBando();
  }, [bandoId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!bando) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p>Bando non trovato</p>
            <Button onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla Lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      draft: '📝',
      active: '✅',
      expired: '⏰',
      completed: '🏁'
    };
    return icons[status as keyof typeof icons] || '📄';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      draft: 'Bozza',
      active: 'Attivo',
      expired: 'Scaduto',
      completed: 'Completato'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusVariant = (status: string) => {
    const variants = {
      draft: 'secondary',
      active: 'default',
      expired: 'destructive',
      completed: 'outline'
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const handleProjectSuccess = () => {
    setShowProjectForm(false);
    setEditingProject(null);
    refetchProjects();
  };

  const handleEditProject = () => {
    setEditingProject(selectedProject);
    setShowProjectForm(true);
    setSelectedProject(null);
  };

  const handleAddExpense = () => {
    setShowExpenseDialog(true);
  };

  const handleSaveExpense = async () => {
    if (!selectedProject) return;
    
    try {
      await createExpense({
        ...expenseData,
        project_id: selectedProject.id,
        is_approved: false
      });
      
      toast({
        title: 'Successo',
        description: 'Spesa aggiunta con successo',
      });
      
      setShowExpenseDialog(false);
      setExpenseData({
        description: '',
        amount: 0,
        expense_date: '',
        category: 'other',
        notes: ''
      });
      
      refetchProjects();
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante il salvataggio della spesa',
        variant: 'destructive',
      });
    }
  };

  // Show project form
  if (showProjectForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setShowProjectForm(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro al Bando
          </Button>
          <h1 className="text-2xl font-bold">
            {editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}
          </h1>
        </div>
        <ProjectForm
          bandoId={bandoId}
          onSuccess={handleProjectSuccess}
          onCancel={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}
          initialData={editingProject || undefined}
        />
      </div>
    );
  }

  // Show project dashboard
  if (selectedProject) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setSelectedProject(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro al Bando
          </Button>
        </div>
        <ProjectDashboard
          project={selectedProject}
          onEditProject={handleEditProject}
          onAddExpense={handleAddExpense}
        />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{bando.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusVariant(bando.status) as any}>
                  <span className="mr-1">{getStatusIcon(bando.status)}</span>
                  {getStatusLabel(bando.status)}
                </Badge>
                {bando.organization && (
                  <Badge variant="outline">
                    <Building2 className="h-3 w-3 mr-1" />
                    {bando.organization}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEdit(bando)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
            <Button variant="destructive" onClick={() => onDelete(bando.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </Button>
          </div>
        </div>

        {/* Tabs with content */}
        <BandoDetailTabs
          bando={bando}
          overviewContent={
            <BandoDetailOverview bando={bando} onEdit={onEdit} />
          }
          projectsContent={
            <BandoDetailProjects
              projects={projects || []}
              onCreateProject={() => setShowProjectForm(true)}
              onSelectProject={setSelectedProject}
            />
          }
        />
      </div>

      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Spesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrizione *</Label>
              <Input
                id="description"
                value={expenseData.description}
                onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
                placeholder="Descrizione della spesa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Importo (€) *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={expenseData.amount}
                onChange={(e) => setExpenseData({ ...expenseData, amount: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date">Data Spesa *</Label>
              <Input
                id="expense_date"
                type="date"
                value={expenseData.expense_date}
                onChange={(e) => setExpenseData({ ...expenseData, expense_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select value={expenseData.category} onValueChange={(value: any) => setExpenseData({ ...expenseData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personnel">Personale</SelectItem>
                  <SelectItem value="equipment">Attrezzature</SelectItem>
                  <SelectItem value="materials">Materiali</SelectItem>
                  <SelectItem value="services">Servizi</SelectItem>
                  <SelectItem value="travel">Trasferte</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <Textarea
                id="notes"
                value={expenseData.notes}
                onChange={(e) => setExpenseData({ ...expenseData, notes: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExpenseDialog(false)}>
                Annulla
              </Button>
              <Button onClick={handleSaveExpense}>
                Salva Spesa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
