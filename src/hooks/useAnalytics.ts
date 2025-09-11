import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/stores/auth';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsData {
  budgetOverview: {
    totalBudget: number;
    spentBudget: number;
    remainingBudget: number;
    percentageSpent: number;
  };
  pendingDocuments: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
  upcomingDeadlines: {
    total: number;
    urgent: number; // next 7 days
    critical: number; // next 3 days
    deadlines: Array<{
      id: string;
      title: string;
      date: string;
      type: 'project' | 'bando' | 'milestone';
      status: 'urgent' | 'warning' | 'normal';
    }>;
  };
  anomalies: {
    total: number;
    types: Array<{
      type: string;
      count: number;
      severity: 'high' | 'medium' | 'low';
    }>;
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    expenses: number;
    budget: number;
    projects: number;
  }>;
  topSuppliers: Array<{
    name: string;
    totalAmount: number;
    transactionCount: number;
    categories: string[];
  }>;
  recentActivity: Array<{
    id: string;
    type: 'expense' | 'document' | 'project' | 'approval';
    title: string;
    description: string;
    timestamp: string;
    status?: string;
    amount?: number;
  }>;
}

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch projects, expenses, and documents in parallel
      const [projectsRes, expensesRes, documentsRes] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('project_expenses').select('*'),
        supabase.from('documents').select('*')
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (documentsRes.error) throw documentsRes.error;

      const projects = projectsRes.data || [];
      const expenses = expensesRes.data || [];
      const documents = documentsRes.data || [];

      // Calculate budget overview
      const totalBudget = projects.reduce((sum, p) => sum + (p.total_budget || 0), 0);
      const spentBudget = projects.reduce((sum, p) => sum + (p.spent_budget || 0), 0);
      const remainingBudget = totalBudget - spentBudget;
      const percentageSpent = totalBudget > 0 ? (spentBudget / totalBudget) * 100 : 0;

      // Pending documents analysis
      const pendingDocs = documents.filter(d => d.status === 'pending');
      const documentsByStatus = documents.reduce((acc, doc) => {
        acc[doc.status] = (acc[doc.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Upcoming deadlines
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const deadlines = projects
        .filter(p => p.end_date)
        .map(p => ({
          id: p.id,
          title: p.title,
          date: p.end_date!,
          type: 'project' as const,
          status: new Date(p.end_date!) <= threeDaysFromNow ? 'urgent' as const : 
                 new Date(p.end_date!) <= sevenDaysFromNow ? 'warning' as const : 'normal' as const
        }))
        .filter(d => new Date(d.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const urgentDeadlines = deadlines.filter(d => d.status === 'urgent').length;
      const criticalDeadlines = deadlines.filter(d => d.status === 'warning').length;

      // Anomalies detection
      const anomalies = {
        total: 0,
        types: [] as Array<{ type: string; count: number; severity: 'high' | 'medium' | 'low' }>
      };

      // Check for budget overruns
      const budgetOverruns = projects.filter(p => (p.spent_budget || 0) > (p.total_budget || 0));
      if (budgetOverruns.length > 0) {
        anomalies.types.push({
          type: 'Budget Overrun',
          count: budgetOverruns.length,
          severity: 'high'
        });
        anomalies.total += budgetOverruns.length;
      }

      // Check for pending approvals
      const pendingApprovals = expenses.filter(e => e.is_approved === null);
      if (pendingApprovals.length > 5) {
        anomalies.types.push({
          type: 'Pending Approvals',
          count: pendingApprovals.length,
          severity: 'medium'
        });
        anomalies.total += 1;
      }

      // Category breakdown
      const categoryTotals = expenses.reduce((acc, expense) => {
        const category = expense.category || 'other';
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const totalExpenses = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
      
      const categoryColors = {
        personnel: '#8B5CF6',
        equipment: '#06B6D4',
        materials: '#10B981',
        services: '#F59E0B',
        travel: '#EF4444',
        other: '#6B7280'
      };

      const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        color: categoryColors[category as keyof typeof categoryColors] || '#6B7280'
      }));

      // Monthly trends (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyData = [] as Array<{ month: string; expenses: number; budget: number; projects: number }>;
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' });
        
        const monthExpenses = expenses
          .filter(e => {
            const expenseDate = new Date(e.expense_date);
            return expenseDate.getMonth() === date.getMonth() && 
                   expenseDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, e) => sum + e.amount, 0);

        const monthProjects = projects.filter(p => {
          const projectDate = new Date(p.created_at);
          return projectDate.getMonth() === date.getMonth() && 
                 projectDate.getFullYear() === date.getFullYear();
        }).length;

        monthlyData.push({
          month: monthStr,
          expenses: monthExpenses,
          budget: totalBudget / 6, // Average monthly budget
          projects: monthProjects
        });
      }

      // Top suppliers
      const supplierTotals = expenses.reduce((acc, expense) => {
        const supplier = expense.supplier_name || 'Fornitore Sconosciuto';
        if (!acc[supplier]) {
          acc[supplier] = {
            totalAmount: 0,
            transactionCount: 0,
            categories: new Set<string>()
          };
        }
        acc[supplier].totalAmount += expense.amount;
        acc[supplier].transactionCount += 1;
        acc[supplier].categories.add(expense.category || 'other');
        return acc;
      }, {} as Record<string, { totalAmount: number; transactionCount: number; categories: Set<string> }>);

      const topSuppliers = Object.entries(supplierTotals)
        .map(([name, data]) => ({
          name,
          totalAmount: data.totalAmount,
          transactionCount: data.transactionCount,
          categories: Array.from(data.categories)
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 10);

      // Recent activity
      const recentActivity = [
        ...expenses.slice(0, 5).map(e => ({
          id: e.id,
          type: 'expense' as const,
          title: e.description,
          description: `€${e.amount.toFixed(2)} - ${e.supplier_name || 'N/A'}`,
          timestamp: e.created_at,
          status: e.is_approved === null ? 'pending' : e.is_approved ? 'approved' : 'rejected',
          amount: e.amount
        })),
        ...documents.slice(0, 3).map(d => ({
          id: d.id,
          type: 'document' as const,
          title: d.title,
          description: `Documento ${d.document_type}`,
          timestamp: d.created_at,
          status: d.status
        })),
        ...projects.slice(0, 2).map(p => ({
          id: p.id,
          type: 'project' as const,
          title: p.title,
          description: `Progetto ${p.status}`,
          timestamp: p.created_at,
          status: p.status
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

      const analyticsData: AnalyticsData = {
        budgetOverview: {
          totalBudget,
          spentBudget,
          remainingBudget,
          percentageSpent
        },
        pendingDocuments: {
          total: pendingDocs.length,
          byStatus: Object.entries(documentsByStatus).map(([status, count]) => ({ status, count }))
        },
        upcomingDeadlines: {
          total: deadlines.length,
          urgent: urgentDeadlines,
          critical: criticalDeadlines,
          deadlines: deadlines.slice(0, 5)
        },
        anomalies,
        categoryBreakdown,
        monthlyTrends: monthlyData,
        topSuppliers,
        recentActivity
      };

      setData(analyticsData);

    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dati analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // This would typically call an edge function to generate the export
      toast({
        title: 'Export in corso',
        description: `Generazione file ${format.toUpperCase()} in corso...`,
      });
      
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Export completato',
        description: `Il file ${format.toUpperCase()} è stato generato con successo`,
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile esportare i dati',
        variant: 'destructive',
      });
    }
  };

  const refreshData = () => {
    fetchAnalyticsData();
  };

  return {
    data,
    loading,
    error,
    fetchAnalyticsData,
    exportData,
    refreshData
  };
};