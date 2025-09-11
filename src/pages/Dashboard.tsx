import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, TrendingUp, FolderOpen, PlusCircle, FileUp, Receipt } from 'lucide-react';
import { useDocuments } from '@/hooks/useDocuments';
import { useBandi } from '@/hooks/useBandi';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: documents, isLoading: documentsLoading } = useDocuments();
  const { bandi, loading: bandiLoading } = useBandi();

  const stats = [
    {
      title: 'Documenti Totali',
      value: documentsLoading ? '...' : (documents?.length || 0).toString(),
      description: 'Documenti caricati',
      icon: FileText,
    },
    {
      title: 'Bandi Attivi',
      value: bandiLoading ? '...' : (bandi?.filter(b => b.status === 'active').length || 0).toString(),
      description: 'Bandi attivi',
      icon: FolderOpen,
    },
    {
      title: 'Bandi Totali',
      value: bandiLoading ? '...' : (bandi?.length || 0).toString(),
      description: 'Tutti i bandi',
      icon: TrendingUp,
    },
    {
      title: 'Importo Totale',
      value: bandiLoading ? '...' : `€${bandi?.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0).toLocaleString('it-IT') || '0'}`,
      description: 'Valore bandi totale',
      icon: DollarSign,
    },
  ];

  // Get recent activity from documents and bandi
  const recentActivity = [];
  
  if (documents) {
    documents.slice(0, 3).forEach(doc => {
      recentActivity.push({
        type: 'document',
        title: `Documento caricato: ${doc.title}`,
        time: formatDistanceToNow(new Date(doc.created_at), { addSuffix: true, locale: it }),
        color: 'bg-primary'
      });
    });
  }

  if (bandi) {
    bandi.slice(0, 2).forEach(bando => {
      recentActivity.push({
        type: 'bando',
        title: `Bando ${bando.status === 'active' ? 'attivo' : 'creato'}: ${bando.title}`,
        time: formatDistanceToNow(new Date(bando.created_at), { addSuffix: true, locale: it }),
        color: bando.status === 'active' ? 'bg-accent' : 'bg-muted'
      });
    });
  }

  // Sort by most recent and take first 5
  recentActivity.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const displayActivity = recentActivity.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Benvenuto nella tua dashboard LegalTender Pro
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Attività Recente</CardTitle>
            <CardDescription>
              I tuoi ultimi documenti e aggiornamenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayActivity.length > 0 ? (
              <div className="space-y-4">
                {displayActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nessuna attività recente</p>
                  <p className="text-xs text-muted-foreground">Inizia caricando documenti o creando bandi</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>
              Attività comuni e scorciatoie
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start p-3 h-auto"
              onClick={() => navigate('/documents')}
            >
              <FileUp className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">Carica Documento</div>
                <div className="text-sm text-muted-foreground">Aggiungi nuovi documenti</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start p-3 h-auto"
              onClick={() => navigate('/bandi')}
            >
              <PlusCircle className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">Crea Bando</div>
                <div className="text-sm text-muted-foreground">Aggiungi un nuovo bando</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start p-3 h-auto"
              onClick={() => navigate('/expenses')}
            >
              <Receipt className="h-4 w-4 mr-3" />
              <div className="text-left">
                <div className="font-medium">Gestisci Spese</div>
                <div className="text-sm text-muted-foreground">Registra e monitora spese</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}