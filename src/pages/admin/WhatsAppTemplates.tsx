import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Plus, Pencil, Trash2, MessageSquare, FolderOpen, Tag, TriangleAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import WhatsAppMessageEditor from '@/components/forms/WhatsAppMessageEditor';
import type { WhatsAppMessage } from '@/types';
import {
  getWhatsAppTemplatesEndpointUnavailableMessage,
  isWhatsAppTemplatesEndpointUnavailable,
  useWhatsAppTemplates,
  useWhatsAppTemplateCategories,
  useCreateWhatsAppTemplate,
  useUpdateWhatsAppTemplate,
  useDeleteWhatsAppTemplate,
} from '@/hooks/useWhatsAppTemplates';

const WhatsAppTemplates: React.FC = () => {
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [formMessage, setFormMessage] = useState<WhatsAppMessage>({ items: [], delay_seconds: 2 });

  const { data: templates = [], isLoading } = useWhatsAppTemplates(filterCategory || undefined);
  const { data: categories = [] } = useWhatsAppTemplateCategories();
  const createTemplate = useCreateWhatsAppTemplate();
  const updateTemplate = useUpdateWhatsAppTemplate();
  const deleteTemplate = useDeleteWhatsAppTemplate();
  const templatesEndpointUnavailable = isWhatsAppTemplatesEndpointUnavailable();
  const templatesEndpointMessage = getWhatsAppTemplatesEndpointUnavailableMessage();

  const openCreate = () => {
    if (isWhatsAppTemplatesEndpointUnavailable()) {
      toast({
        title: 'Backend sem suporte a mensagens salvas',
        description: templatesEndpointMessage,
        variant: 'destructive',
      });
      return;
    }

    setEditingId(null);
    setFormName('');
    setFormCategory('');
    setNewCategory('');
    setFormMessage({ items: [], delay_seconds: 2 });
    setDialogOpen(true);
  };

  const openEdit = (template: any) => {
    setEditingId(template.id);
    setFormName(template.name);
    setFormCategory(template.category || '');
    setNewCategory('');
    const msg = typeof template.message === 'string' ? JSON.parse(template.message) : template.message;
    setFormMessage(msg || { items: [], delay_seconds: 2 });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (isWhatsAppTemplatesEndpointUnavailable()) {
      toast({
        title: 'Backend sem suporte a mensagens salvas',
        description: templatesEndpointMessage,
        variant: 'destructive',
      });
      return;
    }

    if (!formName.trim()) {
      toast({ title: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }
    if (!formMessage.items || formMessage.items.length === 0) {
      toast({ title: 'Adicione pelo menos um item à mensagem', variant: 'destructive' });
      return;
    }

    const category = newCategory.trim() || formCategory || undefined;

    try {
      if (editingId) {
        await updateTemplate.mutateAsync({ id: editingId, name: formName.trim(), category, message: formMessage });
        toast({ title: 'Template atualizado!' });
      } else {
        await createTemplate.mutateAsync({ name: formName.trim(), category, message: formMessage });
        toast({ title: 'Template criado!' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate.mutateAsync(id);
      toast({ title: 'Template removido!' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  // Group templates by category
  const grouped = templates.reduce<Record<string, typeof templates>>((acc, t) => {
    const cat = t.category || 'Sem categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mensagens Salvas</h1>
            <p className="text-muted-foreground">
              Crie e gerencie templates de mensagens WhatsApp reutilizáveis
            </p>
          </div>
          <Button onClick={openCreate} disabled={templatesEndpointUnavailable}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Mensagem
          </Button>
        </div>

        {templatesEndpointUnavailable && (
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Rota de mensagens salvas indisponível</AlertTitle>
            <AlertDescription>
              {templatesEndpointMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterCategory && filterCategory !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilterCategory('')}>
                Limpar
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {templatesEndpointUnavailable ? 'Mensagens salvas indisponíveis neste backend' : 'Nenhuma mensagem salva'}
              </p>
              <Button variant="link" onClick={openCreate} disabled={templatesEndpointUnavailable}>
                Criar primeira mensagem
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  {category}
                </h3>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((template) => {
                  const msg = typeof template.message === 'string'
                    ? JSON.parse(template.message)
                    : template.message;
                  const itemCount = msg?.items?.length || 0;

                  return (
                    <Card key={template.id} className="group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {itemCount} item(s)
                              </Badge>
                              {msg?.delay_seconds && (
                                <span className="text-xs">
                                  {msg.delay_seconds}s delay
                                </span>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(template)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir template?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Formulários que usam este template
                                    não serão afetados (possuem cópia local).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(template.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="space-y-1">
                          {(msg?.items || []).slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium capitalize">{item.type}:</span>
                              <span className="truncate">
                                {item.type === 'text'
                                  ? (item.content || '').substring(0, 50) + ((item.content || '').length > 50 ? '...' : '')
                                  : item.filename || 'Arquivo'}
                              </span>
                            </div>
                          ))}
                          {itemCount > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{itemCount - 3} mais...
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Mensagem' : 'Nova Mensagem'}</DialogTitle>
            <DialogDescription>
              Crie uma mensagem reutilizável com texto, áudio, vídeo e documentos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Boas-vindas Lead"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formCategory} onValueChange={(v) => { setFormCategory(v); setNewCategory(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou crie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Nova categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formCategory === 'new' && (
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nome da nova categoria"
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            <WhatsAppMessageEditor
              value={formMessage}
              onChange={setFormMessage}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={templatesEndpointUnavailable || createTemplate.isPending || updateTemplate.isPending}
              >
                {createTemplate.isPending || updateTemplate.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default WhatsAppTemplates;
