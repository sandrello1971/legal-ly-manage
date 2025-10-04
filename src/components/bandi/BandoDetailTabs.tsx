import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, DollarSign, Banknote, BarChart3, FolderKanban, LayoutDashboard } from "lucide-react";
import { type Bando } from "@/hooks/useBandi";
import { Card, CardContent } from "@/components/ui/card";

interface BandoDetailTabsProps {
  bando: Bando;
  overviewContent: React.ReactNode;
  projectsContent: React.ReactNode;
}

export const BandoDetailTabs = ({ bando, overviewContent, projectsContent }: BandoDetailTabsProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-6">
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
        <TabsTrigger value="expenses" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Spese</span>
        </TabsTrigger>
        <TabsTrigger value="banking" className="flex items-center gap-2">
          <Banknote className="h-4 w-4" />
          <span className="hidden sm:inline">Banking</span>
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Reports</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {overviewContent}
      </TabsContent>

      <TabsContent value="projects" className="mt-6">
        {projectsContent}
      </TabsContent>

      <TabsContent value="documents" className="mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Documenti del Bando</h3>
              <p className="text-sm">Gestisci i documenti relativi a questo bando</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="expenses" className="mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Spese del Bando</h3>
              <p className="text-sm">Gestisci le spese relative a questo bando</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="banking" className="mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Banking del Bando</h3>
              <p className="text-sm">Gestisci le transazioni bancarie relative a questo bando</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports" className="mt-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Reports del Bando</h3>
              <p className="text-sm">Visualizza i report e le analisi di questo bando</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
