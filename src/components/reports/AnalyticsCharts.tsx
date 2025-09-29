import React from 'react';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/config/expenseCategories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent, 
  ChartLegend, 
  ChartLegendContent 
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { AnalyticsData } from '@/hooks/useAnalytics';

interface AnalyticsChartsProps {
  data: AnalyticsData;
}

export function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category;
  };

  // Chart configurations
  const donutConfig = {
    expenses: {
      label: "Spese per Categoria",
    },
  };

  const lineConfig = {
    expenses: {
      label: "Spese",
      color: "hsl(var(--primary))",
    },
    budget: {
      label: "Budget",
      color: "hsl(var(--muted-foreground))",
    },
  };

  const barConfig = {
    amount: {
      label: "Importo",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Donut Chart - Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione per Categoria</CardTitle>
          <CardDescription>
            Breakdown delle spese per categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={donutConfig} className="h-[300px]">
            <PieChart>
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value: number) => [formatCurrency(value), "Importo"]}
                  />
                } 
              />
              <Pie
                data={data.categoryBreakdown}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
              >
                {data.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartLegend 
                content={
                  <ChartLegendContent 
                    nameKey="category"
                  />
                }
              />
            </PieChart>
          </ChartContainer>
          
          <div className="mt-4 space-y-2">
            {data.categoryBreakdown.map((category, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{getCategoryLabel(category.category)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(category.amount)}</span>
                  <Badge variant="outline" className="text-xs">
                    {category.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Line Chart - Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Trend Mensili</CardTitle>
          <CardDescription>
            Andamento spese vs budget negli ultimi 6 mesi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={lineConfig} className="h-[300px]">
            <LineChart data={data.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === 'expenses' ? 'Spese' : 'Budget'
                    ]}
                  />
                } 
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke="var(--color-expenses)" 
                strokeWidth={2}
                dot={{ fill: "var(--color-expenses)" }}
              />
              <Line 
                type="monotone" 
                dataKey="budget" 
                stroke="var(--color-budget)" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "var(--color-budget)" }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Bar Chart - Top Suppliers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Fornitori</CardTitle>
          <CardDescription>
            I 10 fornitori con maggiori importi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={barConfig} className="h-[300px]">
            <BarChart data={data.topSuppliers.slice(0, 8)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={formatCurrency} />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value: number) => [formatCurrency(value), "Importo Totale"]}
                  />
                } 
              />
              <Bar 
                dataKey="totalAmount" 
                fill="var(--color-amount)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
          
          <div className="mt-4 space-y-2">
            {data.topSuppliers.slice(0, 5).map((supplier, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{supplier.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {supplier.transactionCount} transazioni
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(supplier.totalAmount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {supplier.categories.slice(0, 2).join(', ')}
                    {supplier.categories.length > 2 && ` +${supplier.categories.length - 2}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Budget Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Budget per Progetto</CardTitle>
          <CardDescription>
            Utilizzo del budget per i progetti principali
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center py-8">
              I dati dei progetti verranno visualizzati qui una volta creati.
              <br />
              Crea il tuo primo progetto per vedere l'analisi del budget.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}