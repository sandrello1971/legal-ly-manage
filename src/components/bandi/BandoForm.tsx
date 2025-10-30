import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Loader2, 
  Calendar,
  Euro,
  Building2,
  Mail,
  Phone,
  User,
  Globe,
  Plus,
  X,
  Sparkles
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';
import { useBandi } from '@/hooks/useBandi';

interface BandoFormProps {
  initialData?: any;
  onSave: (data: any) => Promise<any> | void;
  onCancel: () => void;
}

export const BandoForm = ({ initialData, onSave, onCancel }: BandoFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { parsePdfDecreto, createBando, updateBando } = useBandi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Salva l'ID del bando se viene creato durante l'analisi AI
  const [createdBandoId, setCreatedBandoId] = useState<string | null>(initialData?.id || null);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    total_amount: initialData?.total_amount || '',
    application_deadline: initialData?.application_deadline || '',
    project_start_date: initialData?.project_start_date || '',
    project_end_date: initialData?.project_end_date || '',
    status: initialData?.status || 'draft',
    organization: initialData?.organization || '',
    contact_person: initialData?.contact_person || '',
    contact_email: initialData?.contact_email || '',
    contact_phone: initialData?.contact_phone || '',
    website_url: initialData?.website_url || '',
    eligibility_criteria: initialData?.eligibility_criteria || '',
    evaluation_criteria: initialData?.evaluation_criteria || '',
    required_documents: Array.isArray(initialData?.required_documents) ? initialData.required_documents : [],
    decree_file_url: initialData?.decree_file_url || '',
    decree_file_name: initialData?.decree_file_name || '',
    decree_storage_path: ''
  });

  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [newDocument, setNewDocument] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      
      if (!file) return;
      
      if (!file.type.includes('pdf')) {
        toast({
          title: 'Errore',
          description: 'Sono supportati solo file PDF',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: 'Errore',
          description: 'Il file deve essere inferiore a 10MB',
          variant: 'destructive',
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        decree_file_url: publicUrl,
        decree_file_name: file.name,
        decree_storage_path: filePath
      }));

      toast({
        title: 'Successo',
        description: 'File caricato con successo',
      });

    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante il caricamento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleParseDecreto = async () => {
    if (!formData.decree_file_url) {
      toast({
        title: 'Errore',
        description: 'Carica prima un decreto PDF',
        variant: 'destructive',
      });
      return;
    }

    try {
      setParsing(true);

      // Se non abbiamo un ID del bando, dobbiamo salvarlo prima (ma senza chiudere il form)
      let bandoId = createdBandoId || initialData?.id;
      
      if (!bandoId) {
        // Crea il bando solo con campi validi
        const bandoData: any = {
          title: formData.title || 'Bando da Analizzare',
          description: formData.description,
          total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
          application_deadline: formData.application_deadline || null,
          project_start_date: formData.project_start_date || null,
          project_end_date: formData.project_end_date || null,
          status: formData.status,
          organization: formData.organization,
          contact_person: formData.contact_person,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          website_url: formData.website_url,
          eligibility_criteria: formData.eligibility_criteria,
          evaluation_criteria: formData.evaluation_criteria,
          required_documents: formData.required_documents,
          decree_file_url: formData.decree_file_url,
          decree_file_name: formData.decree_file_name,
          parsed_data: (formData as any).parsed_data || null
        };

        toast({
          title: 'Salvataggio in corso',
          description: 'Salvataggio del bando prima dell\'analisi...',
        });

        // Salva direttamente senza chiudere il form
        const savedBando = await createBando(bandoData);
        bandoId = savedBando?.id;
        
        // Salva l'ID per evitare di ricreare il bando
        if (bandoId) {
          setCreatedBandoId(bandoId);
        }
      }

      if (!bandoId) {
        throw new Error('Impossibile ottenere l\'ID del bando');
      }

      toast({
        title: 'Analisi in corso',
        description: 'Invio del PDF al server per l\'analisi. Attendere il completamento...',
      });

      // Invio diretto del file all'edge function per l'elaborazione server-side
      const { data, error } = await supabase.functions.invoke('parse-pdf-decreto', {
        body: { 
          fileUrl: formData.decree_file_url,
          fileName: formData.decree_file_name,
          bandoId,
          storagePath: formData.decree_storage_path
        }
      });

      if (error) {
        // Log dettagliato per debugging
        console.error('Error from edge function:', error);
        
        // Se è un errore 422, mostra un messaggio più dettagliato
        const errorMessage = error.message || 'Errore durante l\'analisi del PDF';
        const errorDetails = (error as any).details;
        const aiResponse = (error as any).aiResponse;
        
        throw new Error(
          errorDetails 
            ? `${errorMessage}\n\nDettagli: ${errorDetails}${aiResponse ? `\n\nRisposta AI (primi 200 caratteri): ${aiResponse.substring(0, 200)}...` : ''}`
            : errorMessage
        );
      }

      toast({
        title: 'Successo!',
        description: 'Il bando è stato analizzato e aggiornato con i dati estratti. Puoi ora salvare o continuare a modificare.',
      });

      // Aggiorna il form con i dati estratti
      if (data?.data) {
        // Lista whitelist dei campi validi della tabella bandi
        const validFields = [
          'title', 'description', 'total_amount', 'application_deadline',
          'project_start_date', 'project_end_date', 'status',
          'organization', 'contact_person', 'contact_email', 'contact_phone',
          'website_url', 'eligibility_criteria', 'evaluation_criteria',
          'required_documents', 'decree_file_url', 'decree_file_name'
        ];
        
        // Estrai solo i campi validi
        const validBandoFields: any = {};
        validFields.forEach(field => {
          if (data.data[field] !== undefined) {
            validBandoFields[field] = data.data[field];
          }
        });
        
        setFormData(prev => ({
          ...prev,
          ...validBandoFields,
          total_amount: data.data.total_amount?.toString() || prev.total_amount,
          // Salva TUTTI i dati dell'AI in parsed_data (inclusi campi extra come expense_categories, funding_percentage, ecc.)
          parsed_data: data.data
        }));
      }

    } catch (error: any) {
      console.error('Error parsing decreto:', error);
      
      // Mostra messaggio di errore dettagliato
      const errorLines = error.message?.split('\n') || [];
      const mainMessage = errorLines[0] || 'Errore durante l\'analisi del PDF';
      const detailMessage = errorLines.slice(1).join(' ') || 'Il sistema AI non è riuscito ad estrarre correttamente i dati dal PDF. Verifica che il file sia leggibile e riprova.';
      
      toast({
        title: mainMessage,
        description: detailMessage,
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  const addRequiredDocument = () => {
    if (newDocument.trim()) {
      setFormData(prev => ({
        ...prev,
        required_documents: [...prev.required_documents, newDocument.trim()]
      }));
      setNewDocument('');
    }
  };

  const removeRequiredDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      required_documents: prev.required_documents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Errore',
        description: 'Il titolo è obbligatorio',
        variant: 'destructive',
      });
      return;
    }

    // Salva solo i campi validi della tabella bandi
    const bandoData: any = {
      title: formData.title,
      description: formData.description,
      total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null,
      application_deadline: formData.application_deadline || null,
      project_start_date: formData.project_start_date || null,
      project_end_date: formData.project_end_date || null,
      status: formData.status,
      organization: formData.organization,
      contact_person: formData.contact_person,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone,
      website_url: formData.website_url,
      eligibility_criteria: formData.eligibility_criteria,
      evaluation_criteria: formData.evaluation_criteria,
      required_documents: formData.required_documents,
      decree_file_url: formData.decree_file_url,
      decree_file_name: formData.decree_file_name,
      parsed_data: (formData as any).parsed_data || null
    };

    // Se il bando è stato già creato durante l'analisi AI, fai update invece di create
    if (createdBandoId) {
      try {
        await updateBando(createdBandoId, bandoData);
        onCancel(); // Chiudi il form dopo l'update
      } catch (error) {
        console.error('Error updating bando:', error);
      }
    } else {
      onSave(bandoData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informazioni Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Informazioni Base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Titolo del bando"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrizione dettagliata del bando"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_amount">
                <Euro className="h-4 w-4 inline mr-1" />
                Importo Totale
              </Label>
              <Input
                id="total_amount"
                type="number"
                value={formData.total_amount}
                onChange={(e) => handleInputChange('total_amount', e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <Label htmlFor="status">Stato</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="active">Attivo</SelectItem>
                  <SelectItem value="expired">Scaduto</SelectItem>
                  <SelectItem value="completed">Completato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Tempistiche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="application_deadline">Scadenza Domanda</Label>
              <Input
                id="application_deadline"
                type="date"
                value={formData.application_deadline}
                onChange={(e) => handleInputChange('application_deadline', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="project_start_date">Inizio Progetto</Label>
              <Input
                id="project_start_date"
                type="date"
                value={formData.project_start_date}
                onChange={(e) => handleInputChange('project_start_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="project_end_date">Fine Progetto</Label>
              <Input
                id="project_end_date"
                type="date"
                value={formData.project_end_date}
                onChange={(e) => handleInputChange('project_end_date', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizzazione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 mr-2" />
            Organizzazione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="organization">Ente Organizzatore</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) => handleInputChange('organization', e.target.value)}
              placeholder="Nome dell'ente o organizzazione"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_person">
                <User className="h-4 w-4 inline mr-1" />
                Persona di Contatto
              </Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                placeholder="Nome del referente"
              />
            </div>

            <div>
              <Label htmlFor="contact_email">
                <Mail className="h-4 w-4 inline mr-1" />
                Email di Contatto
              </Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                placeholder="email@esempio.it"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_phone">
                <Phone className="h-4 w-4 inline mr-1" />
                Telefono
              </Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                placeholder="+39 123 456 7890"
              />
            </div>

            <div>
              <Label htmlFor="website_url">
                <Globe className="h-4 w-4 inline mr-1" />
                Sito Web
              </Label>
              <Input
                id="website_url"
                type="url"
                value={formData.website_url}
                onChange={(e) => handleInputChange('website_url', e.target.value)}
                placeholder="https://www.esempio.it"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decreto e Parsing AI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            Decreto PDF e Analisi AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Carica Decreto PDF</Label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? 'Caricamento...' : 'Carica PDF'}
              </Button>

              {formData.decree_file_name && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  {formData.decree_file_name}
                </div>
              )}
            </div>
          </div>

          {formData.decree_file_url && (
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleParseDecreto}
                disabled={parsing || uploading}
                className="w-full"
              >
                {parsing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {parsing ? 'Analisi in corso... Non chiudere questa pagina' : 'Analizza con AI'}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                {parsing 
                  ? '⏳ Attendere il completamento dell\'analisi prima di procedere'
                  : 'L\'AI estrarrà automaticamente importi, scadenze e categorie di spesa dal PDF'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Criteri e Documenti */}
      <Card>
        <CardHeader>
          <CardTitle>Criteri e Requisiti</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="eligibility_criteria">Criteri di Eleggibilità</Label>
            <Textarea
              id="eligibility_criteria"
              value={formData.eligibility_criteria}
              onChange={(e) => handleInputChange('eligibility_criteria', e.target.value)}
              placeholder="Descrivi i criteri di eleggibilità per partecipare al bando"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="evaluation_criteria">Criteri di Valutazione</Label>
            <Textarea
              id="evaluation_criteria"
              value={formData.evaluation_criteria}
              onChange={(e) => handleInputChange('evaluation_criteria', e.target.value)}
              placeholder="Descrivi i criteri utilizzati per valutare le proposte"
              rows={3}
            />
          </div>

          <div>
            <Label>Documenti Richiesti</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newDocument}
                  onChange={(e) => setNewDocument(e.target.value)}
                  placeholder="Aggiungi un documento richiesto"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequiredDocument())}
                />
                <Button type="button" onClick={addRequiredDocument} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(formData.required_documents || []).map((doc, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {doc}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => removeRequiredDocument(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={parsing || uploading}>
          Annulla
        </Button>
        <Button type="submit" disabled={parsing || uploading}>
          {parsing || uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Attendere...
            </>
          ) : (
            initialData ? 'Aggiorna Bando' : 'Crea Bando'
          )}
        </Button>
      </div>
      {(parsing || uploading) && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          ⚠️ Operazione in corso. Attendere il completamento prima di chiudere.
        </p>
      )}
    </form>
  );
};