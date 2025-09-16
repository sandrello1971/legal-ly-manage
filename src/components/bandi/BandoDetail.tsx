import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Euro,
  Building2,
  Mail,
  Phone,
  User,
  Globe,
  FileText,
  Target,
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  BarChart3
} from "lucide-react";
import { useBandi, type Bando } from "@/hooks/useBandi";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useProjects, type Project } from "@/hooks/useProjects";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectDashboard } from "@/components/projects/ProjectDashboard";

interface BandoDetailProps {
  bandoId: string;
  onBack: () => void;
  onEdit: (bando: Bando) => void;
  onDelete: (id: string) => void;
}

export const BandoDetail = ({ bandoId, onBack, onEdit, onDelete }: BandoDetailProps) => {
  const [bando, setBando] = useState<Bando | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  const { getBandoById } = useBandi();
  const { projects, refetch: refetchProjects } = useProjects(bandoId);

  useEffect(() => {
    const fetchBando = async () => {
      try {
        setLoading(true);
        const bandoData = await getBandoById(bandoId);
        setBando(bandoData);
      } catch (error) {
        console.error('Error fetching bando:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBando();
  }, [bandoId]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!bando) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p>Bando non trovato</p>
            <Button onClick={onBack} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla Lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd MMMM yyyy', { locale: it });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleProjectSuccess = () => {
    setShowProjectForm(false);
    setEditingProject(null);
    refetchProjects();
  };

  const handleEditProject = () => {
    setEditingProject(selectedProject);
    setShowProjectForm(true);
    setSelectedProject(null);
  };

  const handleAddExpense = () => {
    // TODO: Navigate to expenses page with project filter
    console.log('Add expense for project:', selectedProject?.id);
  };

  // Show project form
  if (showProjectForm) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setShowProjectForm(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro al Bando
          </Button>
          <h1 className="text-2xl font-bold">
            {editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}
          </h1>
        </div>
        <ProjectForm
          bandoId={bandoId}
          onSuccess={handleProjectSuccess}
          onCancel={() => {
            setShowProjectForm(false);
            setEditingProject(null);
          }}
          initialData={editingProject || undefined}
        />
      </div>
    );
  }

  // Show project dashboard
  if (selectedProject) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setSelectedProject(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro al Bando
          </Button>
        </div>
        <ProjectDashboard
          project={selectedProject}
          onEditProject={handleEditProject}
          onAddExpense={handleAddExpense}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{bando.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getStatusVariant(bando.status) as any}>
                {getStatusIcon(bando.status)}
                <span className="ml-1">{getStatusLabel(bando.status)}</span>
              </Badge>
              {bando.organization && (
                <Badge variant="outline">
                  <Building2 className="h-3 w-3 mr-1" />
                  {bando.organization}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(bando)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
          <Button variant="destructive" onClick={() => onDelete(bando.id)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Messaggio se i dati non sono stati processati */}
          {(!bando.description && !bando.total_amount && !bando.organization && !bando.parsed_data) && (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Dati del bando non ancora processati</h3>
                <p className="text-muted-foreground mb-4">
                  I dati del bando non sono stati ancora estratti dal documento PDF. 
                  Utilizzare il pulsante "Modifica" per processare il documento e popolare i campi.
                </p>
                <Button variant="outline" onClick={() => onEdit(bando)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica e Processa Documento
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Descrizione */}
          {bando.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descrizione</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {bando.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Criteri di Eleggibilità */}
          {bando.eligibility_criteria && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckSquare className="h-5 w-5 mr-2" />
                  Criteri di Eleggibilità
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {bando.eligibility_criteria}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Criteri di Valutazione */}
          {bando.evaluation_criteria && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Criteri di Valutazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {bando.evaluation_criteria}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Documenti Richiesti */}
          {bando.required_documents && bando.required_documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Documenti Richiesti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {bando.required_documents.map((doc, index) => (
                    <li key={index} className="flex items-center">
                      <CheckSquare className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                      <span className="text-muted-foreground">{doc}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Dati Estratti dal PDF */}
          {bando.parsed_data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Dati Estratti dal Decreto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Dati Economici */}
                  {(bando.parsed_data.total_amount || bando.parsed_data.min_funding || bando.parsed_data.max_funding || bando.parsed_data.funding_percentage) && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center">
                        <Euro className="h-4 w-4 mr-2" />
                        Dati Economici
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {bando.parsed_data.total_amount && (
                          <div className="bg-background border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Importo Totale</p>
                            <p className="font-semibold text-lg">{formatCurrency(bando.parsed_data.total_amount)}</p>
                          </div>
                        )}
                        {bando.parsed_data.min_funding && (
                          <div className="bg-background border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Importo Minimo</p>
                            <p className="font-semibold text-lg">{formatCurrency(bando.parsed_data.min_funding)}</p>
                          </div>
                        )}
                        {bando.parsed_data.max_funding && (
                          <div className="bg-background border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Importo Massimo</p>
                            <p className="font-semibold text-lg">{formatCurrency(bando.parsed_data.max_funding)}</p>
                          </div>
                        )}
                        {bando.parsed_data.funding_percentage && (
                          <div className="bg-background border rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Percentuale Copertura</p>
                            <p className="font-semibold text-lg">{bando.parsed_data.funding_percentage}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Categorie di Spesa */}
                  {bando.parsed_data.expense_categories && bando.parsed_data.expense_categories.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Categorie di Spesa Ammissibili
                      </h4>
                      <div className="space-y-3">
                        {bando.parsed_data.expense_categories.map((cat: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-medium">{cat.name}</h5>
                              <div className="flex gap-2">
                                {cat.max_percentage && (
                                  <Badge variant="outline" className="text-xs">
                                    Max {cat.max_percentage}%
                                  </Badge>
                                )}
                                {cat.max_amount && (
                                  <Badge variant="outline" className="text-xs">
                                    Max {formatCurrency(cat.max_amount)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {cat.description && (
                              <p className="text-sm text-muted-foreground mb-2">{cat.description}</p>
                            )}
                            {cat.eligible_expenses && cat.eligible_expenses.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-1">Spese Ammissibili:</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {cat.eligible_expenses.map((expense: string, expIndex: number) => (
                                    <li key={expIndex} className="flex items-start">
                                      <CheckSquare className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                                      {expense}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Altri dati estratti */}
                  {bando.parsed_data.target_companies && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Building2 className="h-4 w-4 mr-2" />
                        Destinatari
                      </h4>
                      <p className="text-sm text-muted-foreground">{bando.parsed_data.target_companies}</p>
                    </div>
                  )}

                  {bando.parsed_data.geographic_scope && (
                    <div>
                      <h4 className="font-medium mb-2">Ambito Geografico</h4>
                      <p className="text-sm text-muted-foreground">{bando.parsed_data.geographic_scope}</p>
                    </div>
                  )}

                  {bando.parsed_data.innovation_areas && bando.parsed_data.innovation_areas.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Aree di Innovazione</h4>
                      <div className="flex flex-wrap gap-2">
                        {bando.parsed_data.innovation_areas.map((area: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {bando.parsed_data.project_duration_months && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Durata Massima Progetto
                      </h4>
                      <p className="text-sm text-muted-foreground">{bando.parsed_data.project_duration_months} mesi</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progetti Collegati */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Progetti Collegati ({projects?.length || 0})
              </CardTitle>
              <Button size="sm" onClick={() => setShowProjectForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Progetto
              </Button>
            </CardHeader>
            <CardContent>
              {projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div 
                      key={project.id} 
                      className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{project.title}</h4>
                        <Badge variant="outline">{project.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-2">
                        <p>Budget: {formatCurrency(project.total_budget)}</p>
                        <p>Speso: {formatCurrency(project.spent_budget)}</p>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 mb-1">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${project.progress_percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progresso: {project.progress_percentage}%</span>
                        <span>Rimanente: {formatCurrency(project.remaining_budget)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nessun progetto collegato a questo bando
                  </p>
                  <Button size="sm" onClick={() => setShowProjectForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Primo Progetto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Informazioni Chiave */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Chiave</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Importo - priorità per dati estratti */}
              {(bando.parsed_data?.total_amount || bando.total_amount) && (
                <div className="flex items-center">
                  <Euro className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">
                      {bando.parsed_data?.total_amount ? 
                        formatCurrency(bando.parsed_data.total_amount) : 
                        formatCurrency(bando.total_amount)
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Importo Totale {bando.parsed_data?.total_amount ? '(Estratto)' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Range di finanziamento */}
              {(bando.parsed_data?.min_funding || bando.parsed_data?.max_funding) && (
                <div className="flex items-center">
                  <Euro className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">
                      {bando.parsed_data?.min_funding && bando.parsed_data?.max_funding 
                        ? `${formatCurrency(bando.parsed_data.min_funding)} - ${formatCurrency(bando.parsed_data.max_funding)}`
                        : bando.parsed_data?.min_funding 
                          ? `Min ${formatCurrency(bando.parsed_data.min_funding)}`
                          : `Max ${formatCurrency(bando.parsed_data.max_funding)}`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Range Finanziamento</p>
                  </div>
                </div>
              )}

              {/* Percentuale di copertura */}
              {bando.parsed_data?.funding_percentage && (
                <div className="flex items-center">
                  <Target className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">{bando.parsed_data.funding_percentage}%</p>
                    <p className="text-xs text-muted-foreground">Percentuale Copertura</p>
                  </div>
                </div>
              )}

              {/* Scadenza */}
              {(bando.parsed_data?.application_deadline || bando.application_deadline) && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">
                      {formatDate(bando.parsed_data?.application_deadline || bando.application_deadline)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scadenza Domanda {bando.parsed_data?.application_deadline ? '(Estratta)' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Durata progetto */}
              {bando.parsed_data?.project_duration_months && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">{bando.parsed_data.project_duration_months} mesi</p>
                    <p className="text-xs text-muted-foreground">Durata Massima</p>
                  </div>
                </div>
              )}

              {/* Organizzazione */}
              {(bando.parsed_data?.organization || bando.organization) && (
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">
                      {bando.parsed_data?.organization || bando.organization}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Organizzazione {bando.parsed_data?.organization ? '(Estratta)' : ''}
                    </p>
                  </div>
                </div>
              )}

              {bando.project_start_date && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">{formatDate(bando.project_start_date)}</p>
                    <p className="text-xs text-muted-foreground">Inizio Progetto</p>
                  </div>
                </div>
              )}

              {bando.project_end_date && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">{formatDate(bando.project_end_date)}</p>
                    <p className="text-xs text-muted-foreground">Fine Progetto</p>
                  </div>
                </div>
              )}

              {/* Se non ci sono informazioni chiave, mostra un messaggio */}
              {!bando.parsed_data?.total_amount && !bando.total_amount && 
               !bando.parsed_data?.application_deadline && !bando.application_deadline &&
               !bando.parsed_data?.organization && !bando.organization &&
               !bando.parsed_data?.min_funding && !bando.parsed_data?.max_funding &&
               !bando.project_start_date && !bando.project_end_date && (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nessuna informazione chiave disponibile
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    I dati verranno estratti automaticamente dal documento PDF
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contatti */}
          {(bando.contact_person || bando.contact_email || bando.contact_phone || bando.website_url) && (
            <Card>
              <CardHeader>
                <CardTitle>Contatti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bando.contact_person && (
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="text-sm">{bando.contact_person}</span>
                  </div>
                )}

                {bando.contact_email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-muted-foreground mr-2" />
                    <a 
                      href={`mailto:${bando.contact_email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {bando.contact_email}
                    </a>
                  </div>
                )}

                {bando.contact_phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                    <a 
                      href={`tel:${bando.contact_phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {bando.contact_phone}
                    </a>
                  </div>
                )}

                {bando.website_url && (
                  <div className="flex items-center">
                    <Globe className="h-4 w-4 text-muted-foreground mr-2" />
                    <a 
                      href={bando.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Visita Sito
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Decreto PDF */}
          {bando.decree_file_url && (
            <Card>
              <CardHeader>
                <CardTitle>Decreto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {bando.decree_file_name || 'Decreto PDF'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Documento ufficiale
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={bando.decree_file_url} target="_blank" rel="noopener noreferrer">
                      Apri
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};