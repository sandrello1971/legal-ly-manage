import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/config/expenseCategories';
import { useExpenses, type ExpenseUpload } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/integrations/supabase/client';
import { calculateFileHash, checkDuplicateFile } from '@/lib/fileUtils';

interface ProcessedExpense extends ExpenseUpload {
  id: string;
  status: 'processing' | 'completed' | 'error' | 'editing' | 'duplicate';
  error?: string;
  fileHash?: string;
  confidenceExplanation?: string;
  duplicateInfo?: {
    existingExpense: any;
  };
}

interface ExpenseProcessorProps {
  defaultProjectId?: string;
}

export function ExpenseProcessor({ defaultProjectId }: ExpenseProcessorProps = {}) {
  const [uploads, setUploads] = useState<ProcessedExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const { processExpenseReceipt, createExpense } = useExpenses();
  const { projects } = useProjects();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: ProcessedExpense[] = acceptedFiles.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      projectId: defaultProjectId || '',
      status: 'processing'
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsProcessing(true);
    setProcessingProgress(0);

    // Process files sequentially
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i];
      
      try {
        // Calculate file hash to detect duplicates
        const fileHash = await calculateFileHash(upload.file);
        
        // Check if file already exists
        const { isDuplicate, existingExpense } = await checkDuplicateFile(fileHash, supabase);
        
        if (isDuplicate) {
          setUploads(prev => prev.map(u => 
            u.id === upload.id 
              ? {
                  ...u,
                  status: 'duplicate',
                  fileHash,
                  duplicateInfo: { existingExpense },
                  error: `File già caricato: "${existingExpense.description}" (${existingExpense.receipt_number || 'N/A'})`
                }
              : u
          ));
          setProcessingProgress(((i + 1) / newUploads.length) * 100);
          continue;
        }
        
        const formData = new FormData();
        formData.append('file', upload.file);
        if (upload.projectId) {
          formData.append('projectId', upload.projectId);
        }
        
        const result = await processExpenseReceipt(formData);
        
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? {
                ...u,
                status: 'completed',
                fileHash,
                confidence: result.confidence || 0.8,
                confidenceExplanation: result.confidenceExplanation,
                category: result.category,
                extractedData: result.extractedData,
                validation: result.validation
              }
            : u
        ));
      } catch (error) {
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? {
                ...u,
                status: 'error',
                error: error instanceof Error ? error.message : 'Errore sconosciuto'
              }
            : u
        ));
      }

      setProcessingProgress(((i + 1) / newUploads.length) * 100);
    }

    setIsProcessing(false);
  }, [processExpenseReceipt, defaultProjectId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml']
    },
    multiple: true
  });

  const updateUpload = async (id: string, updates: Partial<ProcessedExpense>) => {
    setUploads(prev => prev.map(u => 
      u.id === id ? { ...u, ...updates } : u
    ));

    // Se il projectId è cambiato e il file è stato processato, riprocessa per la validazione
    if (updates.projectId && updates.projectId !== '') {
      const upload = uploads.find(u => u.id === id);
      if (upload && upload.status === 'completed') {
        await reprocessFileWithProject(upload, updates.projectId);
      }
    }
  };

  const reprocessFileWithProject = async (upload: ProcessedExpense, projectId: string) => {
    setUploads(prev => prev.map(u => 
      u.id === upload.id ? { ...u, status: 'processing' } : u
    ));

    try {
      const formData = new FormData();
      formData.append('file', upload.file);
      formData.append('projectId', projectId);
      
      const result = await processExpenseReceipt(formData);
      
      setUploads(prev => prev.map(u => 
        u.id === upload.id 
          ? {
              ...u,
              status: 'completed',
              confidence: result.confidence || 0.8,
              category: result.category,
              extractedData: result.extractedData,
              validation: result.validation
            }
          : u
      ));
    } catch (error) {
      setUploads(prev => prev.map(u => 
        u.id === upload.id 
          ? {
              ...u,
              status: 'error',
              error: error instanceof Error ? error.message : 'Errore nella rivalidazione'
            }
          : u
      ));
    }
  };

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  const submitExpenses = async () => {
    const completedUploads = uploads.filter(u => u.status === 'completed' && u.projectId);
    
    for (const upload of completedUploads) {
      try {
        await createExpense({
          project_id: upload.projectId,
          milestone_id: upload.milestoneId,
          category: upload.category as any,
          description: upload.extractedData?.description || 'Spesa da ricevuta',
          amount: upload.extractedData?.amount || 0,
          expense_date: upload.extractedData?.date || new Date().toISOString().split('T')[0],
          supplier_name: upload.extractedData?.supplier,
          receipt_number: upload.extractedData?.receiptNumber,
          file_hash: upload.fileHash,
          is_approved: null // Imposta esplicitamente a null per status "pending"
        });
      } catch (error) {
        console.error('Error creating expense:', error);
        // L'errore viene già mostrato dal toast in createExpense
      }
    }

    setUploads([]);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success';
    if (confidence >= 0.6) return 'bg-warning';
    return 'bg-destructive';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Media';
    return 'Bassa';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Caricamento Ricevute
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive ? 'Rilascia i file qui' : 'Trascina le ricevute qui o clicca per selezionare'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supporta PDF, PNG, JPG, XML (fatture elettroniche) - max 10MB per file
                </p>
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Elaborazione in corso...</span>
                <span>{Math.round(processingProgress)}%</span>
              </div>
              <Progress value={processingProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ricevute Elaborate ({uploads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploads.map((upload) => (
                <Card key={upload.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{upload.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {upload.status === 'processing' && (
                          <Badge variant="secondary">Elaborazione...</Badge>
                        )}
                        {upload.status === 'completed' && upload.confidence && (
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className={getConfidenceColor(upload.confidence)}>
                              Confidenza: {getConfidenceText(upload.confidence)} ({Math.round(upload.confidence * 100)}%)
                            </Badge>
                            {upload.confidenceExplanation && (
                              <p className="text-xs text-muted-foreground">{upload.confidenceExplanation}</p>
                            )}
                          </div>
                        )}
                        {upload.extractedData?.invoiceType === 'electronic' && upload.validation && (
                          <Badge variant={upload.validation.shouldApprove ? "default" : "destructive"}>
                            {upload.validation.shouldApprove ? "Approvata automaticamente" : "Richiede verifica"}
                          </Badge>
                        )}
                        {upload.status === 'error' && (
                          <Badge variant="destructive">Errore</Badge>
                        )}
                        {upload.status === 'duplicate' && (
                          <Badge variant="destructive">Duplicato</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUpload(upload.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {(upload.status === 'error' || upload.status === 'duplicate') && upload.error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {upload.error}
                          {upload.status === 'duplicate' && upload.duplicateInfo && (
                            <div className="mt-2 text-xs">
                              <p>Spesa esistente: €{upload.duplicateInfo.existingExpense.amount}</p>
                              {upload.duplicateInfo.existingExpense.supplier_name && (
                                <p>Fornitore: {upload.duplicateInfo.existingExpense.supplier_name}</p>
                              )}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    {upload.status === 'completed' && (
                      <Tabs defaultValue="extracted" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="extracted">Dati Estratti</TabsTrigger>
                          <TabsTrigger value="validation">Validazione</TabsTrigger>
                          <TabsTrigger value="manual">Correzione Manuale</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="extracted" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Descrizione</Label>
                              <p className="text-sm">{upload.extractedData?.description || 'Non disponibile'}</p>
                            </div>
                            <div>
                              <Label>Importo</Label>
                              <p className="text-sm">€{upload.extractedData?.amount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                              <Label>Data</Label>
                              <p className="text-sm">{upload.extractedData?.date || 'Non disponibile'}</p>
                            </div>
                            <div>
                              <Label>Fornitore</Label>
                              <p className="text-sm">{upload.extractedData?.supplier || 'Non disponibile'}</p>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="validation" className="space-y-4">
                          {upload.validation ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                {upload.validation.shouldApprove ? (
                                  <CheckCircle className="h-5 w-5 text-success" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-destructive" />
                                )}
                                <span className="font-medium">
                                  {upload.validation.shouldApprove ? 'Fattura validata automaticamente' : 'Verifica manuale richiesta'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <Label>Verifica Codice Progetto</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    {upload.validation.projectCode?.isValid ? (
                                      <CheckCircle className="h-4 w-4 text-success" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-destructive" />
                                    )}
                                    <span className="text-sm">
                                      {upload.validation.projectCode?.isValid ? 'Trovato' : 'Non trovato'}
                                    </span>
                                  </div>
                                  {upload.validation.projectCode?.references && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Riferimenti: {upload.validation.projectCode.references.join(', ')}
                                    </p>
                                  )}
                                </div>
                                
                                <div>
                                  <Label>Coerenza con Bando</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    {upload.validation.bandoCoherence?.isCoherent ? (
                                      <CheckCircle className="h-4 w-4 text-success" />
                                    ) : (
                                      <AlertCircle className="h-4 w-4 text-warning" />
                                    )}
                                    <span className="text-sm">
                                      {upload.validation.bandoCoherence?.isCoherent ? 'Coerente' : 'Da verificare'}
                                    </span>
                                    {upload.validation.bandoCoherence?.coherenceScore && (
                                      <span className="text-xs text-muted-foreground">
                                        (Punteggio: {Math.round(upload.validation.bandoCoherence.coherenceScore)}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {upload.validation.projectCoherence && (
                                  <div>
                                    <Label>Coerenza con Progetto</Label>
                                    <div className="flex items-center gap-2 mt-1">
                                      {upload.validation.projectCoherence.isCoherent ? (
                                        <CheckCircle className="h-4 w-4 text-success" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-warning" />
                                      )}
                                      <span className="text-sm">
                                        {upload.validation.projectCoherence.isCoherent ? 'Coerente' : 'Da verificare'}
                                      </span>
                                      {upload.validation.projectCoherence.coherenceScore && (
                                        <span className="text-xs text-muted-foreground">
                                          (Punteggio: {Math.round(upload.validation.projectCoherence.coherenceScore)}%)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {upload.validation.reasons && upload.validation.reasons.length > 0 && (
                                <div>
                                  <Label>Dettagli Validazione</Label>
                                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                                    {upload.validation.reasons.map((reason, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Dettagli Progetto per verifica manuale */}
                              {upload.projectId && projects.find(p => p.id === upload.projectId) && (
                                <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
                                  <Label className="text-base mb-2 block">Dettagli Progetto</Label>
                                  {(() => {
                                    const project = projects.find(p => p.id === upload.projectId);
                                    return project ? (
                                      <div className="space-y-2 text-sm">
                                        <div>
                                          <span className="font-medium">Titolo:</span>{' '}
                                          <span className="text-muted-foreground">{project.title}</span>
                                        </div>
                                        {project.description && (
                                          <div>
                                            <span className="font-medium">Descrizione/Obiettivi:</span>
                                            <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{project.description}</p>
                                          </div>
                                        )}
                                        {project.total_budget && (
                                          <div>
                                            <span className="font-medium">Budget Totale:</span>{' '}
                                            <span className="text-muted-foreground">€{project.total_budget.toLocaleString()}</span>
                                          </div>
                                        )}
                                        {project.cup_code && (
                                          <div>
                                            <span className="font-medium">CUP:</span>{' '}
                                            <span className="text-muted-foreground">{project.cup_code}</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Nessuna validazione disponibile per questo file.</p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="manual" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`project-${upload.id}`}>Progetto *</Label>
                              <Select
                                value={upload.projectId}
                                onValueChange={(value) => updateUpload(upload.id, { projectId: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona progetto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projects.map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                      {project.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`category-${upload.id}`}>Categoria</Label>
                              <Select
                                value={upload.category}
                                onValueChange={(value) => updateUpload(upload.id, { category: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleziona categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="consulting">Consulenza</SelectItem>
                                  <SelectItem value="training">Formazione</SelectItem>
                                  <SelectItem value="equipment">Attrezzature tecnologiche</SelectItem>
                                  <SelectItem value="engineering">Ingegnerizzazione SW/HW</SelectItem>
                                  <SelectItem value="intellectual_property">Proprietà industriale</SelectItem>
                                  <SelectItem value="personnel">Personale dedicato</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`description-${upload.id}`}>Descrizione</Label>
                              <Input
                                id={`description-${upload.id}`}
                                value={upload.extractedData?.description || ''}
                                onChange={(e) => updateUpload(upload.id, {
                                  extractedData: { ...upload.extractedData, description: e.target.value }
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`amount-${upload.id}`}>Importo (€)</Label>
                              <Input
                                id={`amount-${upload.id}`}
                                type="number"
                                step="0.01"
                                value={upload.extractedData?.amount || 0}
                                onChange={(e) => updateUpload(upload.id, {
                                  extractedData: { ...upload.extractedData, amount: parseFloat(e.target.value) }
                                })}
                              />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {uploads.some(u => u.status === 'completed') && (
              <div className="mt-6 pt-4 border-t">
                <Button 
                  onClick={submitExpenses}
                  className="w-full"
                  disabled={!uploads.some(u => u.status === 'completed' && u.projectId)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Conferma e Crea Spese ({uploads.filter(u => u.status === 'completed' && u.projectId).length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}