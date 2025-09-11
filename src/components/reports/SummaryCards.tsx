import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wallet, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { AnalyticsData } from '@/hooks/useAnalytics';

interface SummaryCardsProps {
  data: AnalyticsData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'text-destructive';
      case 'warning': return 'text-warning';
      case 'approved': return 'text-success';
      case 'rejected': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Budget Overview Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget vs Speso</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(data.budgetOverview.spentBudget)}
              </div>
              <div className="text-xs text-muted-foreground">
                di {formatCurrency(data.budgetOverview.totalBudget)} budget totale
              </div>
            </div>
            
            <Progress 
              value={data.budgetOverview.percentageSpent} 
              className="h-2"
            />
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {data.budgetOverview.percentageSpent.toFixed(1)}% utilizzato
              </span>
              <div className="flex items-center gap-1">
                {data.budgetOverview.spentBudget <= data.budgetOverview.totalBudget ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={data.budgetOverview.spentBudget <= data.budgetOverview.totalBudget ? 'text-success' : 'text-destructive'}>
                  {formatCurrency(data.budgetOverview.remainingBudget)} restanti
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Documents Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documenti Pending</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">{data.pendingDocuments.total}</div>
              <div className="text-xs text-muted-foreground">
                Documenti in attesa di revisione
              </div>
            </div>
            
            <div className="space-y-2">
              {data.pendingDocuments.byStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span className="capitalize">{item.status}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scadenze</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">{data.upcomingDeadlines.total}</div>
              <div className="text-xs text-muted-foreground">
                Scadenze imminenti
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-destructive">Urgenti (3 giorni)</span>
                <Badge variant="destructive" className="text-xs">
                  {data.upcomingDeadlines.urgent}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-warning">Attenzione (7 giorni)</span>
                <Badge variant="secondary" className="text-xs bg-warning/20 text-warning">
                  {data.upcomingDeadlines.critical}
                </Badge>
              </div>
            </div>
            
            {data.upcomingDeadlines.deadlines.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium">Prossime:</div>
                {data.upcomingDeadlines.deadlines.slice(0, 2).map((deadline) => (
                  <div key={deadline.id} className="text-xs">
                    <div className="font-medium">{deadline.title}</div>
                    <div className={`text-xs ${getStatusColor(deadline.status)}`}>
                      {format(new Date(deadline.date), 'dd MMM yyyy', { locale: it })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anomalies Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Anomalie</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="text-2xl font-bold">{data.anomalies.total}</div>
              <div className="text-xs text-muted-foreground">
                Problemi rilevati
              </div>
            </div>
            
            {data.anomalies.types.length > 0 ? (
              <div className="space-y-2">
                {data.anomalies.types.map((anomaly, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span>{anomaly.type}</span>
                    <Badge 
                      variant={anomaly.severity === 'high' ? 'destructive' : 
                              anomaly.severity === 'medium' ? 'secondary' : 'outline'}
                      className="text-xs"
                    >
                      {anomaly.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Nessuna anomalia rilevata
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}