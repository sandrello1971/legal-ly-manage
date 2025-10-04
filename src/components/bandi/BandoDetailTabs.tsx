import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, DollarSign, Banknote, BarChart3, FolderKanban, LayoutDashboard } from "lucide-react";
import { type Bando } from "@/hooks/useBandi";
import { Card, CardContent } from "@/components/ui/card";

interface BandoDetailTabsProps {
  bando: Bando;
  overviewContent: React.ReactNode;
  projectsContent: React.ReactNode;
  documentsContent: React.ReactNode;
  budgetContent: React.ReactNode;
}

export const BandoDetailTabs = ({ bando, overviewContent, projectsContent, documentsContent, budgetContent }: BandoDetailTabsProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="projects" className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4" />
          <span className="hidden sm:inline">Progetti</span>
        </TabsTrigger>
        <TabsTrigger value="documents" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Documenti</span>
        </TabsTrigger>
        <TabsTrigger value="budget" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Budget</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {overviewContent}
      </TabsContent>

      <TabsContent value="projects" className="mt-6">
        {projectsContent}
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        {documentsContent}
      </TabsContent>

      <TabsContent value="budget" className="mt-6">
        {budgetContent}
      </TabsContent>
    </Tabs>
  );
};
