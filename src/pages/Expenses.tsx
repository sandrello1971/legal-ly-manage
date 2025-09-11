import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseProcessor } from '@/components/expenses/ExpenseProcessor';
import { ExpenseReviewDashboard } from '@/components/expenses/ExpenseReviewDashboard';
import { ExpenseAutoClassifier } from '@/components/expenses/ExpenseAutoClassifier';
import { Upload, CheckSquare, Brain } from 'lucide-react';

export default function Expenses() {
  const [activeTab, setActiveTab] = useState('processor');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema di Rendicontazione Spese</h1>
          <p className="text-muted-foreground">
            Carica, elabora e gestisci le spese dei progetti con intelligenza artificiale
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processor" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Processor
          </TabsTrigger>
          <TabsTrigger value="review" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Dashboard Revisione
          </TabsTrigger>
          <TabsTrigger value="classifier" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Auto-Classifier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Processor</CardTitle>
              <CardDescription>
                Carica ricevute in batch, visualizza preview con confidence score e correggi manualmente i dati estratti
              </CardDescription>
            </CardHeader>
          </Card>
          <ExpenseProcessor />
        </TabsContent>

        <TabsContent value="review" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard di Revisione</CardTitle>
              <CardDescription>
                Approva o rifiuta spese, esegui operazioni in blocco, aggiungi commenti e visualizza lo storico delle modifiche
              </CardDescription>
            </CardHeader>
          </Card>
          <ExpenseReviewDashboard />
        </TabsContent>

        <TabsContent value="classifier" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Auto-Classifier AI</CardTitle>
              <CardDescription>
                Configura regole di classificazione automatica, visualizza indicatori di confidenza e fornisci feedback per migliorare l'accuratezza
              </CardDescription>
            </CardHeader>
          </Card>
          <ExpenseAutoClassifier />
        </TabsContent>
      </Tabs>
    </div>
  );
}