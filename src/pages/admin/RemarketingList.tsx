import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useForms } from '@/hooks/useForms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, Timer, Send, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RemarketingStep {
  id: string;
  campaign_id: string;
  step_order: number;
  delay_value: number;
  delay_unit: 'minutes' | 'hours' | 'days';
  message_type: 'text' | 'audio' | 'video' | 'document' | 'image';
  message_content: string;
}

interface RemarketingCampaign {
  id: string;
  form_id: string;
  name: string;
  type: 'recovery' | 'drip';
  is_active: boolean;
  steps: RemarketingStep[];
}

const RemarketingList: React.FC = () => {
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const { data: formsData } = useForms(1, 100);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['remarketing-campaigns', selectedFormId],
    queryFn: async () => {
      if (!selectedFormId) return [];
      const res = await apiService.get<RemarketingCampaign[]>(`/remarketing/campaigns/${selectedFormId}`);
      return res.data || [];
    },
    enabled: !!selectedFormId,
  });

  // --- Mutations ---
  const createCampaign = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiService.post('/remarketing/campaigns', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-campaigns'] });
      toast({ title: 'Campanha criada com sucesso' });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await apiService.delete(`/remarketing/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-campaigns'] });
      toast({ title: 'Campanha excluída' });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiService.put(`/remarketing/campaigns/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-campaigns'] });
      toast({ title: 'Campanha atualizada' });
    },
  });

  const createStep = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiService.post('/api/remarketing/steps', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-campaigns'] });
      toast({ title: 'Passo adicionado' });
    },
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      await apiService.delete(`/remarketing/steps/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarketing-campaigns'] });
      toast({ title: 'Passo excluído' });
    },
  });

  // --- Dialog States ---
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<RemarketingCampaign | null>(null);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      form_id: selectedFormId,
      name: formData.get('name'),
      type: formData.get('type'),
      is_active: formData.get('is_active') === 'on',
    };

    if (editingCampaign) {
      updateCampaign.mutate({ id: editingCampaign.id, data });
    } else {
      createCampaign.mutate(data);
    }
    setIsCampaignDialogOpen(false);
    setEditingCampaign(null);
  };

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      campaign_id: activeCampaignId,
      step_order: parseInt(formData.get('step_order') as string),
      delay_value: parseInt(formData.get('delay_value') as string),
      delay_unit: formData.get('delay_unit'),
      message_type: formData.get('message_type'),
      message_content: formData.get('message_content'),
    };
    createStep.mutate(data);
    setIsStepDialogOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Remarketing</h1>
            <p className="text-muted-foreground">
              Configure mensagens automáticas de recuperação e engajamento.
            </p>
          </div>
          <div className="w-[300px]">
             <Select onValueChange={setSelectedFormId} value={selectedFormId || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um formulário" />
              </SelectTrigger>
              <SelectContent>
                {formsData?.data.map((form) => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedFormId ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Timer className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Nenhum formulário selecionado</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Selecione um formulário acima para gerenciar suas campanhas de remarketing.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => { setEditingCampaign(null); setIsCampaignDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Campanha
              </Button>
            </div>

            {isLoading ? (
               <div className="flex justify-center p-8">Carregando...</div>
            ) : campaigns?.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">Nenhuma campanha encontrada.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {campaigns?.map((campaign) => (
                  <Card key={campaign.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-xl">{campaign.name}</CardTitle>
                          <CardDescription>
                            {campaign.type === 'recovery' ? 'Recuperação de Abandono' : 'Campanha Drip (Pós-envio)'}
                          </CardDescription>
                        </div>
                        <Badge variant={campaign.is_active ? 'default' : 'secondary'}>
                          {campaign.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Passos ({campaign.steps?.length || 0})</h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                          {campaign.steps?.map((step) => (
                            <div key={step.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                                  {step.step_order}
                                </Badge>
                                <span>
                                  {step.delay_value} {step.delay_unit === 'minutes' ? 'min' : step.delay_unit === 'hours' ? 'horas' : 'dias'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {step.message_type}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => deleteStep.mutate(step.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => { setActiveCampaignId(campaign.id); setIsStepDialogOpen(true); }}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Adicionar Passo
                        </Button>
                      </div>
                    </CardContent>
                    <div className="border-t p-4 flex justify-between bg-muted/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCampaign.mutate(campaign.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingCampaign(campaign); setIsCampaignDialogOpen(true); }}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Campaign Dialog */}
        <Dialog open={isCampaignDialogOpen} onOpenChange={setIsCampaignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
              <DialogDescription>
                Configure os detalhes da sua campanha de remarketing.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input id="name" name="name" defaultValue={editingCampaign?.name} required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" defaultValue={editingCampaign?.type || 'recovery'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recovery">Recuperação (Abandono)</SelectItem>
                    <SelectItem value="drip">Drip (Pós-envio)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="is_active" name="is_active" defaultChecked={editingCampaign ? editingCampaign.is_active : true} />
                <Label htmlFor="is_active">Ativar Campanha</Label>
              </div>

              <DialogFooter>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Step Dialog */}
        <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Passo</DialogTitle>
              <DialogDescription>
                Configure a mensagem e o tempo de envio para este passo da campanha.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateStep} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="step_order">Ordem</Label>
                  <Input id="step_order" name="step_order" type="number" defaultValue="1" required min="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delay_value">Atraso</Label>
                  <Input id="delay_value" name="delay_value" type="number" defaultValue="5" required min="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delay_unit">Unidade</Label>
                  <Select name="delay_unit" defaultValue="minutes">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message_type">Tipo de Mensagem</Label>
                <Select name="message_type" defaultValue="text">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="image">Imagem (URL)</SelectItem>
                    <SelectItem value="video">Vídeo (URL)</SelectItem>
                    <SelectItem value="audio">Áudio (URL)</SelectItem>
                    <SelectItem value="document">Documento (URL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message_content">Conteúdo</Label>
                <Textarea 
                  id="message_content" 
                  name="message_content" 
                  rows={5} 
                  required 
                  placeholder="Digite a mensagem ou a URL da mídia. Variáveis disponíveis: {{name}}, {{form_name}} e outros campos do formulário." 
                />
                <p className="text-xs text-muted-foreground">
                  Use {'{{name}}'} para o nome do lead.
                </p>
              </div>

              <DialogFooter>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
};

export default RemarketingList;
