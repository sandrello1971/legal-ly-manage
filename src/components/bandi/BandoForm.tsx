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
import * as pdfjsLib from 'pdfjs-dist';

interface BandoFormProps {
  initialData?: any;
  onSave: (data: any) => Promise<any> | void;
  onCancel: () => void;
}

export const BandoForm = ({ initialData, onSave, onCancel }: BandoFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { parsePdfDecreto } = useBandi();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Se non abbiamo un ID del bando, dobbiamo salvarlo prima
      let bandoId = initialData?.id;
      
      if (!bandoId) {
        const { decree_storage_path, ...rest } = formData as any;
        const bandoData = {
          ...rest,
          title: formData.title || 'Bando da Analizzare',
          total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null
        };

        const savedBando: any = await onSave(bandoData);
        bandoId = savedBando?.id;
      }

      if (!bandoId) {
        throw new Error('Impossibile ottenere l\'ID del bando');
      }

      // Leggi il file PDF dal URL
      toast({
        title: 'Analisi in corso',
        description: 'Lettura del PDF in corso...',
      });

      let pdfBuffer: ArrayBuffer;
      if (formData.decree_storage_path) {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(formData.decree_storage_path);
        if (downloadError || !fileData) {
          throw new Error('Impossibile scaricare il PDF dallo storage');
        }
        pdfBuffer = await fileData.arrayBuffer();
      } else {
        const response = await fetch(formData.decree_file_url);
        if (!response.ok) {
          throw new Error('Impossibile leggere il file PDF');
        }
        pdfBuffer = await response.arrayBuffer();
      }
      const pdfText = await extractTextFromPDF(pdfBuffer);

      if (!pdfText || pdfText.length < 100) {
        throw new Error('Il PDF sembra vuoto o non leggibile');
      }

      // Chiama la funzione AI
      toast({
        title: 'Analisi AI',
        description: 'L\'AI sta analizzando il documento...',
      });

      const { data, error } = await supabase.functions.invoke('parse-pdf-decreto', {
        body: { 
          pdfText, 
          fileName: formData.decree_file_name,
          bandoId 
        }
      });

      if (error) throw error;

      toast({
        title: 'Successo!',
        description: 'Il bando è stato analizzato e aggiornato con i dati estratti',
      });

      // Aggiorna il form con i dati estratti
      if (data?.data) {
        setFormData(prev => ({
          ...prev,
          ...data.data,
          total_amount: data.data.total_amount?.toString() || prev.total_amount
        }));
      }

    } catch (error: any) {
      console.error('Error parsing decreto:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante l\'analisi del PDF',
        variant: 'destructive',
      });
    } finally {
      setParsing(false);
    }
  };

  // Funzione per estrarre testo da PDF usando PDF.js
  const extractTextFromPDF = async (pdfBuffer: ArrayBuffer): Promise<string> => {
    try {
      // Configura PDF.js worker usando un approccio più affidabile
      const workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url
      ).toString();
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      
      const loadingTask = pdfjsLib.getDocument({
        data: pdfBuffer,
        // Configurazioni aggiuntive per PDF problematici
        verbosity: 0,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.149/standard_fonts/',
      });
      
      const pdfDocument = await loadingTask.promise;
      
      let fullText = '';
      let hasText = false;
      
      // Estrai testo da tutte le pagine (massimo 15 per evitare timeout)
      const maxPages = Math.min(pdfDocument.numPages, 15);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          const page = await pdfDocument.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          if (textContent.items && textContent.items.length > 0) {
            const pageText = textContent.items
              .map((item: any) => {
                if (item && typeof item.str === 'string') {
                  return item.str.trim();
                }
                return '';
              })
              .filter(text => text.length > 0)
              .join(' ');
            
            if (pageText.length > 0) {
              fullText += pageText + '\n\n';
              hasText = true;
            }
          }
        } catch (pageError) {
          console.warn(`Errore nella pagina ${pageNum}:`, pageError);
          continue;
        }
      }
      
      if (!hasText) {
        throw new Error('Nessun testo leggibile trovato nel PDF');
      }
      
      // Pulisci il testo da caratteri strani
      const cleanText = fullText
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length < 50) {
        throw new Error('Il testo estratto è troppo corto o illeggibile');
      }
      
      return cleanText;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error(`Impossibile estrarre il testo dal PDF: ${error.message}`);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Errore',
        description: 'Il titolo è obbligatorio',
        variant: 'destructive',
      });
      return;
    }

    const { decree_storage_path, ...rest } = formData as any;
    const bandoData = {
      ...rest,
      total_amount: formData.total_amount ? parseFloat(formData.total_amount) : null
    };

    onSave(bandoData);
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
                disabled={parsing}
                className="w-full"
              >
                {parsing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {parsing ? 'Analisi in corso...' : 'Analizza con AI'}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                L'AI estrarrà automaticamente importi, scadenze e categorie di spesa dal PDF
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit">
          {initialData ? 'Aggiorna Bando' : 'Crea Bando'}
        </Button>
      </div>
    </form>
  );
};