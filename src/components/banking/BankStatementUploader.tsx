import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, AlertCircle, CheckCircle, Clock, X, Trash2 } from 'lucide-react';
import { useBankStatements, type BankStatement } from '@/hooks/useBankStatements';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  statementId?: string;
  error?: string;
  progress: number;
}

export function BankStatementUploader() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { statements, uploadStatement, processStatement, deleteStatement, loading, refetch } = useBankStatements();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/xml': ['.xml'],
      'text/xml': ['.xml'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.mt940', '.txt']
    },
    multiple: true,
    onDrop: handleFileDrop
  });

  async function handleFileDrop(acceptedFiles: File[]) {
    const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (const fileData of newFiles) {
      try {
        updateFileStatus(fileData.id, { status: 'uploading', progress: 25 });
        
        const statementId = await uploadStatement(fileData.file);
        updateFileStatus(fileData.id, { 
          status: 'processing', 
          progress: 50, 
          statementId 
        });

        await processStatement(statementId);
        updateFileStatus(fileData.id, { 
          status: 'completed', 
          progress: 100 
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateFileStatus(fileData.id, { 
          status: 'error', 
          progress: 0, 
          error: errorMessage 
        });
      }
    }
    
    // Refresh data after all files are processed
    await refetch();
  }

  const updateFileStatus = (id: string, updates: Partial<UploadedFile>) => {
    setUploadedFiles(prev => 
      prev.map(file => file.id === id ? { ...file, ...updates } : file)
    );
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'warning';
      case 'completed':
        return 'success';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Bank Statements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
              <TabsTrigger value="formats">Supported Formats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <div className="space-y-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-lg font-medium">Drop files here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium mb-2">
                        Drag & drop bank statements here
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        or click to select files
                      </p>
                      <Button variant="outline">Select Files</Button>
                    </div>
                  )}
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Upload Progress</h4>
                    {uploadedFiles.map((file) => (
                      <Card key={file.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(file.status)}
                            <div>
                              <p className="font-medium">{file.file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(file.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(file.status) as any}>
                              {getStatusText(file.status)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {file.status !== 'error' && (
                          <Progress value={file.progress} className="h-2" />
                        )}
                        
                        {file.error && (
                          <Alert variant="destructive" className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{file.error}</AlertDescription>
                          </Alert>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="formats">
              <div className="space-y-4">
                <h4 className="font-medium">Supported File Formats</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h5 className="font-medium">CSV Files</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Comma-separated values with transaction data
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h5 className="font-medium">XML Files</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      CAMT.053 and other banking XML formats
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h5 className="font-medium">MT940 Files</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      SWIFT MT940 bank statement format
                    </p>
                  </Card>
                  
                  <Card className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h5 className="font-medium">PDF Files</h5>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bank statement PDFs (AI-powered parsing)
                    </p>
                  </Card>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    All files are processed securely and stored encrypted. Personal banking information is handled with the highest security standards.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Uploaded Statements List */}
      {statements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estratti Conto Caricati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statements.map((statement) => (
                <Card key={statement.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{statement.file_name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{new Date(statement.created_at).toLocaleDateString('it-IT')}</span>
                          <span>•</span>
                          <span>{statement.total_transactions} transazioni</span>
                          {statement.bank_name && (
                            <>
                              <span>•</span>
                              <span>{statement.bank_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant={
                        statement.status === 'completed' ? 'default' :
                        statement.status === 'error' ? 'destructive' :
                        'secondary'
                      }>
                        {statement.status === 'completed' ? 'Completato' :
                         statement.status === 'error' ? 'Errore' :
                         statement.status === 'processing' ? 'Elaborazione...' :
                         'In attesa'}
                      </Badge>
                    </div>
                    {(statement.status === 'pending' || statement.status === 'error') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => processStatement(statement.id)}
                        disabled={loading}
                      >
                        Riprova
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteStatement(statement.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {statement.processing_error && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{statement.processing_error}</AlertDescription>
                    </Alert>
                  )}
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}