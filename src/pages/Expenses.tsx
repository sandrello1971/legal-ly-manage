import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseProcessor } from '@/components/expenses/ExpenseProcessor';
import { ExpenseReviewDashboard } from '@/components/expenses/ExpenseReviewDashboard';
import { ExpenseAutoClassifier } from '@/components/expenses/ExpenseAutoClassifier';
import { Upload, Brain } from 'lucide-react';

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="processor" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Caricamento Spese
          </TabsTrigger>
          <TabsTrigger value="classifier" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Auto-Classifier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Caricamento e Gestione Spese</CardTitle>
              <CardDescription>
                Carica fatture e documenti di spesa, visualizza ed elabora con AI
              </CardDescription>
            </CardHeader>
          </Card>
          <ExpenseProcessor />
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