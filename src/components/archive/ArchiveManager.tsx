import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Archive, 
  Shield, 
  Calendar, 
  FileCheck, 
  Clock, 
  Lock,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle
} from 'lucide-react';
import { useArchivePolicies, useDocumentArchives, useCreateArchivePolicy, useCreateArchive, useSealArchive } from '@/hooks/useArchives';
import { useDocuments } from '@/hooks/useDocuments';

export function ArchiveManager() {
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [selectedDocument, setSelectedDocument] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [isCreateArchiveOpen, setIsCreateArchiveOpen] = useState(false);

  const { data: policies, isLoading: policiesLoading } = useArchivePolicies();
  const { data: archives, isLoading: archivesLoading } = useDocumentArchives();
  const { data: documents } = useDocuments();
  
  const createPolicy = useCreateArchivePolicy();
  const createArchive = useCreateArchive();
  const sealArchive = useSealArchive();

  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    retention_period_months: 12,
    auto_seal_enabled: false,
    legal_requirement: '',
    document_types: [] as string[]
  });

  const handleCreatePolicy = () => {
    createPolicy.mutate(newPolicy, {
      onSuccess: () => {
        setIsCreatePolicyOpen(false);
        setNewPolicy({
          name: '',
          description: '',
          retention_period_months: 12,
          auto_seal_enabled: false,
          legal_requirement: '',
          document_types: []
        });
      }
    });
  };

  const handleCreateArchive = () => {
    if (!selectedDocument || !selectedPolicy) return;
    
    const document = documents?.find(d => d.id === selectedDocument);
    if (!document) return;

    // In a real implementation, you would fetch the actual file content
    const mockFileData = `Mock file content for ${document.title}`;
    
    createArchive.mutate({
      documentId: selectedDocument,
      policyId: selectedPolicy,
      fileData: mockFileData
    }, {
      onSuccess: () => {
        setIsCreateArchiveOpen(false);
        setSelectedDocument('');
        setSelectedPolicy('');
      }
    });
  };

  const handleSealArchive = (archiveId: string) => {
    sealArchive.mutate(archiveId);
  };

  const getStatusColor = (archive: any) => {
    if (archive.sealed_at) return 'bg-red-500';
    
    const expiryDate = new Date(archive.retention_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = (archive: any) => {
    if (archive.sealed_at) return 'Sigillato';
    
    const expiryDate = new Date(archive.retention_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (daysUntilExpiry <= 0) return 'Scaduto';
    if (daysUntilExpiry <= 30) return `Scade in ${daysUntilExpiry} giorni`;
    return 'Attivo';
  };

  const filteredArchives = archives?.filter(archive => {
    const document = documents?.find(d => d.id === archive.document_id);
    const policy = policies?.find(p => p.id === archive.archive_policy_id);
    
    const matchesSearch = document?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (filterStatus === 'all') return true;
    if (filterStatus === 'sealed') return !!archive.sealed_at;
    if (filterStatus === 'active') return !archive.sealed_at;
    if (filterStatus === 'expiring') {
      const expiryDate = new Date(archive.retention_expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
      return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Archive Manager</h1>
          <p className="text-muted-foreground">
            Gestisci le politiche di archiviazione e il ciclo di vita dei documenti
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreatePolicyOpen} onOpenChange={setIsCreatePolicyOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuova Politica
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crea Politica di Archiviazione</DialogTitle>
                <DialogDescription>
                  Definisci i parametri per l'archiviazione automatica dei documenti
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="policy-name">Nome Politica</Label>
                  <Input
                    id="policy-name"
                    value={newPolicy.name}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="es. Fatture Commerciali"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="policy-desc">Descrizione</Label>
                  <Textarea
                    id="policy-desc"
                    value={newPolicy.description}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrivi l'utilizzo di questa politica..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="retention-months">Periodo di Conservazione (mesi)</Label>
                  <Input
                    id="retention-months"
                    type="number"
                    value={newPolicy.retention_period_months}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, retention_period_months: parseInt(e.target.value) }))}
                    min="1"
                    max="120"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="legal-req">Requisito Legale</Label>
                  <Input
                    id="legal-req"
                    value={newPolicy.legal_requirement}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, legal_requirement: e.target.value }))}
                    placeholder="es. Art. 2220 Codice Civile"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newPolicy.auto_seal_enabled}
                    onCheckedChange={(checked) => setNewPolicy(prev => ({ ...prev, auto_seal_enabled: checked }))}
                  />
                  <Label>Sigillo Automatico</Label>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreatePolicy}
                  disabled={createPolicy.isPending || !newPolicy.name}
                >
                  {createPolicy.isPending ? 'Creando...' : 'Crea Politica'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateArchiveOpen} onOpenChange={setIsCreateArchiveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Archive className="h-4 w-4 mr-2" />
                Archivia Documento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Archivia Documento</DialogTitle>
                <DialogDescription>
                  Seleziona un documento e una politica di archiviazione
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Documento</Label>
                  <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un documento" />
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
                <div className="grid gap-2">
                  <Label>Politica di Archiviazione</Label>
                  <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona una politica" />
                    </SelectTrigger>
                    <SelectContent>
                      {policies?.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.name} ({policy.retention_period_months} mesi)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateArchive}
                  disabled={createArchive.isPending || !selectedDocument || !selectedPolicy}
                >
                  {createArchive.isPending ? 'Archiviando...' : 'Archivia'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="archives" className="space-y-4">
        <TabsList>
          <TabsTrigger value="archives">Archivi Documenti</TabsTrigger>
          <TabsTrigger value="policies">Politiche</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="archives" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Cerca archivi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli Stati</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="sealed">Sigillati</SelectItem>
                <SelectItem value="expiring">In Scadenza</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            {archivesLoading ? (
              <div className="text-center py-8">Caricamento archivi...</div>
            ) : filteredArchives?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun archivio trovato
              </div>
            ) : (
              filteredArchives?.map((archive) => (
                <Card key={archive.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Archive className="h-5 w-5" />
                        <div>
                          <CardTitle className="text-lg">
                            {documents?.find(d => d.id === archive.document_id)?.title || 'Documento sconosciuto'}
                          </CardTitle>
                          <CardDescription>
                            Politica: {policies?.find(p => p.id === archive.archive_policy_id)?.name || 'Politica sconosciuta'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          className={`${getStatusColor(archive)} text-white`}
                        >
                          {getStatusText(archive)}
                        </Badge>
                        {!archive.sealed_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSealArchive(archive.id)}
                            disabled={sealArchive.isPending}
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Sigilla
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Archiviato</div>
                          <div className="text-muted-foreground">
                            {new Date(archive.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Scade</div>
                          <div className="text-muted-foreground">
                            {new Date(archive.retention_expires_at).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Dimensione</div>
                          <div className="text-muted-foreground">
                            {(archive.file_size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Hash</div>
                          <div className="text-muted-foreground font-mono text-xs">
                            {archive.archived_hash.substring(0, 16)}...
                          </div>
                        </div>
                      </div>
                    </div>
                    {policies?.find(p => p.id === archive.archive_policy_id)?.legal_requirement && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-blue-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Requisito Legale:</span>
                          {policies?.find(p => p.id === archive.archive_policy_id)?.legal_requirement}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <div className="grid gap-4">
            {policiesLoading ? (
              <div className="text-center py-8">Caricamento politiche...</div>
            ) : policies?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna politica configurata
              </div>
            ) : (
              policies?.map((policy) => (
                <Card key={policy.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{policy.name}</CardTitle>
                        <CardDescription>{policy.description}</CardDescription>
                      </div>
                      <Badge variant={policy.auto_seal_enabled ? "default" : "secondary"}>
                        {policy.auto_seal_enabled ? 'Auto-Sigillo' : 'Manuale'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Periodo di Conservazione</div>
                        <div className="text-muted-foreground">
                          {policy.retention_period_months} mesi
                        </div>
                      </div>
                      {policy.legal_requirement && (
                        <div>
                          <div className="font-medium">Requisito Legale</div>
                          <div className="text-muted-foreground">
                            {policy.legal_requirement}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">Tipi Documento</div>
                        <div className="text-muted-foreground">
                          {policy.document_types?.length > 0 
                            ? policy.document_types.join(', ') 
                            : 'Tutti i tipi'
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Registro completo delle attività di archiviazione
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Feature in sviluppo - Visualizzazione log delle attività
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}