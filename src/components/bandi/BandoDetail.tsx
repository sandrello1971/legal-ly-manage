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
import { useProjects } from "@/hooks/useProjects";

interface BandoDetailProps {
  bandoId: string;
  onBack: () => void;
  onEdit: (bando: Bando) => void;
  onDelete: (id: string) => void;
}

export const BandoDetail = ({ bandoId, onBack, onEdit, onDelete }: BandoDetailProps) => {
  const [bando, setBando] = useState<Bando | null>(null);
  const [loading, setLoading] = useState(true);
  const { getBandoById } = useBandi();
  const { projects } = useProjects(bandoId);

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
  }, [bandoId, getBandoById]);

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
                  {bando.parsed_data.objectives && (
                    <div>
                      <h4 className="font-medium mb-2">Obiettivi</h4>
                      <ul className="space-y-1">
                        {bando.parsed_data.objectives.map((obj: string, index: number) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start">
                            <Target className="h-3 w-3 mt-1 mr-2 flex-shrink-0" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {bando.parsed_data.expenseCategories && (
                    <div>
                      <h4 className="font-medium mb-2">Categorie di Spesa</h4>
                      <div className="space-y-2">
                        {bando.parsed_data.expenseCategories.map((cat: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-sm">{cat.category}</span>
                              {cat.maxPercentage && (
                                <Badge variant="outline" className="text-xs">
                                  Max {cat.maxPercentage}%
                                </Badge>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-xs text-muted-foreground">{cat.description}</p>
                            )}
                            {cat.maxAmount && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Importo massimo: {formatCurrency(cat.maxAmount)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
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
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Progetto
              </Button>
            </CardHeader>
            <CardContent>
              {projects && projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{project.title}</h4>
                        <Badge variant="outline">{project.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Budget: {formatCurrency(project.total_budget)}
                      </p>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${project.progress_percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Progresso: {project.progress_percentage}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Nessun progetto collegato a questo bando
                  </p>
                  <Button size="sm">
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
              {bando.total_amount && (
                <div className="flex items-center">
                  <Euro className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">{formatCurrency(bando.total_amount)}</p>
                    <p className="text-xs text-muted-foreground">Importo Totale</p>
                  </div>
                </div>
              )}

              {bando.application_deadline && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                  <div>
                    <p className="font-medium">{formatDate(bando.application_deadline)}</p>
                    <p className="text-xs text-muted-foreground">Scadenza Domanda</p>
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