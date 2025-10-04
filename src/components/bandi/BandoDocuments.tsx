import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDocuments } from "@/hooks/useDocuments";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface BandoDocumentsProps {
  bandoId: string;
}

export const BandoDocuments = ({ bandoId }: BandoDocumentsProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { data: allDocuments, refetch } = useDocuments();

  // Filter documents related to this bando
  const bandoDocuments = allDocuments?.filter(doc => 
    doc.title.includes(bandoId) || doc.file_name.includes(bandoId)
  ) || [];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);

    for (const file of acceptedFiles) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${bandoId}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        // Create document record
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            title: `${file.name} - Bando ${bandoId}`,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            mime_type: file.type,
            document_type: 'other',
            uploaded_by: user.id,
          });

        if (dbError) throw dbError;

        toast({
          title: 'Successo',
          description: `${file.name} caricato con successo`,
        });
      } catch (error: any) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Errore',
          description: error.message || 'Errore durante il caricamento',
          variant: 'destructive',
        });
      }
    }

    setUploading(false);
    refetch();
  }, [bandoId, toast, refetch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });

  const handleDelete = async (docId: string, fileUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from('documents').remove([filePath]);
      }

      await supabase.from('documents').delete().eq('id', docId);

      toast({
        title: 'Successo',
        description: 'Documento eliminato',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante l\'eliminazione',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Carica Documenti del Bando
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
                  {isDragActive ? 'Rilascia i file qui' : 'Trascina i documenti qui o clicca per selezionare'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Decreto, linee guida, modulistica, ecc.
                </p>
              </div>
            </div>
          </div>
          {uploading && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Caricamento in corso...
            </p>
          )}
        </CardContent>
      </Card>

      {bandoDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documenti Caricati ({bandoDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bandoDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{format(new Date(doc.created_at), 'dd MMM yyyy', { locale: it })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id, doc.file_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};