import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useEvolutionInstances,
  useCreateEvolutionInstance,
  useUpdateEvolutionInstance,
  useDeleteEvolutionInstance,
  useTestEvolutionInstance,
} from '@/hooks/useEvolutionInstances';
import {
  Plus,
  Edit,
  Trash2,
  TestTube,
  MessageSquare,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { EvolutionInstance } from '@/types';
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

const EvolutionInstances: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<EvolutionInstance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    default_number: '',
    is_active: true,
  });

  const { data: instances, isLoading, error } = useEvolutionInstances();
  const createInstance = useCreateEvolutionInstance();
  const updateInstance = useUpdateEvolutionInstance();
  const deleteInstance = useDeleteEvolutionInstance();
  const testInstance = useTestEvolutionInstance();

  // Mock data for demo
  const mockInstances: EvolutionInstance[] = [
    {
      id: '1',
      name: 'Instância Principal',
      api_url: 'https://evolution.meusite.com',
      api_key: '••••••••',
      default_number: '5511999998888',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const displayInstances = error ? mockInstances : (instances ?? []);

  const handleOpenDialog = (instance?: EvolutionInstance) => {
    if (instance) {
      setEditingInstance(instance);
      setFormData({
        name: instance.name,
        api_url: instance.api_url,
        api_key: instance.api_key,
        default_number: instance.default_number || '',
        is_active: instance.is_active,
      });
    } else {
      setEditingInstance(null);
      setFormData({
        name: '',
        api_url: '',
        api_key: '',
        default_number: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingInstance) {
      await updateInstance.mutateAsync({
        id: editingInstance.id,
        data: formData,
      });
    } else {
      await createInstance.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteInstance.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleTest = (id: string) => {
    testInstance.mutate(id);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Evolution API</h1>
            <p className="text-muted-foreground">
              Configure instâncias da Evolution API para notificações WhatsApp
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Instância
          </Button>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">O que é a Evolution API?</p>
              <p className="text-sm text-muted-foreground">
                A Evolution API é uma solução para integração com WhatsApp. Você pode 
                configurar múltiplas instâncias para enviar notificações automáticas 
                quando novos leads são capturados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instances Table */}
        <Card>
          <CardHeader>
            <CardTitle>Instâncias Configuradas</CardTitle>
            <CardDescription>
              Gerencie suas instâncias da Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>URL da API</TableHead>
                    <TableHead>Número Padrão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayInstances.map((instance) => (
                    <TableRow key={instance.id}>
                      <TableCell className="font-medium">{instance.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {instance.api_url}
                      </TableCell>
                      <TableCell>{instance.default_number || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={instance.is_active ? 'default' : 'secondary'}>
                          {instance.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTest(instance.id)}
                            title="Testar conexão"
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(instance)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(instance.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {displayInstances.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <p className="text-muted-foreground">
                          Nenhuma instância configurada.
                        </p>
                        <Button variant="link" onClick={() => handleOpenDialog()}>
                          Adicionar primeira instância
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInstance ? 'Editar Instância' : 'Nova Instância'}
            </DialogTitle>
            <DialogDescription>
              Configure os dados de conexão com a Evolution API
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Instância</Label>
              <Input
                id="name"
                placeholder="Ex: Instância Principal"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_url">URL da API</Label>
              <Input
                id="api_url"
                placeholder="https://evolution.seusite.com"
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Sua chave de API"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_number">Número Padrão (opcional)</Label>
              <Input
                id="default_number"
                placeholder="5511999998888"
                value={formData.default_number}
                onChange={(e) => setFormData({ ...formData, default_number: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Número para enviar notificações (com código do país)
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Instância Ativa</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingInstance ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A instância será removida e não poderá mais ser usada para notificações.
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

export default EvolutionInstances;
