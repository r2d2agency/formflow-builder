import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLeads, useDeleteLead, useExportLeads } from '@/hooks/useLeads';
import {
  Search,
  Download,
  Trash2,
  Eye,
  Calendar,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Lead } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const LeadsList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page] = useState(1);
  
  const { data, isLoading, error } = useLeads(page, 50, formFilter === 'all' ? undefined : formFilter);
  const deleteLead = useDeleteLead();
  const exportLeads = useExportLeads();

  // Mock data for demo
  const mockLeads: Lead[] = [
    {
      id: '1',
      form_id: '1',
      form_name: 'Formulário de Contato',
      data: { name: 'João Silva', email: 'joao@email.com', phone: '11999998888', message: 'Gostaria de mais informações' },
      source: 'organic',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      form_id: '2',
      form_name: 'Quiz de Vendas',
      data: { name: 'Maria Santos', email: 'maria@email.com', whatsapp: '11987654321', interest: 'Produto Premium' },
      source: 'facebook',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '3',
      form_id: '1',
      form_name: 'Formulário de Contato',
      data: { name: 'Pedro Costa', email: 'pedro@email.com', phone: '21988887777' },
      source: 'google',
      created_at: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const leads = error ? mockLeads : (data?.data ?? []);

  const filteredLeads = leads.filter((lead) => {
    const searchLower = search.toLowerCase();
    const dataString = JSON.stringify(lead.data).toLowerCase();
    return dataString.includes(searchLower);
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteLead.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleExport = () => {
    exportLeads.mutate(formFilter === 'all' ? undefined : formFilter);
  };

  const getMainFields = (data: Record<string, any>) => {
    const name = data.name || data.nome || '-';
    const email = data.email || '-';
    const phone = data.phone || data.telefone || data.whatsapp || '-';
    return { name, email, phone };
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground">
              Visualize e gerencie os leads capturados
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por formulário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os formulários</SelectItem>
                  <SelectItem value="1">Formulário de Contato</SelectItem>
                  <SelectItem value="2">Quiz de Vendas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Leads Capturados</CardTitle>
            <CardDescription>
              {filteredLeads.length} lead(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Formulário</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const { name, email, phone } = getMainFields(lead.data);
                    return (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell>{email}</TableCell>
                        <TableCell>{phone}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.form_name || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedLead(lead)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(lead.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredLeads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">
                          Nenhum lead encontrado.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lead Details Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
            <DialogDescription>
              Capturado em {selectedLead && format(new Date(selectedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                {Object.entries(selectedLead.data).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="font-medium capitalize text-muted-foreground">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-right">{String(value)}</span>
                  </div>
                ))}
              </div>
              {selectedLead.source && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Origem:</span>
                  <Badge variant="outline">{selectedLead.source}</Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lead será excluído permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default LeadsList;
