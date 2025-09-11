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
import { useExpenses, type ExpenseUpload } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';

interface ProcessedExpense extends ExpenseUpload {
  id: string;
  status: 'processing' | 'completed' | 'error' | 'editing';
  error?: string;
}

export function ExpenseProcessor() {
  const [uploads, setUploads] = useState<ProcessedExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const { processExpenseReceipt, createExpense } = useExpenses();
  const { projects } = useProjects();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: ProcessedExpense[] = acceptedFiles.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      projectId: '',
      status: 'processing'
    }));

    setUploads(prev => [...prev, ...newUploads]);
    setIsProcessing(true);
    setProcessingProgress(0);

    // Process files sequentially
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i];
      
      try {
        const result = await processExpenseReceipt(upload.file);
        
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? {
                ...u,
                status: 'completed',
                confidence: result.confidence || 0.8,
                category: result.category,
                extractedData: result.extractedData
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
  }, [processExpenseReceipt]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true
  });

  const updateUpload = (id: string, updates: Partial<ProcessedExpense>) => {
    setUploads(prev => prev.map(u => 
      u.id === id ? { ...u, ...updates } : u
    ));
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
          receipt_number: upload.extractedData?.receiptNumber
        });
      } catch (error) {
        console.error('Error creating expense:', error);
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
                  Supporta PDF, PNG, JPG (max 10MB per file)
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
                          <Badge variant="secondary" className={getConfidenceColor(upload.confidence)}>
                            Confidenza: {getConfidenceText(upload.confidence)} ({Math.round(upload.confidence * 100)}%)
                          </Badge>
                        )}
                        {upload.status === 'error' && (
                          <Badge variant="destructive">Errore</Badge>
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

                    {upload.status === 'error' && upload.error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{upload.error}</AlertDescription>
                      </Alert>
                    )}

                    {upload.status === 'completed' && (
                      <Tabs defaultValue="extracted" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="extracted">Dati Estratti</TabsTrigger>
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
                                  <SelectItem value="personnel">Personale</SelectItem>
                                  <SelectItem value="equipment">Attrezzature</SelectItem>
                                  <SelectItem value="materials">Materiali</SelectItem>
                                  <SelectItem value="services">Servizi</SelectItem>
                                  <SelectItem value="travel">Viaggi</SelectItem>
                                  <SelectItem value="other">Altro</SelectItem>
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