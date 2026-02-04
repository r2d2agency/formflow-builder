import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, useUpdateForm } from '@/hooks/useForms';
import { useEvolutionInstances } from '@/hooks/useEvolutionInstances';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  Settings,
  Layers,
  Webhook,
  BarChart3,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import type { Form, FormField, FormSettings } from '@/types';

const fieldTypes = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'textarea', label: 'Texto Longo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Seleção' },
  { value: 'radio', label: 'Múltipla Escolha' },
  { value: 'checkbox', label: 'Checkbox' },
];

const FormEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: form, isLoading, error } = useForm(id || '');
  const { data: evolutionInstances } = useEvolutionInstances();
  const updateForm = useUpdateForm();

  const [localForm, setLocalForm] = useState<Partial<Form> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Mock form for demo
  const mockForm: Form = {
    id: id || '1',
    name: 'Formulário de Exemplo',
    slug: 'exemplo',
    description: 'Um formulário de demonstração',
    type: 'typeform',
    fields: [
      { id: '1', type: 'text', label: 'Nome completo', placeholder: 'Digite seu nome', required: true, order: 0 },
      { id: '2', type: 'email', label: 'Email', placeholder: 'seu@email.com', required: true, order: 1 },
      { id: '3', type: 'whatsapp', label: 'WhatsApp', placeholder: '11999998888', required: false, order: 2 },
    ],
    settings: {
      webhook_enabled: false,
      whatsapp_notification: false,
      button_text: 'Enviar',
      success_message: 'Obrigado! Seu cadastro foi realizado.',
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  useEffect(() => {
    if (form) {
      setLocalForm(form);
    } else if (error) {
      setLocalForm(mockForm);
    }
  }, [form, error]);

  const handleChange = <K extends keyof Form>(key: K, value: Form[K]) => {
    setLocalForm((prev) => prev ? { ...prev, [key]: value } : null);
    setIsDirty(true);
  };

  const handleSettingsChange = <K extends keyof FormSettings>(key: K, value: FormSettings[K]) => {
    setLocalForm((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        settings: { ...prev.settings, [key]: value } as FormSettings,
      };
    });
    setIsDirty(true);
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      type: 'text',
      label: 'Novo Campo',
      placeholder: '',
      required: false,
      order: localForm?.fields?.length || 0,
    };
    handleChange('fields', [...(localForm?.fields || []), newField]);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    handleChange(
      'fields',
      (localForm?.fields || []).map((f) =>
        f.id === fieldId ? { ...f, ...updates } : f
      )
    );
  };

  const handleRemoveField = (fieldId: string) => {
    handleChange(
      'fields',
      (localForm?.fields || []).filter((f) => f.id !== fieldId)
    );
  };

  const handleSave = async () => {
    if (!localForm || !id) return;
    
    await updateForm.mutateAsync({ id, data: localForm });
    setIsDirty(false);
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

  if (!localForm) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Formulário não encontrado.</p>
          <Button variant="link" onClick={() => navigate('/admin/forms')}>
            Voltar para lista
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/forms')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{localForm.name}</h1>
              <p className="text-muted-foreground">
                /{localForm.slug}
                {isDirty && <Badge variant="secondary" className="ml-2">Não salvo</Badge>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/f/${localForm.slug}`, '_blank')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Visualizar
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || updateForm.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateForm.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="fields" className="space-y-6">
          <TabsList>
            <TabsTrigger value="fields" className="gap-2">
              <Layers className="h-4 w-4" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <Webhook className="h-4 w-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Rastreamento
            </TabsTrigger>
          </TabsList>

          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Campos do Formulário</CardTitle>
                  <CardDescription>
                    Adicione e configure os campos que serão exibidos
                  </CardDescription>
                </div>
                <Button onClick={handleAddField}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Campo
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {(localForm.fields || []).map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className="cursor-move text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={field.type}
                          onValueChange={(v) => handleUpdateField(field.id, { type: v as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                          placeholder="Nome do campo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Placeholder</Label>
                        <Input
                          value={field.placeholder || ''}
                          onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                          placeholder="Texto de exemplo"
                        />
                      </div>
                      <div className="flex items-end gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(v) => handleUpdateField(field.id, { required: v })}
                          />
                          <Label>Obrigatório</Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveField(field.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {(localForm.fields || []).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum campo adicionado ainda.
                    </p>
                    <Button variant="link" onClick={handleAddField}>
                      Adicionar primeiro campo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Configure o comportamento do formulário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Formulário</Label>
                    <Input
                      id="name"
                      value={localForm.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL)</Label>
                    <Input
                      id="slug"
                      value={localForm.slug || ''}
                      onChange={(e) => handleChange('slug', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={localForm.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="button_text">Texto do Botão</Label>
                    <Input
                      id="button_text"
                      value={localForm.settings?.button_text || 'Enviar'}
                      onChange={(e) => handleSettingsChange('button_text', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="redirect_url">URL de Redirecionamento</Label>
                    <Input
                      id="redirect_url"
                      value={localForm.settings?.redirect_url || ''}
                      onChange={(e) => handleSettingsChange('redirect_url', e.target.value)}
                      placeholder="https://exemplo.com/obrigado"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="success_message">Mensagem de Sucesso</Label>
                  <Textarea
                    id="success_message"
                    value={localForm.settings?.success_message || ''}
                    onChange={(e) => handleSettingsChange('success_message', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Formulário Ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Quando desativado, o formulário não aceita novas submissões
                    </p>
                  </div>
                  <Switch
                    checked={localForm.is_active}
                    onCheckedChange={(v) => handleChange('is_active', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp (Evolution API)</CardTitle>
                <CardDescription>
                  Envie notificações via WhatsApp quando houver novos leads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas de novos cadastros
                    </p>
                  </div>
                  <Switch
                    checked={localForm.settings?.whatsapp_notification}
                    onCheckedChange={(v) => handleSettingsChange('whatsapp_notification', v)}
                  />
                </div>
                {localForm.settings?.whatsapp_notification && (
                  <div className="space-y-2">
                    <Label>Instância Evolution</Label>
                    <Select
                      value={localForm.settings?.evolution_instance_id || ''}
                      onValueChange={(v) => handleSettingsChange('evolution_instance_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma instância" />
                      </SelectTrigger>
                      <SelectContent>
                        {(evolutionInstances || []).map((instance) => (
                          <SelectItem key={instance.id} value={instance.id}>
                            {instance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook</CardTitle>
                <CardDescription>
                  Envie os dados para uma URL externa quando houver novos leads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Webhook Ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar dados via HTTP POST
                    </p>
                  </div>
                  <Switch
                    checked={localForm.settings?.webhook_enabled}
                    onCheckedChange={(v) => handleSettingsChange('webhook_enabled', v)}
                  />
                </div>
                {localForm.settings?.webhook_enabled && (
                  <div className="space-y-2">
                    <Label htmlFor="webhook_url">URL do Webhook</Label>
                    <Input
                      id="webhook_url"
                      value={localForm.settings?.webhook_url || ''}
                      onChange={(e) => handleSettingsChange('webhook_url', e.target.value)}
                      placeholder="https://hooks.exemplo.com/lead"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pixels de Rastreamento</CardTitle>
                <CardDescription>
                  Configure pixels de conversão para este formulário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook_pixel">Facebook Pixel ID</Label>
                  <Input
                    id="facebook_pixel"
                    value={localForm.settings?.facebook_pixel || ''}
                    onChange={(e) => handleSettingsChange('facebook_pixel', e.target.value)}
                    placeholder="123456789012345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_analytics">Google Analytics ID</Label>
                  <Input
                    id="google_analytics"
                    value={localForm.settings?.google_analytics || ''}
                    onChange={(e) => handleSettingsChange('google_analytics', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_tag_manager">Google Tag Manager ID</Label>
                  <Input
                    id="google_tag_manager"
                    value={localForm.settings?.google_tag_manager || ''}
                    onChange={(e) => handleSettingsChange('google_tag_manager', e.target.value)}
                    placeholder="GTM-XXXXXXX"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default FormEditor;
