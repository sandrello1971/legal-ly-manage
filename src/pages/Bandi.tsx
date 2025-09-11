import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  X
} from "lucide-react";
import { BandoForm } from "@/components/bandi/BandoForm";
import { useBandi } from "@/hooks/useBandi";
import { BandoDetail } from "@/components/bandi/BandoDetail";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Bandi() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedBando, setSelectedBando] = useState<string | null>(null);
  const [editingBando, setEditingBando] = useState<any>(null);

  const { bandi, loading, error, createBando, updateBando, deleteBando } = useBandi();

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
      if (editingBando) {
        await updateBando(editingBando.id, data);
      } else {
        await createBando(data);
      }
      setShowForm(false);
      setEditingBando(null);
    } catch (error) {
      console.error('Error saving bando:', error);
    }
  };

  const handleEditBando = (bando: any) => {
    setEditingBando(bando);
    setShowForm(true);
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
      <BandoDetail 
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
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