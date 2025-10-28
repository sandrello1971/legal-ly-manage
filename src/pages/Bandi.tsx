import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Euro,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Circle,
  Target,
  Receipt,
  CheckSquare,
  BarChart3,
  ArrowRight,
  Bot,
  User
} from "lucide-react";
import { BandoForm } from "@/components/bandi/BandoForm";
import { useBandi } from "@/hooks/useBandi";
import { BandoDetailWithTabs } from "@/components/bandi/BandoDetailWithTabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useNavigate } from 'react-router-dom';
import { useProjects } from '@/hooks/useProjects';
import { useExpenses } from '@/hooks/useExpenses';

interface Phase {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  icon: React.ElementType;
  route?: string;
  hasAI?: boolean;
  hasManual?: boolean;
}

export default function Bandi() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedBando, setSelectedBando] = useState<string | null>(null);
  const [editingBando, setEditingBando] = useState<any>(null);

  const { bandi, loading, error, createBando, updateBando, deleteBando } = useBandi();
  const { projects } = useProjects();
  const { expenses } = useExpenses();

  // Calculate workflow phase status
  const calculatePhaseStatus = (phaseId: string): 'pending' | 'in-progress' | 'completed' => {
    const documentExpenses = expenses.filter(e => 
      e.category === 'services' || 
      e.category === 'materials' || 
      e.category === 'equipment'
    );
    const personnelExpenses = expenses.filter(e => e.category === 'personnel');
    const approvedExpenses = expenses.filter(e => e.is_approved === true);
    
    switch (phaseId) {
      case '1b':
        return bandi.length > 0 ? 'completed' : 'pending';
      case '2b':
        return projects.length > 0 ? 'completed' : bandi.length > 0 ? 'in-progress' : 'pending';
      case '3':
        return documentExpenses.length > 0 ? 'completed' : projects.length > 0 ? 'in-progress' : 'pending';
      case '5':
        return personnelExpenses.length > 0 ? 'completed' : projects.length > 0 ? 'in-progress' : 'pending';
      case '6':
        return approvedExpenses.length > 0 ? 'completed' : expenses.length > 0 ? 'in-progress' : 'pending';
      case '7':
        return approvedExpenses.length > 0 ? 'in-progress' : 'pending';
      default:
        return 'pending';
    }
  };

  const phases: Phase[] = [
    {
      id: '1b',
      title: 'Bando Requirements',
      description: 'Inserimento e analisi dei requisiti del bando di finanziamento',
      status: calculatePhaseStatus('1b'),
      icon: Target,
      hasAI: true,
      hasManual: true
    },
    {
      id: '2b',
      title: 'Project Details',
      description: 'Definizione dettagli del progetto approvato',
      status: calculatePhaseStatus('2b'),
      icon: FileText,
      hasAI: true,
      hasManual: true
    },
    {
      id: '3',
      title: 'Expense Documents',
      description: 'Caricamento documenti di spesa (fatture)',
      status: calculatePhaseStatus('3'),
      icon: Receipt,
      route: '/expenses'
    },
    {
      id: '5',
      title: 'Personnel Expenses',
      description: 'Caricamento spese del personale (timesheet)',
      status: calculatePhaseStatus('5'),
      icon: Clock,
      route: '/expenses'
    },
    {
      id: '6',
      title: 'Documentation Verification',
      description: 'Verifica e approvazione della documentazione',
      status: calculatePhaseStatus('6'),
      icon: CheckSquare,
      route: '/expenses'
    },
    {
      id: '7',
      title: 'Reporting Outcome',
      description: 'Generazione report e risultati finali',
      status: calculatePhaseStatus('7'),
      icon: BarChart3,
      route: '/reports'
    }
  ];

  const completedPhases = phases.filter(phase => phase.status === 'completed').length;
  const totalPhases = phases.length;
  const overallProgress = (completedPhases / totalPhases) * 100;

  const getWorkflowStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <Circle className="w-5 h-5 text-yellow-600 animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getWorkflowStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completata</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In Corso</Badge>;
      default:
        return <Badge variant="secondary">In Attesa</Badge>;
    }
  };

  const canAccessPhase = (phaseIndex: number) => {
    if (phaseIndex === 0) return true;
    const previousPhase = phases[phaseIndex - 1];
    return previousPhase.status === 'completed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'active': return <CheckCircle2 className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <Clock className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Bozza';
      case 'active': return 'Attivo';
      case 'expired': return 'Scaduto';
      case 'completed': return 'Completato';
      default: return status;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'active': return 'default';
      case 'expired': return 'destructive';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredBandi = bandi?.filter(bando => {
    const matchesSearch = bando.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bando.organization?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bando.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleSaveBando = async (data: any) => {
    try {
      let saved;
      if (editingBando) {
        saved = await updateBando(editingBando.id, data);
      } else {
        saved = await createBando(data);
      }
      setShowForm(false);
      setEditingBando(null);
      return saved;
    } catch (error) {
      console.error('Error saving bando:', error);
      throw error;
    }
  };

  const handleEditBando = (bando: any) => {
    console.log('Editing bando:', bando);
    setEditingBando(bando);
    setShowForm(true);
    setSelectedBando(null); // Chiudi la vista dettaglio
  };

  const handleDeleteBando = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo bando?')) {
      await deleteBando(id);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Errore nel caricamento dei bandi: {error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedBando) {
    return (
      <BandoDetailWithTabs
        bandoId={selectedBando}
        onBack={() => setSelectedBando(null)}
        onEdit={handleEditBando}
        onDelete={handleDeleteBando}
      />
    );
  }

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {editingBando ? 'Modifica Bando' : 'Nuovo Bando'}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditingBando(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <BandoForm 
              initialData={editingBando}
              onSave={handleSaveBando}
              onCancel={() => {
                setShowForm(false);
                setEditingBando(null);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Workflow Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workflow Gestione Bandi</h1>
            <p className="text-muted-foreground">
              Segui il flusso sequenziale per completare il processo di gestione
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{completedPhases}/{totalPhases}</div>
            <p className="text-sm text-muted-foreground">Fasi Completate</p>
          </div>
        </div>
      </div>

      {/* Phases Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isAccessible = canAccessPhase(index);
          
          return (
            <Card 
              key={phase.id} 
              className={`transition-all duration-200 hover:shadow-lg ${
                !isAccessible ? 'opacity-50' : ''
              } ${
                phase.status === 'completed' ? 'border-green-200 bg-green-50' :
                phase.status === 'in-progress' ? 'border-yellow-200 bg-yellow-50' :
                'border-border'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-6 h-6" />
                    <div>
                      <CardTitle className="text-base">Fase {phase.id}</CardTitle>
                      <CardDescription className="text-sm font-medium">
                        {phase.title}
                      </CardDescription>
                    </div>
                  </div>
                  {getWorkflowStatusIcon(phase.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {phase.description}
                </p>
                
                {(phase.hasAI || phase.hasManual) && (
                  <div className="flex gap-2">
                    {phase.hasManual && (
                      <Badge variant="outline" className="text-xs">
                        <User className="w-3 h-3 mr-1" />
                        Manuale
                      </Badge>
                    )}
                    {phase.hasAI && (
                      <Badge variant="outline" className="text-xs">
                        <Bot className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  {getWorkflowStatusBadge(phase.status)}
                  
                  {phase.route && isAccessible && (
                    <Button
                      variant={phase.status === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => navigate(phase.route!)}
                      className="ml-2"
                    >
                      {phase.status === 'pending' ? 'Inizia' : 
                       phase.status === 'in-progress' ? 'Continua' : 'Visualizza'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bandi Attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bandi.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progetti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spese Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spese Approvate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenses.filter(e => e.is_approved === true).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bandi List Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestione Bandi</h1>
          <p className="text-muted-foreground">
            Gestisci bandi, finanziamenti e opportunità di funding
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Bando
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cerca per titolo o organizzazione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="draft">Bozza</SelectItem>
                <SelectItem value="active">Attivo</SelectItem>
                <SelectItem value="expired">Scaduto</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bandi Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBandi.map((bando) => (
          <Card 
            key={bando.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedBando(bando.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg line-clamp-2">
                  {bando.title}
                </CardTitle>
                <Badge 
                  variant={getStatusVariant(bando.status) as any}
                  className="ml-2 flex-shrink-0"
                >
                  {getStatusIcon(bando.status)}
                  <span className="ml-1">{getStatusLabel(bando.status)}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {bando.organization && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 mr-2" />
                  {bando.organization}
                </div>
              )}
              
              {bando.total_amount && (
                <div className="flex items-center text-sm font-medium">
                  <Euro className="h-4 w-4 mr-2" />
                  {new Intl.NumberFormat('it-IT', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(bando.total_amount)}
                </div>
              )}
              
              {bando.application_deadline && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  Scadenza: {format(new Date(bando.application_deadline), 'dd MMM yyyy', { locale: it })}
                </div>
              )}
              
              {bando.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {bando.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBandi.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun bando trovato</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Prova a modificare i filtri di ricerca' 
                : 'Inizia creando il tuo primo bando'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crea Primo Bando
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}