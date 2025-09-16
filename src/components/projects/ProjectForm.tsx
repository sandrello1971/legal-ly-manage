import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useProjects, type Project } from '@/hooks/useProjects';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectFormProps {
  bandoId: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Partial<Project>;
}

export const ProjectForm = ({ bandoId, onSuccess, onCancel, initialData }: ProjectFormProps) => {
  const [projectFormData, setProjectFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    total_budget: initialData?.total_budget || 0,
    allocated_budget: initialData?.allocated_budget || 0,
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    status: initialData?.status || 'planning' as const,
    project_manager: initialData?.project_manager || '',
    team_members: initialData?.team_members || [],
    notes: initialData?.notes || '',
  });
  
  const [projectDocument, setProjectDocument] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const { toast } = useToast();
  const { createProject, updateProject } = useProjects();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProjectDocument(file);
      setAnalysisResult(null);
    }
  };

  const analyzeDocument = async () => {
    if (!projectDocument) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', projectDocument);
      formData.append('projectId', initialData?.id || 'new');
      formData.append('bandoId', bandoId);

      const { data, error } = await supabase.functions.invoke('analyze-project-document', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        setAnalysisResult(data.extracted_data);
        
        // Auto-populate form with extracted data
        const projectInfo = data.extracted_data.project_info;
        if (projectInfo.title && !projectFormData.title) {
          setProjectFormData(prev => ({ ...prev, title: projectInfo.title }));
        }
        if (projectInfo.description && !projectFormData.description) {
          setProjectFormData(prev => ({ ...prev, description: projectInfo.description }));
        }
        if (projectInfo.start_date && !projectFormData.start_date) {
          setProjectFormData(prev => ({ ...prev, start_date: projectInfo.start_date }));
        }
        if (projectInfo.end_date && !projectFormData.end_date) {
          setProjectFormData(prev => ({ ...prev, end_date: projectInfo.end_date }));
        }
        if (projectInfo.project_manager && !projectFormData.project_manager) {
          setProjectFormData(prev => ({ ...prev, project_manager: projectInfo.project_manager }));
        }
        
        const budget = data.extracted_data.budget;
        if (budget.total_amount && !projectFormData.total_budget) {
          setProjectFormData(prev => ({ ...prev, total_budget: budget.total_amount }));
        }
        if (budget.funding_received && !projectFormData.allocated_budget) {
          setProjectFormData(prev => ({ ...prev, allocated_budget: budget.funding_received }));
        }

        toast({
          title: 'Analisi completata!',
          description: `Documento analizzato con confidenza ${data.extracted_data.confidence}%. Campi compilati automaticamente.`,
        });
      } else {
        throw new Error(data.error || 'Analisi fallita');
      }
    } catch (error: any) {
      console.error('Error analyzing document:', error);
      toast({
        title: 'Errore nell\'analisi',
        description: 'Impossibile analizzare il documento. Compila manualmente i campi.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const uploadDocument = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `projects/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let documentUrl = '';
      if (projectDocument) {
        documentUrl = await uploadDocument(projectDocument);
      }

      const projectData = {
        ...projectFormData,
        bando_id: bandoId,
        remaining_budget: projectFormData.total_budget - projectFormData.allocated_budget,
        spent_budget: 0,
        progress_percentage: 0,
        project_documents: documentUrl ? [documentUrl] : [],
        parsed_data: analysisResult || null,
      };

      if (initialData?.id) {
        await updateProject(initialData.id, projectData);
        toast({
          title: 'Successo',
          description: 'Progetto aggiornato con successo',
        });
      } else {
        await createProject(projectData);
        toast({
          title: 'Successo',
          description: 'Progetto creato con successo',
        });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante il salvataggio',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData?.id ? 'Modifica Progetto' : 'Nuovo Progetto'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo Progetto *</Label>
              <Input
                id="title"
                value={projectFormData.title}
                onChange={(e) => setProjectFormData({ ...projectFormData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_manager">Project Manager</Label>
              <Input
                id="project_manager"
                value={projectFormData.project_manager}
                onChange={(e) => setProjectFormData({ ...projectFormData, project_manager: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_budget">Budget Totale (€) *</Label>
              <Input
                id="total_budget"
                type="number"
                min="0"
                value={projectFormData.total_budget}
                onChange={(e) => setProjectFormData({ ...projectFormData, total_budget: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocated_budget">Budget Allocato (€)</Label>
              <Input
                id="allocated_budget"
                type="number"
                min="0"
                max={projectFormData.total_budget}
                value={projectFormData.allocated_budget}
                onChange={(e) => setProjectFormData({ ...projectFormData, allocated_budget: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inizio</Label>
              <Input
                id="start_date"
                type="date"
                value={projectFormData.start_date}
                onChange={(e) => setProjectFormData({ ...projectFormData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fine</Label>
              <Input
                id="end_date"
                type="date"
                value={projectFormData.end_date}
                onChange={(e) => setProjectFormData({ ...projectFormData, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="status">Stato</Label>
              <Select value={projectFormData.status} onValueChange={(value: any) => setProjectFormData({ ...projectFormData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Pianificazione</SelectItem>
                  <SelectItem value="in_progress">In Corso</SelectItem>
                  <SelectItem value="on_hold">In Pausa</SelectItem>
                  <SelectItem value="completed">Completato</SelectItem>
                  <SelectItem value="cancelled">Annullato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={projectFormData.description}
              onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={projectFormData.notes}
              onChange={(e) => setProjectFormData({ ...projectFormData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_document">Documento Progetto</Label>
            <div className="flex items-center gap-2">
              <Input
                id="project_document"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
              />
              {projectDocument && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={analyzeDocument}
                    disabled={analyzing}
                  >
                    {analyzing ? 'Analizzando...' : 'Analizza'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProjectDocument(null);
                      setAnalysisResult(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
            {projectDocument && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {projectDocument.name}
                {analysisResult && (
                  <Badge variant="outline" className="ml-2">
                    Analizzato (confidenza: {analysisResult.confidence}%)
                  </Badge>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Carica il documento del progetto per l'analisi automatica dei parametri di monitoraggio
            </p>
            
            {analysisResult && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Dati Estratti:</h4>
                <div className="text-sm space-y-1">
                  {analysisResult.project_info.objectives?.length > 0 && (
                    <p><strong>Obiettivi:</strong> {analysisResult.project_info.objectives.slice(0, 2).join(', ')}</p>
                  )}
                  {analysisResult.budget.categories?.length > 0 && (
                    <p><strong>Categorie Budget:</strong> {analysisResult.budget.categories.length} categorie identificate</p>
                  )}
                  {analysisResult.monitoring_parameters.milestones?.length > 0 && (
                    <p><strong>Milestone:</strong> {analysisResult.monitoring_parameters.milestones.length} milestone trovate</p>
                  )}
                  {analysisResult.monitoring_parameters.kpis?.length > 0 && (
                    <p><strong>KPI:</strong> {analysisResult.monitoring_parameters.kpis.length} indicatori identificati</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annulla
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                initialData?.id ? 'Aggiorna' : 'Crea Progetto'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};