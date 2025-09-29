import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Target, 
  FileText, 
  Receipt, 
  Clock, 
  CheckSquare, 
  BarChart3,
  ArrowRight,
  Bot,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBandi } from '@/hooks/useBandi';
import { useProjects } from '@/hooks/useProjects';
import { useExpenses } from '@/hooks/useExpenses';
import { LEGACY_CATEGORY_MAPPING } from '@/config/expenseCategories';

interface Phase {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  icon: React.ElementType;
  route?: string;
  hasAI?: boolean;
  hasManual?: boolean;
}

export default function PoC() {
  const navigate = useNavigate();
  const { bandi } = useBandi();
  const { projects } = useProjects();
  const { expenses } = useExpenses();

  // Calculate completion status based on actual data
  const calculatePhaseStatus = (phaseId: string): 'pending' | 'in-progress' | 'completed' => {
    // Pre-calculate filtered arrays to avoid scope issues
    // Spese documento (categorie che richiedono documentazione - usando categorie esistenti per ora)
    const documentExpenses = expenses.filter(e => 
      e.category === 'services' || 
      e.category === 'materials' || 
      e.category === 'equipment'
    );
    const personnelExpenses = expenses.filter(e => e.category === 'personnel');
    const approvedExpenses = expenses.filter(e => e.is_approved === true);
    
    switch (phaseId) {
      case '1b':
        return bandi.length > 0 ? 'completed' : 'pending';
      case '2b':
        return projects.length > 0 ? 'completed' : bandi.length > 0 ? 'in-progress' : 'pending';
      case '3':
        return documentExpenses.length > 0 ? 'completed' : projects.length > 0 ? 'in-progress' : 'pending';
      case '5':
        return personnelExpenses.length > 0 ? 'completed' : projects.length > 0 ? 'in-progress' : 'pending';
      case '6':
        return approvedExpenses.length > 0 ? 'completed' : expenses.length > 0 ? 'in-progress' : 'pending';
      case '7':
        return approvedExpenses.length > 0 ? 'in-progress' : 'pending';
      default:
        return 'pending';
    }
  };

  const phases: Phase[] = [
    {
      id: '1b',
      title: 'Bando Requirements',
      description: 'Inserimento e analisi dei requisiti del bando di finanziamento',
      status: calculatePhaseStatus('1b'),
      icon: Target,
      route: '/bandi',
      hasAI: true,
      hasManual: true
    },
    {
      id: '2b',
      title: 'Project Details',
      description: 'Definizione dettagli del progetto approvato',
      status: calculatePhaseStatus('2b'),
      icon: FileText,
      route: '/bandi', // Projects are managed within Bandi page
      hasAI: true,
      hasManual: true
    },
    {
      id: '3',
      title: 'Expense Documents',
      description: 'Caricamento documenti di spesa (fatture)',
      status: calculatePhaseStatus('3'),
      icon: Receipt,
      route: '/expenses'
    },
    {
      id: '5',
      title: 'Personnel Expenses',
      description: 'Caricamento spese del personale (timesheet)',
      status: calculatePhaseStatus('5'),
      icon: Clock,
      route: '/expenses'
    },
    {
      id: '6',
      title: 'Documentation Verification',
      description: 'Verifica e approvazione della documentazione',
      status: calculatePhaseStatus('6'),
      icon: CheckSquare,
      route: '/expenses'
    },
    {
      id: '7',
      title: 'Reporting Outcome',
      description: 'Generazione report e risultati finali',
      status: calculatePhaseStatus('7'),
      icon: BarChart3,
      route: '/reports'
    }
  ];

  const completedPhases = phases.filter(phase => phase.status === 'completed').length;
  const totalPhases = phases.length;
  const overallProgress = (completedPhases / totalPhases) * 100;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in-progress':
        return <Circle className="w-5 h-5 text-yellow-600 animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Completata</Badge>;
      case 'in-progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">In Corso</Badge>;
      default:
        return <Badge variant="secondary">In Attesa</Badge>;
    }
  };

  const canAccessPhase = (phaseIndex: number) => {
    // First phase is always accessible
    if (phaseIndex === 0) return true;
    
    // Each phase is accessible if the previous one is completed
    const previousPhase = phases[phaseIndex - 1];
    return previousPhase.status === 'completed';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Proof of Concept Workflow</h1>
            <p className="text-muted-foreground">
              Segui il flusso sequenziale per completare il processo di gestione del progetto
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{completedPhases}/{totalPhases}</div>
            <p className="text-sm text-muted-foreground">Fasi Completate</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progresso Complessivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={overallProgress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Iniziato</span>
                <span>{Math.round(overallProgress)}% Completato</span>
                <span>Terminato</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phases Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {phases.map((phase, index) => {
          const Icon = phase.icon;
          const isAccessible = canAccessPhase(index);
          
          return (
            <Card 
              key={phase.id} 
              className={`transition-all duration-200 hover:shadow-lg ${
                !isAccessible ? 'opacity-50' : ''
              } ${
                phase.status === 'completed' ? 'border-green-200 bg-green-50' :
                phase.status === 'in-progress' ? 'border-yellow-200 bg-yellow-50' :
                'border-border'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-6 h-6" />
                    <div>
                      <CardTitle className="text-base">Fase {phase.id}</CardTitle>
                      <CardDescription className="text-sm font-medium">
                        {phase.title}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusIcon(phase.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {phase.description}
                </p>
                
                {/* AI/Manual badges */}
                {(phase.hasAI || phase.hasManual) && (
                  <div className="flex gap-2">
                    {phase.hasManual && (
                      <Badge variant="outline" className="text-xs">
                        <User className="w-3 h-3 mr-1" />
                        Manuale
                      </Badge>
                    )}
                    {phase.hasAI && (
                      <Badge variant="outline" className="text-xs">
                        <Bot className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  {getStatusBadge(phase.status)}
                  
                  {phase.route && isAccessible && (
                    <Button
                      variant={phase.status === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => navigate(phase.route!)}
                      className="ml-2"
                    >
                      {phase.status === 'pending' ? 'Inizia' : 
                       phase.status === 'in-progress' ? 'Continua' : 'Visualizza'}
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bandi Attivi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bandi.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progetti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spese Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Spese Approvate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expenses.filter(e => e.is_approved === true).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}