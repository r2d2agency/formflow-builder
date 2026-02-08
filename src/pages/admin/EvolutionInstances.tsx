import React, { useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Activity,
  QrCode,
  Wifi,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import {
  useEvolutionInstances,
  useCreateEvolutionInstance,
  useUpdateEvolutionInstance,
  useDeleteEvolutionInstance,
  useTestEvolutionInstance,
  useConnectEvolutionInstance,
} from '@/hooks/useEvolutionInstances';
import type { EvolutionInstance } from '@/types';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  api_url: z.string().url('URL inválida').min(1, 'URL da API é obrigatória'),
  api_key: z.string().min(1, 'API Key é obrigatória'),
  default_number: z.string().optional(),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const EvolutionInstances: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<EvolutionInstance | null>(null);
  const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null);
  
  // QR Code State
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ base64?: string; pairingCode?: string } | null>(null);
  const [connectingInstance, setConnectingInstance] = useState<string | null>(null);

  const { data: instances, isLoading, error: loadErrorMessage } = useEvolutionInstances();
  const createInstance = useCreateEvolutionInstance();
  const updateInstance = useUpdateEvolutionInstance();
  const deleteInstance = useDeleteEvolutionInstance();
  const testInstance = useTestEvolutionInstance();
  const connectInstance = useConnectEvolutionInstance();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      api_url: '',
      api_key: '',
      default_number: '',
      is_active: true,
    },
  });

  const handleOpenDialog = (instance?: EvolutionInstance) => {
    if (instance) {
      setEditingInstance(instance);
      form.reset({
        name: instance.name,
        api_url: instance.api_url,
        api_key: instance.api_key,
        default_number: instance.default_number || '',
        is_active: instance.is_active,
      });
    } else {
      setEditingInstance(null);
      form.reset({
        name: '',
        api_url: '',
        api_key: '',
        default_number: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editingInstance) {
        await updateInstance.mutateAsync({
          id: editingInstance.id,
          data: values,
        });
      } else {
        await createInstance.mutateAsync(values);
      }
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (instanceToDelete) {
      await deleteInstance.mutateAsync(instanceToDelete);
      setIsDeleteDialogOpen(false);
      setInstanceToDelete(null);
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      await testInstance.mutateAsync(id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleConnect = async (instance: EvolutionInstance) => {
    setConnectingInstance(instance.name);
    try {
      const data = await connectInstance.mutateAsync(instance.id);
      
      // Check if we got a QR code or success message
      if (data.base64) {
        setQrCodeData(data);
        setIsQrDialogOpen(true);
      } else if (data.count) {
        toast({
            title: 'Conectado',
            description: `Instância já conectada (${data.count} sessões).`,
        });
      } else {
        // Fallback for other states
         toast({
            title: 'Status',
            description: JSON.stringify(data),
        });
      }
    } catch (error) {
      // Error handled by mutation
    } finally {
      setConnectingInstance(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Minhas Instâncias Evolution API</h1>
            <p className="text-muted-foreground">
              Configure suas instâncias da Evolution API para notificações WhatsApp
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
                quando novos leads são capturados. Cada usuário gerencia suas próprias instâncias.
              </p>
            </div>
          </CardContent>
        </Card>

        {loadErrorMessage && (
          <div className="rounded-md bg-destructive/15 p-4 text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">Erro ao carregar instâncias</p>
            </div>
            <p className="mt-1 text-sm opacity-90">{String(loadErrorMessage)}</p>
          </div>
        )}

        {/* Instances Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : instances?.length === 0 ? (
            <Card className="col-span-full border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">Nenhuma instância configurada</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Comece criando sua primeira instância da Evolution API.
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Instância
                </Button>
              </CardContent>
            </Card>
          ) : (
            instances?.map((instance) => (
              <Card key={instance.id} className="relative overflow-hidden">
                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTestConnection(instance.id)}>
                        <Activity className="mr-2 h-4 w-4" />
                        Testar Conexão
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleConnect(instance)}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Ler QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenDialog(instance)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setInstanceToDelete(instance.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{instance.name}</CardTitle>
                    {instance.is_active ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        Ativa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </div>
                  <CardDescription className="truncate font-mono text-xs">
                    {instance.api_url}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Número Padrão:</span>
                      <span className="font-medium">
                        {instance.default_number || '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                     <Button 
                       variant="outline" 
                       className="flex-1"
                       size="sm"
                       onClick={() => handleTestConnection(instance.id)}
                       disabled={testInstance.isPending}
                     >
                       <Wifi className="mr-2 h-3 w-3" />
                       Testar
                     </Button>
                     <Button 
                       variant="default" 
                       className="flex-1"
                       size="sm"
                       onClick={() => handleConnect(instance)}
                       disabled={connectInstance.isPending && connectingInstance === instance.name}
                     >
                       <QrCode className="mr-2 h-3 w-3" />
                       QR Code
                     </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingInstance ? 'Editar Instância' : 'Nova Instância'}
              </DialogTitle>
              <DialogDescription>
                Configure os dados de conexão da Evolution API.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Instância</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="api_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da API</FormLabel>
                      <FormControl>
                        <Input placeholder="https://api.evolution.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        URL base onde a Evolution API está hospedada.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key (Global)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Sua API Key Global" {...field} />
                      </FormControl>
                      <FormDescription>
                        Chave de autenticação global da Evolution API.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número Padrão (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="5511999999999" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número para envio de notificações administrativas.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativa</FormLabel>
                        <FormDescription>
                          Habilitar ou desabilitar esta instância.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createInstance.isPending || updateInstance.isPending}>
                    {editingInstance ? 'Salvar Alterações' : 'Criar Instância'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Instância?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente a instância
                do banco de dados do FormBuilder (não afeta o servidor Evolution).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* QR Code Dialog */}
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Escanear QR Code</DialogTitle>
              <DialogDescription>
                Abra o WhatsApp no seu celular, vá em Aparelhos Conectados {'>'} Conectar Aparelho e escaneie o código abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center p-6">
                {qrCodeData?.base64 ? (
                    <img src={qrCodeData.base64} alt="QR Code WhatsApp" className="h-64 w-64 object-contain" />
                ) : (
                    <div className="flex h-64 w-64 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        Sem QR Code disponível
                    </div>
                )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsQrDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default EvolutionInstances;