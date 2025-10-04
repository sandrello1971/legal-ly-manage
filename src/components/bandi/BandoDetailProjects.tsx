import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, BarChart3 } from "lucide-react";
import { type Project } from "@/hooks/useProjects";

interface BandoDetailProjectsProps {
  projects: Project[];
  onCreateProject: () => void;
  onSelectProject: (project: Project) => void;
}

export const BandoDetailProjects = ({ projects, onCreateProject, onSelectProject }: BandoDetailProjectsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Progetti Collegati ({projects.length})
        </CardTitle>
        <Button size="sm" onClick={onCreateProject}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Progetto
        </Button>
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelectProject(project)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{project.title}</h4>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                  <p>Budget: {formatCurrency(project.total_budget)}</p>
                  <p>Speso: {formatCurrency(project.spent_budget)}</p>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mb-1">
                  <div
                    className="bg-primary h-2 rounded-full"
                    style={{ width: `${project.progress_percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso: {project.progress_percentage}%</span>
                  <span>Rimanente: {formatCurrency(project.remaining_budget)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Nessun progetto collegato a questo bando
            </p>
            <Button size="sm" onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Progetto
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
