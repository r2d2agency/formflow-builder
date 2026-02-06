import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIntegrationLogs, IntegrationLog } from '@/hooks/useIntegrationLogs';
import { Activity, Search, Eye, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const IntegrationLogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<IntegrationLog | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading } = useIntegrationLogs(page, 20, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500 hover:bg-green-600">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getIntegrationIcon = (type: string) => {
    // Simple icon mapping based on type string
    return <Activity className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs de Integração</h1>
          <p className="text-muted-foreground">
            Monitore e diagnostique o envio de dados para integrações externas
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-[200px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Execuções</CardTitle>
            <CardDescription>
              Lista das últimas tentativas de integração realizadas pelo sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Formulário</TableHead>
                    <TableHead>Integração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagem de Erro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{formatDate(log.created_at)}</TableCell>
                      <TableCell>{log.form_name || 'Desconhecido'}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        {getIntegrationIcon(log.integration_type)}
                        {log.integration_type}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {log.error_message || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.logs || data.logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {/* Pagination controls could be added here */}
            <div className="flex justify-end gap-2 mt-4">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                >
                    Anterior
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={!data || data.logs.length < 20 || isLoading}
                >
                    Próxima
                </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Detalhes da Integração</DialogTitle>
              <DialogDescription>
                Informações completas sobre a execução
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-1">Status</h4>
                      {getStatusBadge(selectedLog.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Data</h4>
                      <p className="text-sm">{formatDate(selectedLog.created_at)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Tipo</h4>
                      <p className="text-sm">{selectedLog.integration_type}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Formulário</h4>
                      <p className="text-sm">{selectedLog.form_name}</p>
                    </div>
                  </div>

                  {selectedLog.error_message && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Erro
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-300 font-mono break-all">
                        {selectedLog.error_message}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Payload Enviado</h4>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(selectedLog.payload, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Resposta Recebida</h4>
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto">
                      <pre className="text-xs font-mono">
                        {JSON.stringify(selectedLog.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default IntegrationLogsPage;
