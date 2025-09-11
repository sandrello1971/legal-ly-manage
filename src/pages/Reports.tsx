import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, BarChart3, AlertCircle } from 'lucide-react';
import { SummaryCards } from '@/components/reports/SummaryCards';
import { AnalyticsCharts } from '@/components/reports/AnalyticsCharts';
import { ActivityFeed } from '@/components/reports/ActivityFeed';
import { useAnalytics } from '@/hooks/useAnalytics';

export default function Reports() {
  const { data, loading, error, fetchAnalyticsData, exportData, refreshData } = useAnalytics();

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (loading && !data) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Analytics & Reporting</h1>
            <p className="text-muted-foreground">
              Analisi completa di budget, spese e performance
            </p>
          </div>
        </div>

        {/* Loading Skeletons */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Errore nel caricamento dei dati analytics: {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => fetchAnalyticsData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nessun dato disponibile</h2>
          <p className="text-muted-foreground mb-4">
            Non ci sono ancora dati sufficienti per generare analytics
          </p>
          <Button onClick={() => fetchAnalyticsData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Analytics & Reporting</h1>
          <p className="text-muted-foreground">
            Analisi completa di budget, spese e performance dei progetti
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
          <Button onClick={() => exportData('pdf')}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards data={data} />

      {/* Charts Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Analisi Visuale</h2>
          <p className="text-muted-foreground mb-6">
            Grafici e trend per comprendere meglio i dati
          </p>
        </div>
        <AnalyticsCharts data={data} />
      </div>

      {/* Activity Feed and Quick Actions */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Attività e Azioni Rapide</h2>
          <p className="text-muted-foreground mb-6">
            Monitor dell'attività recente e strumenti per azioni immediate
          </p>
        </div>
        <ActivityFeed 
          data={data} 
          onExport={exportData}
          onRefresh={refreshData}
        />
      </div>

      {/* Data Quality Indicators */}
      {data.anomalies.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Indicatori di Qualità Dati
            </CardTitle>
            <CardDescription>
              Problemi rilevati che potrebbero influenzare l'accuratezza dei report
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.anomalies.types.map((anomaly, index) => (
                <Alert key={index} variant={anomaly.severity === 'high' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{anomaly.type}:</strong> {anomaly.count} occorrenze rilevate.
                    {anomaly.severity === 'high' && ' Attenzione immediata richiesta.'}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}