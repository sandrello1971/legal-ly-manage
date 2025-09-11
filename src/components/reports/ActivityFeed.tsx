import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { 
  Activity,
  Upload,
  Eye,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Calendar,
  RefreshCw,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { AnalyticsData } from '@/hooks/useAnalytics';
import { useExpenses } from '@/hooks/useExpenses';
import { useProjects } from '@/hooks/useProjects';

interface ActivityFeedProps {
  data: AnalyticsData;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
  onRefresh: () => void;
}

export function ActivityFeed({ data, onExport, onRefresh }: ActivityFeedProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [quickUploadData, setQuickUploadData] = useState({
    projectId: '',
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0]
  });

  const { createExpense } = useExpenses();
  const { projects } = useProjects();

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    // Quick upload logic would go here
    console.log('Quick upload files:', acceptedFiles);
    setShowUploadDialog(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    multiple: true
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'expense':
        return <DollarSign className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'project':
        return <Calendar className="h-4 w-4" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'text-success';
      case 'rejected':
        return 'text-destructive';
      case 'pending':
        return 'text-warning';
      case 'completed':
        return 'text-success';
      case 'in_progress':
        return 'text-primary';
      case 'on_hold':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-success" />;
      case 'rejected':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-warning" />;
      default:
        return null;
    }
  };

  const handleQuickExpense = async () => {
    try {
      if (!quickUploadData.projectId || !quickUploadData.description || !quickUploadData.amount) {
        return;
      }

      await createExpense({
        project_id: quickUploadData.projectId,
        description: quickUploadData.description,
        amount: parseFloat(quickUploadData.amount),
        expense_date: quickUploadData.date,
        category: quickUploadData.category as any || 'other'
      });

      setQuickUploadData({
        projectId: '',
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
      });
      setShowUploadDialog(false);
      onRefresh();
    } catch (error) {
      console.error('Error creating quick expense:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Activity Feed */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                Attività recenti del sistema
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-b-0">
                <div className={`mt-0.5 ${getStatusColor(activity.status)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <div className="flex items-center gap-2">
                      {activity.amount && (
                        <span className="text-xs font-medium">
                          {formatCurrency(activity.amount)}
                        </span>
                      )}
                      {activity.status && (
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(activity.status)}
                            <span className="capitalize">{activity.status}</span>
                          </span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.timestamp), 'dd MMM yyyy HH:mm', { locale: it })}
                  </p>
                </div>
              </div>
            ))}
            
            {data.recentActivity.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nessuna attività recente</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Azioni rapide per gestire il sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Quick Upload */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Rapido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Rapido</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">
                    {isDragActive ? 'Rilascia qui' : 'Trascina file o clicca'}
                  </p>
                </div>
                
                <div className="text-center text-sm text-muted-foreground">oppure</div>
                
                <div className="space-y-3">
                  <div>
                    <Label>Progetto</Label>
                    <Select value={quickUploadData.projectId} onValueChange={(value) => 
                      setQuickUploadData(prev => ({ ...prev, projectId: value }))
                    }>
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
                    <Label>Descrizione</Label>
                    <Input
                      value={quickUploadData.description}
                      onChange={(e) => setQuickUploadData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrizione spesa"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Importo (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={quickUploadData.amount}
                        onChange={(e) => setQuickUploadData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input
                        type="date"
                        value={quickUploadData.date}
                        onChange={(e) => setQuickUploadData(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Categoria</Label>
                    <Select value={quickUploadData.category} onValueChange={(value) => 
                      setQuickUploadData(prev => ({ ...prev, category: value }))
                    }>
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
                  
                  <Button onClick={handleQuickExpense} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Spesa
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Review Pending */}
          <Button className="w-full justify-start" variant="outline" asChild>
            <a href="/expenses">
              <Eye className="h-4 w-4 mr-2" />
              Review Pending ({data.pendingDocuments.total})
            </a>
          </Button>

          {/* Generate Report */}
          <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
            <DialogTrigger asChild>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Genera Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Genera Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Seleziona il formato per esportare i dati analytics
                </p>
                <div className="grid gap-2">
                  <Button onClick={() => onExport('csv')} variant="outline" className="justify-start">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button onClick={() => onExport('excel')} variant="outline" className="justify-start">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button onClick={() => onExport('pdf')} variant="outline" className="justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Quick Export */}
          <Button 
            className="w-full justify-start" 
            variant="outline"
            onClick={() => onExport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Dati
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}