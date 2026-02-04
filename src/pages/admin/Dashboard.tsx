import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard: React.FC<{
  title: string;
  value: number | undefined;
  description: string;
  icon: React.ElementType;
  loading?: boolean;
}> = ({ title, value, description, icon: Icon, loading }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="text-2xl font-bold">{value ?? 0}</div>
      )}
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useDashboardStats();
  const navigate = useNavigate();

  // For development/demo purposes, show mock data if API is not connected
  const mockStats = {
    total_forms: 5,
    active_forms: 3,
    total_leads: 127,
    leads_today: 12,
    leads_this_week: 48,
    leads_this_month: 127,
  };

  const displayStats = error ? mockStats : stats;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do seu sistema de formulários
            </p>
          </div>
          <Button onClick={() => navigate('/admin/forms/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Formulário
          </Button>
        </div>

        {/* API Connection Warning */}
        {error && (
          <Card className="border-amber-500/50 bg-amber-500/10">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-600">API não conectada</p>
                <p className="text-sm text-muted-foreground">
                  Configure a URL da API nas configurações para ver dados reais.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')}>
                Configurar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Formulários"
            value={displayStats?.total_forms}
            description="Formulários criados"
            icon={FileText}
            loading={isLoading}
          />
          <StatCard
            title="Formulários Ativos"
            value={displayStats?.active_forms}
            description="Recebendo leads"
            icon={FileText}
            loading={isLoading}
          />
          <StatCard
            title="Leads Hoje"
            value={displayStats?.leads_today}
            description="Novos cadastros"
            icon={Users}
            loading={isLoading}
          />
          <StatCard
            title="Leads Este Mês"
            value={displayStats?.leads_this_month}
            description="Total do período"
            icon={TrendingUp}
            loading={isLoading}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate('/admin/forms/new')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Criar Formulário
              </CardTitle>
              <CardDescription>
                Crie um novo formulário Typeform, Chat ou Padrão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="gap-2 px-0 group-hover:text-primary">
                Começar <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate('/admin/leads')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Ver Leads
              </CardTitle>
              <CardDescription>
                Visualize e gerencie todos os leads capturados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="gap-2 px-0 group-hover:text-primary">
                Acessar <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate('/admin/evolution')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Configurar WhatsApp
              </CardTitle>
              <CardDescription>
                Configure instâncias Evolution para notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" className="gap-2 px-0 group-hover:text-primary">
                Configurar <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
