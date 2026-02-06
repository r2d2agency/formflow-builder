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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useForms, useDeleteForm, useImportForm, exportForm } from '@/hooks/useForms';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Eye,
  ExternalLink,
  Download,
  Upload,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import type { Form } from '@/types';
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

const formTypeLabels: Record<string, string> = {
  typeform: 'Typeform',
  chat: 'Chat',
  standard: 'Padrão',
};

const FormsList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page] = useState(1);
  
  const { data, isLoading, error } = useForms(page, 20);
  const deleteForm = useDeleteForm();
  const importForm = useImportForm();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        await importForm.mutateAsync(json);
      } catch (error) {
        toast({
          title: 'Erro ao ler arquivo',
          description: 'O arquivo selecionado não é um JSON válido ou ocorreu um erro na importação.',
          variant: 'destructive',
        });
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Mock data for demo
  const mockForms: Form[] = [
    {
      id: '1',
      name: 'Formulário de Contato',
      slug: 'contato',
      type: 'standard',
      fields: [],
      settings: { webhook_enabled: false, whatsapp_notification: false },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submissions_count: 45,
    },
    {
      id: '2',
      name: 'Quiz de Vendas',
      slug: 'quiz-vendas',
      type: 'typeform',
      fields: [],
      settings: { webhook_enabled: true, whatsapp_notification: true },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submissions_count: 128,
    },
    {
      id: '3',
      name: 'Atendimento Chat',
      slug: 'atendimento',
      type: 'chat',
      fields: [],
      settings: { webhook_enabled: false, whatsapp_notification: true },
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submissions_count: 32,
    },
  ];

  const forms = error ? mockForms : (data?.data ?? []);

  const filteredForms = forms.filter((form) =>
    form.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copiado!',
      description: 'O link do formulário foi copiado para a área de transferência.',
    });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteForm.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Formulários</h1>
            <p className="text-muted-foreground">
              Gerencie seus formulários de captura de leads
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={handleImportClick} disabled={importForm.isPending}>
              <Upload className="mr-2 h-4 w-4" />
              {importForm.isPending ? 'Importando...' : 'Importar JSON'}
            </Button>
            <Button onClick={() => navigate('/admin/forms/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Formulário
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar formulários..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Seus Formulários</CardTitle>
            <CardDescription>
              {filteredForms.length} formulário(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Notificações</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredForms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{form.name}</p>
                          <p className="text-sm text-muted-foreground">/{form.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formTypeLabels[form.type] || form.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={form.is_active ? 'default' : 'secondary'}>
                          {form.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{form.submissions_count ?? 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {form.settings.whatsapp_notification && (
                            <Badge variant="outline" className="text-xs">
                              WhatsApp
                            </Badge>
                          )}
                          {form.settings.webhook_enabled && (
                            <Badge variant="outline" className="text-xs">
                              Webhook
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/forms/${form.id}`)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`/f/${form.slug}`, '_blank')}>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyLink(form.slug)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar Link
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/admin/leads?form=${form.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Leads
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportForm(form.id, form.slug)}>
                              <Download className="mr-2 h-4 w-4" />
                              Exportar JSON
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(form.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredForms.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-muted-foreground">
                          Nenhum formulário encontrado.
                        </p>
                        <Button
                          variant="link"
                          onClick={() => navigate('/admin/forms/new')}
                        >
                          Criar primeiro formulário
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O formulário e todos os leads associados serão excluídos permanentemente.
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

export default FormsList;
