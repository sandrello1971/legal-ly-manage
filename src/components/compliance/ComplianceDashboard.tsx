import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  Download,
  Search,
  Plus,
  Eye,
  Edit,
  Award,
  BookOpen
} from 'lucide-react';
import { 
  useComplianceChecklists, 
  useDocumentCompliance, 
  useComplianceSummary,
  useCreateComplianceChecklist,
  useExportCertifiedCopy,
  useExportComplianceReport
} from '@/hooks/useCompliance';
import { useDocuments } from '@/hooks/useDocuments';

export function ComplianceDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateChecklistOpen, setIsCreateChecklistOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState('');

  const { data: checklists, isLoading: checklistsLoading } = useComplianceChecklists();
  const { data: compliance, isLoading: complianceLoading } = useDocumentCompliance();
  const { data: summary } = useComplianceSummary();
  const { data: documents } = useDocuments();

  const createChecklist = useCreateComplianceChecklist();
  const exportCertifiedCopy = useExportCertifiedCopy();
  const exportComplianceReport = useExportComplianceReport();

  const [newChecklist, setNewChecklist] = useState({
    name: '',
    description: '',
    regulation_reference: '',
    requirements: [] as any[],
    mandatory_fields: [] as string[],
    document_types: [] as string[],
    retention_min_months: undefined as number | undefined,
    retention_max_months: undefined as number | undefined
  });

  const [newRequirement, setNewRequirement] = useState({
    id: '',
    title: '',
    description: '',
    mandatory: false,
    verification_method: ''
  });

  const handleCreateChecklist = () => {
    createChecklist.mutate(newChecklist, {
      onSuccess: () => {
        setIsCreateChecklistOpen(false);
        setNewChecklist({
          name: '',
          description: '',
          regulation_reference: '',
          requirements: [],
          mandatory_fields: [],
          document_types: [],
          retention_min_months: undefined,
          retention_max_months: undefined
        });
      }
    });
  };

  const addRequirement = () => {
    if (!newRequirement.title) return;
    
    const requirement = {
      ...newRequirement,
      id: Date.now().toString()
    };
    
    setNewChecklist(prev => ({
      ...prev,
      requirements: [...prev.requirements, requirement]
    }));
    
    setNewRequirement({
      id: '',
      title: '',
      description: '',
      mandatory: false,
      verification_method: ''
    });
  };

  const removeRequirement = (id: string) => {
    setNewChecklist(prev => ({
      ...prev,
      requirements: prev.requirements.filter(req => req.id !== id)
    }));
  };

  const handleExportCertifiedCopy = () => {
    if (!selectedDocument) return;
    
    exportCertifiedCopy.mutate({
      documentId: selectedDocument,
      includeTimestamps: true,
      includeCompliance: true
    }, {
      onSuccess: (data) => {
        // Download the certified copy
        const blob = new Blob([JSON.stringify(data.certified_copy, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certified-copy-${selectedDocument}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const handleExportComplianceReport = () => {
    exportComplianceReport.mutate({}, {
      onSuccess: (data) => {
        // Download the compliance report
        const blob = new Blob([JSON.stringify(data.compliance_report, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'non_compliant':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'review_required':
        return <Eye className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-500';
      case 'non_compliant':
        return 'bg-red-500';
      case 'review_required':
        return 'bg-yellow-500';
      case 'pending':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'Conforme';
      case 'non_compliant':
        return 'Non Conforme';
      case 'review_required':
        return 'Revisione Richiesta';
      case 'pending':
        return 'In Attesa';
      default:
        return status;
    }
  };

  const filteredCompliance = compliance?.filter(item => {
    const document = documents?.find(d => d.id === item.document_id);
    const checklist = checklists?.find(c => c.id === item.checklist_id);
    
    const matchesSearch = document?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         checklist?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (selectedStatus === 'all') return true;
    return item.compliance_status === selectedStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitora la conformità normativa e gestisci i requisiti legali
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateChecklistOpen} onOpenChange={setIsCreateChecklistOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Checklist
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crea Checklist di Conformità</DialogTitle>
                <DialogDescription>
                  Definisci i requisiti di conformità per una normativa specifica
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="checklist-name">Nome Checklist</Label>
                  <Input
                    id="checklist-name"
                    value={newChecklist.name}
                    onChange={(e) => setNewChecklist(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="es. GDPR - Protezione Dati"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="regulation-ref">Riferimento Normativo</Label>
                  <Input
                    id="regulation-ref"
                    value={newChecklist.regulation_reference}
                    onChange={(e) => setNewChecklist(prev => ({ ...prev, regulation_reference: e.target.value }))}
                    placeholder="es. Regolamento UE 2016/679"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="checklist-desc">Descrizione</Label>
                  <Textarea
                    id="checklist-desc"
                    value={newChecklist.description}
                    onChange={(e) => setNewChecklist(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrivi i requisiti di questa checklist..."
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Requisiti</Label>
                  <div className="space-y-2">
                    {newChecklist.requirements.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{req.title}</div>
                          <div className="text-sm text-muted-foreground">{req.description}</div>
                          {req.mandatory && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Obbligatorio
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRequirement(req.id)}
                        >
                          Rimuovi
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Titolo requisito"
                      value={newRequirement.title}
                      onChange={(e) => setNewRequirement(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Input
                      placeholder="Metodo verifica"
                      value={newRequirement.verification_method}
                      onChange={(e) => setNewRequirement(prev => ({ ...prev, verification_method: e.target.value }))}
                    />
                  </div>
                  <Textarea
                    placeholder="Descrizione requisito..."
                    value={newRequirement.description}
                    onChange={(e) => setNewRequirement(prev => ({ ...prev, description: e.target.value }))}
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="mandatory"
                        checked={newRequirement.mandatory}
                        onChange={(e) => setNewRequirement(prev => ({ ...prev, mandatory: e.target.checked }))}
                      />
                      <Label htmlFor="mandatory">Requisito obbligatorio</Label>
                    </div>
                    <Button size="sm" onClick={addRequirement} disabled={!newRequirement.title}>
                      Aggiungi Requisito
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateChecklist}
                  disabled={createChecklist.isPending || !newChecklist.name || !newChecklist.regulation_reference}
                >
                  {createChecklist.isPending ? 'Creando...' : 'Crea Checklist'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleExportComplianceReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documenti Totali</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conformi</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.compliant}</div>
              <div className="text-xs text-muted-foreground">
                {summary.total > 0 ? Math.round((summary.compliant / summary.total) * 100) : 0}% del totale
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non Conformi</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.non_compliant}</div>
              <div className="text-xs text-muted-foreground">
                Richiedono attenzione immediata
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Punteggio Medio</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.average_score.toFixed(1)}%</div>
              <Progress value={summary.average_score} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="compliance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compliance">Stato Conformità</TabsTrigger>
          <TabsTrigger value="checklists">Checklist</TabsTrigger>
          <TabsTrigger value="export">Export & Certificati</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Cerca documenti o checklist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli Stati</SelectItem>
                <SelectItem value="compliant">Conformi</SelectItem>
                <SelectItem value="non_compliant">Non Conformi</SelectItem>
                <SelectItem value="review_required">Revisione Richiesta</SelectItem>
                <SelectItem value="pending">In Attesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {complianceLoading ? (
              <div className="text-center py-8">Caricamento stato conformità...</div>
            ) : filteredCompliance?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun documento in conformità trovato
              </div>
            ) : (
              filteredCompliance?.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(item.compliance_status)}
                        <div>
                          <CardTitle className="text-lg">
                            {documents?.find(d => d.id === item.document_id)?.title || 'Documento sconosciuto'}
                          </CardTitle>
                          <CardDescription>
                            Checklist: {checklists?.find(c => c.id === item.checklist_id)?.name || 'Checklist sconosciuta'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getStatusColor(item.compliance_status)} text-white`}>
                          {getStatusLabel(item.compliance_status)}
                        </Badge>
                        {item.compliance_score && (
                          <Badge variant="outline">
                            {item.compliance_score.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Requisiti Soddisfatti</div>
                        <div className="space-y-1">
                          {(item.requirements_met as any[])?.map((req, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>{req.title || req}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-2">Requisiti Non Soddisfatti</div>
                        <div className="space-y-1">
                          {(item.requirements_failed as any[])?.map((req, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <AlertCircle className="h-3 w-3 text-red-500" />
                              <span>{req.title || req}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {item.notes && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">Note: </span>
                          {item.notes}
                        </div>
                      </div>
                    )}
                    
                    {item.next_review_date && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Prossima revisione: {new Date(item.next_review_date).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <div className="grid gap-4">
            {checklistsLoading ? (
              <div className="text-center py-8">Caricamento checklist...</div>
            ) : checklists?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna checklist configurata
              </div>
            ) : (
              checklists?.map((checklist) => (
                <Card key={checklist.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5" />
                        <div>
                          <CardTitle>{checklist.name}</CardTitle>
                          <CardDescription>{checklist.regulation_reference}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {checklist.requirements?.length || 0} requisiti
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {checklist.description && (
                      <p className="text-sm text-muted-foreground mb-4">
                        {checklist.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Requisiti:</div>
                      {checklist.requirements?.map((req: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-sm p-2 border rounded">
                          <div className="flex-1">
                            <div className="font-medium">{req.title}</div>
                            {req.description && (
                              <div className="text-muted-foreground">{req.description}</div>
                            )}
                          </div>
                          {req.mandatory && (
                            <Badge variant="destructive" className="text-xs">
                              Obbligatorio
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {(checklist.retention_min_months || checklist.retention_max_months) && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm">
                          <span className="font-medium">Periodo di conservazione: </span>
                          {checklist.retention_min_months && checklist.retention_max_months
                            ? `${checklist.retention_min_months}-${checklist.retention_max_months} mesi`
                            : checklist.retention_min_months
                            ? `Minimo ${checklist.retention_min_months} mesi`
                            : `Massimo ${checklist.retention_max_months} mesi`
                          }
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Copia Certificata</CardTitle>
                <CardDescription>
                  Genera una copia certificata di un documento con timestamp e conformità
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Seleziona Documento</Label>
                  <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                    <SelectTrigger>
                      <SelectValue placeholder="Scegli un documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {documents?.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleExportCertifiedCopy}
                  disabled={!selectedDocument || exportCertifiedCopy.isPending}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportCertifiedCopy.isPending ? 'Generando...' : 'Genera Copia Certificata'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report di Conformità</CardTitle>
                <CardDescription>
                  Esporta un report completo dello stato di conformità
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Il report includerà tutti i documenti e il loro stato di conformità,
                  con raccomandazioni per il miglioramento.
                </div>
                <Button 
                  onClick={handleExportComplianceReport}
                  disabled={exportComplianceReport.isPending}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportComplianceReport.isPending ? 'Generando...' : 'Export Report Conformità'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}