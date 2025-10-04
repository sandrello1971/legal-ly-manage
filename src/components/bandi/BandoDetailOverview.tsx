import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  Euro,
  Building2,
  Mail,
  Phone,
  User,
  Globe,
  FileText,
  Target,
  CheckSquare,
  Calendar,
  Clock,
  BarChart3
} from "lucide-react";
import { type Bando } from "@/hooks/useBandi";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface BandoDetailOverviewProps {
  bando: Bando;
  onEdit: (bando: Bando) => void;
}

export const BandoDetailOverview = ({ bando, onEdit }: BandoDetailOverviewProps) => {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Message if data not processed */}
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

        {/* Description */}
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

        {/* Eligibility Criteria */}
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

        {/* Evaluation Criteria */}
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

        {/* Required Documents */}
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

        {/* Parsed Data from PDF */}
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
                {/* Economic Data */}
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

                {/* Expense Categories */}
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

                {/* Other extracted data */}
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
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Key Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Chiave</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount - priority for extracted data */}
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

            {/* Funding range */}
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

            {/* Funding percentage */}
            {bando.parsed_data?.funding_percentage && (
              <div className="flex items-center">
                <Target className="h-4 w-4 text-muted-foreground mr-2" />
                <div>
                  <p className="font-medium">{bando.parsed_data.funding_percentage}%</p>
                  <p className="text-xs text-muted-foreground">Percentuale Copertura</p>
                </div>
              </div>
            )}

            {/* Deadline */}
            {(bando.parsed_data?.application_deadline || bando.application_deadline) && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                <div>
                  <p className="font-medium">
                    {formatDate(bando.parsed_data?.application_deadline || bando.application_deadline)}
                  </p>
                  <p className="text-xs text-muted-foreground">Scadenza Domanda</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Info */}
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
                  <a href={`mailto:${bando.contact_email}`} className="text-sm text-primary hover:underline">
                    {bando.contact_email}
                  </a>
                </div>
              )}
              {bando.contact_phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                  <a href={`tel:${bando.contact_phone}`} className="text-sm">
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

        {/* Decree PDF */}
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
  );
};
