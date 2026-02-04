import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLink } from '@/hooks/useLinks';
import { API_CONFIG } from '@/config/api';
import {
  ArrowLeft,
  Link2,
  Copy,
  ExternalLink,
  MousePointerClick,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Check,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#22c55e', '#f59e0b'];

const chartConfig = {
  clicks: {
    label: 'Cliques',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const LinkStats: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: link, isLoading } = useLink(id || '');
  const [copied, setCopied] = React.useState(false);

  const getShortLinkUrl = (code: string) => {
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    return `${baseUrl}/l/${code}`;
  };

  const handleCopy = async () => {
    if (!link) return;
    const url = getShortLinkUrl(link.code);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: 'Link copiado!',
      description: url,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!link) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Link não encontrado.</p>
          <Button variant="link" onClick={() => navigate('/admin/links')}>
            Voltar para lista
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const dailyChartData = (link.daily_stats || []).map(stat => ({
    date: format(new Date(stat.date), 'dd/MM', { locale: ptBR }),
    clicks: Number(stat.count),
  })).reverse();

  const deviceChartData = (link.device_stats || []).map(stat => ({
    name: stat.device_type === 'mobile' ? 'Mobile' : stat.device_type === 'tablet' ? 'Tablet' : 'Desktop',
    value: Number(stat.count),
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/links')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {link.title || link.code}
                </h1>
                <Badge variant={link.is_active ? 'default' : 'secondary'}>
                  {link.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <code className="text-sm">/l/{link.code}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href={link.original_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir destino
            </a>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{link.click_count || 0}</div>
            </CardContent>
          </Card>
          
          {deviceChartData.map((device, index) => (
            <Card key={device.name}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{device.name}</CardTitle>
                {getDeviceIcon(device.name.toLowerCase())}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{device.value}</div>
                <p className="text-xs text-muted-foreground">
                  {link.click_count ? Math.round((device.value / Number(link.click_count)) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Daily Clicks Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cliques por Dia</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <BarChart data={dailyChartData}>
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  Nenhum clique registrado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Browser Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Navegadores</CardTitle>
              <CardDescription>Top 5 navegadores</CardDescription>
            </CardHeader>
            <CardContent>
              {(link.browser_stats || []).length > 0 ? (
                <div className="space-y-4">
                  {link.browser_stats?.slice(0, 5).map((browser, index) => (
                    <div key={browser.browser} className="flex items-center gap-4">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{browser.browser}</span>
                          <span className="text-sm text-muted-foreground">{browser.count}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{
                              width: `${link.click_count ? (Number(browser.count) / Number(link.click_count)) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Clicks */}
        <Card>
          <CardHeader>
            <CardTitle>Cliques Recentes</CardTitle>
            <CardDescription>Últimos 100 acessos</CardDescription>
          </CardHeader>
          <CardContent>
            {(link.clicks || []).length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Dispositivo</TableHead>
                    <TableHead>Navegador</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {link.clicks?.slice(0, 20).map((click) => (
                    <TableRow key={click.id}>
                      <TableCell className="text-sm">
                        {format(new Date(click.clicked_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(click.device_type || 'desktop')}
                          <span className="capitalize">{click.device_type || 'Desktop'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{click.browser || '-'}</TableCell>
                      <TableCell>{click.os || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {click.referer || 'Direto'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum clique registrado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default LinkStats;
