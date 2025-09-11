import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BankStatementUploader } from '@/components/banking/BankStatementUploader';
import { TransactionParser } from '@/components/banking/TransactionParser';
import { ReconciliationEngine } from '@/components/banking/ReconciliationEngine';

export default function Banking() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Banking & Reconciliation</h1>
        <p className="text-muted-foreground">
          Upload bank statements, parse transactions, and reconcile with expenses
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Statements</TabsTrigger>
          <TabsTrigger value="parser">Transaction Parser</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <BankStatementUploader />
        </TabsContent>

        <TabsContent value="parser" className="space-y-6">
          <TransactionParser />
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-6">
          <ReconciliationEngine />
        </TabsContent>
      </Tabs>
    </div>
  );
}