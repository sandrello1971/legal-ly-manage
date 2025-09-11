import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, DollarSign, TrendingUp, Users } from 'lucide-react';

const stats = [
  {
    title: 'Total Documents',
    value: '24',
    description: '+12% from last month',
    icon: FileText,
  },
  {
    title: 'Active Cases',
    value: '12',
    description: '+5% from last month',
    icon: Users,
  },
  {
    title: 'Monthly Expenses',
    value: '€8,542',
    description: '-3% from last month',
    icon: DollarSign,
  },
  {
    title: 'Revenue',
    value: '€24,830',
    description: '+18% from last month',
    icon: TrendingUp,
  },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your LegalTender Pro dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest documents and case updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Document uploaded: Contract_2024_001.pdf</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Case updated: Smith vs. Johnson</p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Expense approved: Court filing fee</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="font-medium">Upload Document</div>
              <div className="text-sm text-muted-foreground">Add new legal documents</div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="font-medium">Add Expense</div>
              <div className="text-sm text-muted-foreground">Record case expenses</div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="font-medium">Generate Report</div>
              <div className="text-sm text-muted-foreground">Create financial reports</div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}