import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useLinks, useCreateLink, useUpdateLink, useDeleteLink } from '@/hooks/useLinks';
import { API_CONFIG } from '@/config/api';
import {
  Plus,
  Link2,
  Copy,
  ExternalLink,
  Trash2,
  BarChart3,
  MousePointerClick,
  Edit,
  Check,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import type { ShortLink } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LinksList: React.FC = () => {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ShortLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Form state
  const [originalUrl, setOriginalUrl] = useState('');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  
  const { data, isLoading, error } = useLinks(page);
  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const navigate = useNavigate();

  // Get base URL for short links
  const getShortLinkUrl = (linkCode: string) => {
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    return `${baseUrl}/l/${linkCode}`;
  };

  const handleCopy = async (link: ShortLink) => {
    const url = getShortLinkUrl(link.code);
    await navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    toast({
      title: 'Link copiado!',
      description: url,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setOriginalUrl('');
    setTitle('');
    setCode('');
    setExpiresAt('');
    setEditingLink(null);
  };

  const handleCreate = async () => {
    if (!originalUrl) {
      toast({
        title: 'Erro',
        description: 'URL é obrigatória',
        variant: 'destructive',
      });
      return;
    }

    await createLink.mutateAsync({
      original_url: originalUrl,
      title: title || undefined,
      code: code || undefined,
      expires_at: expiresAt || undefined,
    });
    
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingLink || !originalUrl) return;

    await updateLink.mutateAsync({
      id: editingLink.id,
      data: {
        original_url: originalUrl,
        title: title || undefined,
        code,
        is_active: editingLink.is_active,
        expires_at: expiresAt || undefined,
      },
    });
    
    resetForm();
  };

  const handleToggleActive = async (link: ShortLink) => {
    await updateLink.mutateAsync({
      id: link.id,
      data: {
        ...link,
        is_active: !link.is_active,
      },
    });
  };

  const openEdit = (link: ShortLink) => {
    setEditingLink(link);
    setOriginalUrl(link.original_url);
    setTitle(link.title || '');
    setCode(link.code);
    setExpiresAt(link.expires_at ? link.expires_at.split('T')[0] : '');
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  const links = data?.data || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Encurtador de Links</h1>
            <p className="text-muted-foreground">
              Crie e gerencie links curtos com estatísticas detalhadas
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Link Curto</DialogTitle>
                <DialogDescription>
                  Insira a URL que deseja encurtar
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="original_url">URL Original *</Label>
                  <Input
                    id="original_url"
                    placeholder="https://exemplo.com/pagina-longa"
                    value={originalUrl}
                    onChange={(e) => setOriginalUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título (opcional)</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Campanha Black Friday"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código Personalizado (opcional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/l/</span>
                    <Input
                      id="code"
                      placeholder="meu-link"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para gerar automaticamente
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Data de Expiração (opcional)</Label>
                  <Input
                    id="expires_at"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createLink.isPending}>
                  {createLink.isPending ? 'Criando...' : 'Criar Link'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingLink} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Link</DialogTitle>
              <DialogDescription>
                Atualize as informações do link
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_original_url">URL Original *</Label>
                <Input
                  id="edit_original_url"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_title">Título</Label>
                <Input
                  id="edit_title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_code">Código</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/l/</span>
                  <Input
                    id="edit_code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_expires_at">Data de Expiração</Label>
                <Input
                  id="edit_expires_at"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={updateLink.isPending}>
                {updateLink.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Links Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Links ({data?.total || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <div className="text-center py-12">
                <Link2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Nenhum link criado ainda.
                </p>
                <Button variant="link" onClick={() => setIsCreateOpen(true)}>
                  Criar primeiro link
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-center">Cliques</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-medium text-primary">
                              /l/{link.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopy(link)}
                            >
                              {copiedId === link.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {link.title && (
                            <p className="text-xs text-muted-foreground">{link.title}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a
                          href={link.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground truncate max-w-[200px]"
                        >
                          {link.original_url}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{link.click_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={link.is_active}
                            onCheckedChange={() => handleToggleActive(link)}
                          />
                          <Badge variant={link.is_active ? 'default' : 'secondary'}>
                            {link.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(link.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/links/${link.id}`)}
                            title="Ver estatísticas"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(link)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Excluir">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir link?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O link e todas as estatísticas serão removidos.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteLink.mutate(link.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              Página {page} de {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.total_pages}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LinksList;
