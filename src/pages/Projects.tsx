import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProjects, type Project } from '@/hooks/useProjects';
import { ProjectDashboard } from '@/components/projects/ProjectDashboard';
import { ProjectForm } from '@/components/projects/ProjectForm';
import { 
  Search, 
  Plus, 
  FolderOpen, 
  ArrowLeft,
  Euro,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  
  const { projects, loading, refetch } = useProjects();

  const filteredProjects = projects.filter(project => 
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.cup_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return 'Pianificazione';
      case 'in_progress': return 'In Corso';
      case 'on_hold': return 'In Pausa';
      case 'completed': return 'Completato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };

  const handleEditProject = () => {
    setEditingProject(selectedProject);
    setShowProjectForm(true);
    setSelectedProject(null);
  };

  const handleProjectFormSuccess = () => {
    setShowProjectForm(false);
    setEditingProject(null);
    refetch();
  };

  // Show project form
  if (showProjectForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Lista Progetti
          </Button>
          <h1 className="text-2xl font-bold">
            {editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}
          </h1>
        </div>
        <ProjectForm
          bandoId={editingProject?.bando_id || ''}
          onSuccess={handleProjectFormSuccess}
          onCancel={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}
          initialData={editingProject || undefined}
        />
      </div>
    );
  }

  // Show project detail
  if (selectedProject) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setSelectedProject(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla Lista Progetti
          </Button>
        </div>
        <ProjectDashboard
          project={selectedProject}
          onEditProject={handleEditProject}
          onAddExpense={() => {}}
        />
      </div>
    );
  }

  // Show projects list
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Progetti</h1>
          <p className="text-muted-foreground mt-1">
            Gestisci tutti i tuoi progetti in un unico posto
          </p>
        </div>
        <Button onClick={() => setShowProjectForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Progetto
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per titolo, CUP o descrizione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun progetto trovato</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Prova con termini di ricerca diversi' : 'Inizia creando il tuo primo progetto'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowProjectForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Progetto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedProject(project)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                    {project.cup_code && (
                      <div className="mb-2">
                        <Badge variant="outline" className="font-mono text-xs border-primary/50">
                          CUP: {project.cup_code}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Badge className={getStatusColor(project.status)}>
                    {getStatusLabel(project.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Budget Overview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Euro className="h-4 w-4" />
                      Budget
                    </span>
                    <span className="font-medium">{formatCurrency(project.total_budget)}</span>
                  </div>
                  <Progress 
                    value={(project.spent_budget / project.total_budget) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Speso: {formatCurrency(project.spent_budget)}</span>
                    <span>Rimanente: {formatCurrency(project.remaining_budget)}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Progresso
                    </span>
                    <span className="font-medium">{project.progress_percentage}%</span>
                  </div>
                  <Progress value={project.progress_percentage} className="h-2" />
                </div>

                {/* Dates */}
                {(project.start_date || project.end_date) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {project.start_date && format(new Date(project.start_date), 'dd/MM/yy', { locale: it })}
                    {project.start_date && project.end_date && ' - '}
                    {project.end_date && format(new Date(project.end_date), 'dd/MM/yy', { locale: it })}
                  </div>
                )}

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}