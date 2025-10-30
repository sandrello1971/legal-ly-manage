import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useExpenses } from '@/hooks/useExpenses';

interface ImportedInvoice {
  id: string;
  fileName: string;
  invoiceNumber: string;
  supplier: string;
  description: string;
  amount: number;
  vat: number;
  cup?: string;
  status: 'pending' | 'importing' | 'completed' | 'error';
  error?: string;
}

interface ExpenseImporterProps {
  projectId: string;
  onImportComplete?: () => void;
}

export function ExpenseImporter({ projectId, onImportComplete }: ExpenseImporterProps) {
  const [importedInvoices, setImportedInvoices] = useState<ImportedInvoice[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { createExpense } = useExpenses(projectId);

  const parseCSV = (content: string): ImportedInvoice[] => {
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Il file CSV è vuoto o non valido');
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
    
    console.log('CSV Headers:', headers);

    // Find column indices
    const fileIdx = headers.findIndex(h => h.toLowerCase().includes('file'));
    const invoiceNumIdx = headers.findIndex(h => 
      h.toLowerCase().includes('numero') && h.toLowerCase().includes('fattura')
    );
    const supplierIdx = headers.findIndex(h => h.toLowerCase().includes('fornitore'));
    const descriptionIdx = headers.findIndex(h => h.toLowerCase().includes('descrizione'));
    const amountIdx = headers.findIndex(h => h.toLowerCase().includes('importo'));
    const vatIdx = headers.findIndex(h => h.toLowerCase().includes('iva'));
    const cupIdx = headers.findIndex(h => h.toLowerCase().includes('cup'));

    if (invoiceNumIdx === -1 || supplierIdx === -1 || amountIdx === -1) {
      throw new Error('Il CSV non contiene le colonne necessarie (Numero Fattura, Fornitore, Importo)');
    }

    const invoices: ImportedInvoice[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < 3) continue;

      try {
        let amountStr = values[amountIdx] || '0';
        // Handle European format: 1.200.000,00 or 1200000.0
        if (amountStr.includes(',')) {
          amountStr = amountStr.replace(/\./g, '').replace(',', '.');
        }

        const amount = parseFloat(amountStr) || 0;
        const vatStr = vatIdx >= 0 ? values[vatIdx] : '0';
        const vat = parseFloat(vatStr.replace(',', '.')) || 0;

        invoices.push({
          id: `invoice-${i}`,
          fileName: fileIdx >= 0 ? values[fileIdx] : '',
          invoiceNumber: values[invoiceNumIdx] || '',
          supplier: values[supplierIdx] || '',
          description: descriptionIdx >= 0 ? values[descriptionIdx] : 'Fattura importata',
          amount,
          vat,
          cup: cupIdx >= 0 ? values[cupIdx] : undefined,
          status: 'pending'
        });
      } catch (error) {
        console.error(`Error parsing line ${i}:`, error);
      }
    }

    return invoices;
  };

  const handleFileDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    try {
      setIsProcessing(true);
      const content = await file.text();
      const invoices = parseCSV(content);
      
      setImportedInvoices(invoices);
      
      toast({
        title: 'CSV analizzato',
        description: `Trovate ${invoices.length} fatture da importare`,
      });
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nell\'elaborazione del CSV',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
    disabled: isProcessing || importedInvoices.length > 0
  });

  const importInvoices = async () => {
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const invoice of importedInvoices) {
      try {
        setImportedInvoices(prev =>
          prev.map(inv => inv.id === invoice.id ? { ...inv, status: 'importing' } : inv)
        );

        await createExpense({
          project_id: projectId,
          category: 'materials',
          description: invoice.description,
          amount: invoice.amount,
          expense_date: new Date().toISOString().split('T')[0],
          supplier_name: invoice.supplier,
          receipt_number: invoice.invoiceNumber,
          is_approved: false,
        });

        setImportedInvoices(prev =>
          prev.map(inv => inv.id === invoice.id ? { ...inv, status: 'completed' } : inv)
        );
        successCount++;

      } catch (error) {
        console.error(`Error importing invoice ${invoice.invoiceNumber}:`, error);
        setImportedInvoices(prev =>
          prev.map(inv => inv.id === invoice.id ? { 
            ...inv, 
            status: 'error',
            error: error instanceof Error ? error.message : 'Errore sconosciuto'
          } : inv)
        );
        errorCount++;
      }
    }

    setIsProcessing(false);

    toast({
      title: 'Importazione completata',
      description: `${successCount} fatture importate con successo${errorCount > 0 ? `, ${errorCount} errori` : ''}`,
      variant: errorCount > 0 ? 'destructive' : 'default',
    });

    if (onImportComplete) {
      onImportComplete();
    }
  };

  const getStatusIcon = (status: ImportedInvoice['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'importing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      default:
        return <FileSpreadsheet className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: ImportedInvoice['status']) => {
    const variants: Record<ImportedInvoice['status'], 'default' | 'secondary' | 'destructive'> = {
      pending: 'secondary',
      importing: 'default',
      completed: 'default',
      error: 'destructive',
    };

    const labels = {
      pending: 'In attesa',
      importing: 'Importazione...',
      completed: 'Completata',
      error: 'Errore',
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importa Fatture da CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {importedInvoices.length === 0 ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isDragActive ? 'Rilascia il file qui' : 'Trascina un file CSV qui'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              oppure clicca per selezionare un file
            </p>
            <p className="text-xs text-muted-foreground">
              Formato CSV con colonne: Numero Fattura, Fornitore, Descrizione, Importo
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Fatture da importare ({importedInvoices.length})
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setImportedInvoices([])}
                    disabled={isProcessing}
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={importInvoices}
                    disabled={isProcessing || importedInvoices.every(inv => inv.status === 'completed')}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importazione...
                      </>
                    ) : (
                      'Importa Fatture'
                    )}
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <Progress 
                  value={(importedInvoices.filter(inv => inv.status === 'completed' || inv.status === 'error').length / importedInvoices.length) * 100} 
                />
              )}

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Stato</th>
                        <th className="text-left p-3 text-sm font-medium">Numero Fattura</th>
                        <th className="text-left p-3 text-sm font-medium">Fornitore</th>
                        <th className="text-left p-3 text-sm font-medium">Descrizione</th>
                        <th className="text-right p-3 text-sm font-medium">Importo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-t">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(invoice.status)}
                              {getStatusBadge(invoice.status)}
                            </div>
                          </td>
                          <td className="p-3 text-sm">{invoice.invoiceNumber}</td>
                          <td className="p-3 text-sm">{invoice.supplier}</td>
                          <td className="p-3 text-sm max-w-md truncate" title={invoice.description}>
                            {invoice.description}
                          </td>
                          <td className="p-3 text-sm text-right font-medium">
                            €{invoice.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {importedInvoices.some(inv => inv.error) && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-semibold text-destructive mb-2">Errori di importazione:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {importedInvoices
                      .filter(inv => inv.error)
                      .map(inv => (
                        <li key={inv.id} className="text-sm text-destructive">
                          Fattura {inv.invoiceNumber}: {inv.error}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
