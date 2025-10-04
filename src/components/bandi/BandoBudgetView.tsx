import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Euro, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { type Bando } from "@/hooks/useBandi";
import { type Project } from "@/hooks/useProjects";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BandoBudgetViewProps {
  bando: Bando;
  projects: Project[];
}

export const BandoBudgetView = ({ bando, projects }: BandoBudgetViewProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Calculate totals
  const totalAllocated = projects.reduce((sum, p) => sum + (p.allocated_budget || 0), 0);
  const totalSpent = projects.reduce((sum, p) => sum + (p.spent_budget || 0), 0);
  const totalRemaining = (bando.total_amount || 0) - totalSpent;
  const budgetUsed = bando.total_amount ? (totalSpent / bando.total_amount) * 100 : 0;

  const warnings = [];
  if (budgetUsed > 90) warnings.push('Budget quasi esaurito (>90%)');
  if (totalSpent > (bando.total_amount || 0)) warnings.push('Budget superato!');
  if (totalAllocated > (bando.total_amount || 0)) warnings.push('Budget allocato superiore al totale disponibile');

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Euro className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Budget Totale Bando</p>
                <p className="text-2xl font-bold">{formatCurrency(bando.total_amount || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Allocato ai Progetti</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
                <p className="text-xs text-muted-foreground">
                  {bando.total_amount ? ((totalAllocated / bando.total_amount) * 100).toFixed(1) : 0}% del totale
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Speso</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                <p className="text-xs text-muted-foreground">{budgetUsed.toFixed(1)}% del budget</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Euro className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rimanente</p>
                <p className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(totalRemaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Utilizzo Budget Complessivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress 
              value={Math.min(budgetUsed, 100)} 
              className={`h-4 ${budgetUsed > 90 ? 'bg-red-100' : ''}`}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0€</span>
              <span>{formatCurrency(bando.total_amount || 0)}</span>
            </div>
            {totalSpent > (bando.total_amount || 0) && (
              <p className="text-sm text-red-600 font-medium">
                Superamento budget: {formatCurrency(totalSpent - (bando.total_amount || 0))}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Budget Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Budget per Progetto</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <div className="space-y-4">
              {projects.map((project) => {
                const projectBudgetUsed = project.total_budget ? (project.spent_budget / project.total_budget) * 100 : 0;
                return (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Speso: {formatCurrency(project.spent_budget)} / {formatCurrency(project.total_budget)}
                        </p>
                      </div>
                      <span className="text-sm font-medium">
                        {projectBudgetUsed.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(projectBudgetUsed, 100)}
                      className={projectBudgetUsed > 90 ? 'bg-red-100' : ''}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nessun progetto creato
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};