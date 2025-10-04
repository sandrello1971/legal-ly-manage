import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useBandi, type Bando } from "@/hooks/useBandi";
import { useProjects, type Project } from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";
import { BandoDetailTabs } from "./BandoDetailTabs";
import { BandoDetailOverview } from "./BandoDetailOverview";
import { BandoDetailProjects } from "./BandoDetailProjects";
import { ExpenseProcessor } from "@/components/expenses/ExpenseProcessor";
import { BandoDocuments } from "./BandoDocuments";
import { BandoBudgetView } from "./BandoBudgetView";

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
  const [showExpenseProcessor, setShowExpenseProcessor] = useState(false);
  
  const { getBandoById } = useBandi();
  const { projects, refetch: refetchProjects } = useProjects(bandoId);
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
    setShowExpenseProcessor(true);
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

  // Show expense processor
  if (showExpenseProcessor && selectedProject) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setShowExpenseProcessor(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro al Progetto
          </Button>
          <h1 className="text-2xl font-bold">Carica Fatture - {selectedProject.title}</h1>
        </div>
        <ExpenseProcessor defaultProjectId={selectedProject.id} />
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
        <ProjectDetailView
          project={selectedProject}
          onEdit={handleEditProject}
          onDelete={() => {
            // TODO: implement delete
            setSelectedProject(null);
          }}
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
          documentsContent={
            <BandoDocuments bandoId={bandoId} />
          }
          budgetContent={
            <BandoBudgetView bando={bando} projects={projects || []} />
          }
        />
      </div>
    </>
  );
};
