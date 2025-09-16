import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [formData, setFormData] = useState({
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
  
  const { toast } = useToast();
  const { createProject, updateProject } = useProjects();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProjectDocument(file);
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
        ...formData,
        bando_id: bandoId,
        remaining_budget: formData.total_budget - formData.allocated_budget,
        spent_budget: 0,
        progress_percentage: 0,
        project_documents: documentUrl ? [documentUrl] : [],
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
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_manager">Project Manager</Label>
              <Input
                id="project_manager"
                value={formData.project_manager}
                onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_budget">Budget Totale (€) *</Label>
              <Input
                id="total_budget"
                type="number"
                min="0"
                value={formData.total_budget}
                onChange={(e) => setFormData({ ...formData, total_budget: Number(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocated_budget">Budget Allocato (€)</Label>
              <Input
                id="allocated_budget"
                type="number"
                min="0"
                max={formData.total_budget}
                value={formData.allocated_budget}
                onChange={(e) => setFormData({ ...formData, allocated_budget: Number(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data Inizio</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fine</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="status">Stato</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
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
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {projectDocument.name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setProjectDocument(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Carica il documento che descrive i parametri del progetto per il monitoraggio automatico
            </p>
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