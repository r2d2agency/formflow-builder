import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
  ExternalLink,
  Settings,
  Layers,
  Webhook,
  BarChart3,
  MessageCircle,
  Code,
  Copy,
  Check,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import type { Form, FormField, FormSettings } from '@/types';
import LogoUploader from '@/components/forms/LogoUploader';
import WhatsAppMessageEditor from '@/components/forms/WhatsAppMessageEditor';
import SortableFieldEditor from '@/components/forms/SortableFieldEditor';

const FormEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: form, isLoading, error } = useForm(id || '');
  const { data: evolutionInstances } = useEvolutionInstances();
  const updateForm = useUpdateForm();

  const [localForm, setLocalForm] = useState<Partial<Form> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const fields = localForm?.fields || [];
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedFields = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
          ...field,
          order: index,
        }));
        handleChange('fields', reorderedFields);
      }
    }
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
          <TabsList className="flex-wrap">
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
            <TabsTrigger value="embed" className="gap-2">
              <Code className="h-4 w-4" />
              Embed
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={(localForm.fields || []).map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {(localForm.fields || []).map((field) => (
                      <SortableFieldEditor
                        key={field.id}
                        field={field}
                        onUpdate={(updates) => handleUpdateField(field.id, updates)}
                        onRemove={() => handleRemoveField(field.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
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

            {/* Appearance Card */}
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>
                  Personalize a logo e as cores do formulário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <LogoUploader
                  value={localForm.settings?.logo_url}
                  onChange={(url) => handleSettingsChange('logo_url', url)}
                />

                {/* Colors */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Cor Primária (Botão)</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="primary_color"
                        value={localForm.settings?.primary_color || '#1e40af'}
                        onChange={(e) => handleSettingsChange('primary_color', e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={localForm.settings?.primary_color || '#1e40af'}
                        onChange={(e) => handleSettingsChange('primary_color', e.target.value)}
                        placeholder="#1e40af"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="background_color">Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="background_color"
                        value={localForm.settings?.background_color || '#f8fafc'}
                        onChange={(e) => handleSettingsChange('background_color', e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={localForm.settings?.background_color || '#f8fafc'}
                        onChange={(e) => handleSettingsChange('background_color', e.target.value)}
                        placeholder="#f8fafc"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="text_color">Cor do Texto</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="text_color"
                        value={localForm.settings?.text_color || '#1e293b'}
                        onChange={(e) => handleSettingsChange('text_color', e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={localForm.settings?.text_color || '#1e293b'}
                        onChange={(e) => handleSettingsChange('text_color', e.target.value)}
                        placeholder="#1e293b"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="button_text_color">Cor do Texto do Botão</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="button_text_color"
                        value={localForm.settings?.button_text_color || '#ffffff'}
                        onChange={(e) => handleSettingsChange('button_text_color', e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={localForm.settings?.button_text_color || '#ffffff'}
                        onChange={(e) => handleSettingsChange('button_text_color', e.target.value)}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="input_border_color">Cor da Borda do Input</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="input_border_color"
                        value={localForm.settings?.input_border_color || '#94a3b8'}
                        onChange={(e) => handleSettingsChange('input_border_color', e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={localForm.settings?.input_border_color || '#94a3b8'}
                        onChange={(e) => handleSettingsChange('input_border_color', e.target.value)}
                        placeholder="#94a3b8"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placeholder_color">Cor do Placeholder</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        id="placeholder_color"
                        value={localForm.settings?.placeholder_color || '#9ca3af'}
                        onChange={(e) => handleSettingsChange('placeholder_color', e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={localForm.settings?.placeholder_color || '#9ca3af'}
                        onChange={(e) => handleSettingsChange('placeholder_color', e.target.value)}
                        placeholder="#9ca3af"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                {/* Preview */}
                <div 
                  className="rounded-lg border p-4"
                  style={{ backgroundColor: localForm.settings?.background_color || '#f8fafc' }}
                >
                  {localForm.settings?.logo_url && (
                    <img 
                      src={localForm.settings.logo_url} 
                      alt="Logo" 
                      className="h-10 w-auto mb-4 object-contain"
                    />
                  )}
                  <p className="mb-2 text-sm font-medium" style={{ color: localForm.settings?.text_color || '#1e293b' }}>
                    Preview do Formulário
                  </p>
                  <div className="mb-3">
                    <input 
                      type="text"
                      className="w-full border-0 border-b-2 bg-transparent py-2 text-sm outline-none"
                      style={{ 
                        borderColor: localForm.settings?.input_border_color || '#94a3b8',
                        color: localForm.settings?.text_color || '#1e293b',
                      }}
                      placeholder="Exemplo de input..."
                    />
                    <style>{`
                      input::placeholder { color: ${localForm.settings?.placeholder_color || '#9ca3af'} !important; }
                    `}</style>
                  </div>
                  <button
                    className="rounded-lg px-4 py-2 text-sm font-medium"
                    style={{ 
                      backgroundColor: localForm.settings?.primary_color || '#1e40af',
                      color: localForm.settings?.button_text_color || '#ffffff'
                    }}
                  >
                    {localForm.settings?.button_text || 'Enviar'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp (Evolution API)
                </CardTitle>
                <CardDescription>
                  Envie notificações e materiais via WhatsApp quando houver novos leads
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notificações WhatsApp</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagem automática para novos cadastros
                    </p>
                  </div>
                  <Switch
                    checked={localForm.settings?.whatsapp_notification}
                    onCheckedChange={(v) => handleSettingsChange('whatsapp_notification', v)}
                  />
                </div>
                {localForm.settings?.whatsapp_notification && (
                  <>
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

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp_target_number">Número de Destino (WhatsApp)</Label>
                      <Input
                        id="whatsapp_target_number"
                        value={localForm.settings?.whatsapp_target_number || ''}
                        onChange={(e) => handleSettingsChange('whatsapp_target_number', e.target.value)}
                        placeholder="5511999998888 (deixe vazio para usar o padrão da instância)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Número que receberá as notificações. Se vazio, usa o número padrão da instância selecionada.
                      </p>
                    </div>

                    <div className="border-t pt-4">
                      <WhatsAppMessageEditor
                        value={localForm.settings?.whatsapp_message}
                        onChange={(msg) => handleSettingsChange('whatsapp_message', msg)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Floating WhatsApp Button Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Botão Flutuante WhatsApp
                </CardTitle>
                <CardDescription>
                  Exibir um botão de contato via WhatsApp no canto do formulário
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Botão Flutuante</p>
                    <p className="text-sm text-muted-foreground">
                      Mostrar botão de WhatsApp no canto inferior esquerdo
                    </p>
                  </div>
                  <Switch
                    checked={localForm.settings?.whatsapp_float_enabled}
                    onCheckedChange={(v) => handleSettingsChange('whatsapp_float_enabled', v)}
                  />
                </div>
                {localForm.settings?.whatsapp_float_enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp_float_number">Número do WhatsApp</Label>
                      <Input
                        id="whatsapp_float_number"
                        value={localForm.settings?.whatsapp_float_number || ''}
                        onChange={(e) => handleSettingsChange('whatsapp_float_number', e.target.value)}
                        placeholder="5511999998888"
                      />
                      <p className="text-xs text-muted-foreground">
                        Número que será contatado ao clicar no botão (com DDD e código do país)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp_float_message">Mensagem Inicial (opcional)</Label>
                      <Input
                        id="whatsapp_float_message"
                        value={localForm.settings?.whatsapp_float_message || ''}
                        onChange={(e) => handleSettingsChange('whatsapp_float_message', e.target.value)}
                        placeholder="Olá! Vim pelo formulário e gostaria de mais informações."
                      />
                      <p className="text-xs text-muted-foreground">
                        Mensagem pré-preenchida que aparece no WhatsApp ao clicar
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* RD Station Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  RD Station
                </CardTitle>
                <CardDescription>
                  Envie leads automaticamente para o RD Station Marketing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Integração RD Station</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar leads para o RD Station via API de Conversões
                    </p>
                  </div>
                  <Switch
                    checked={localForm.settings?.rdstation_enabled}
                    onCheckedChange={(v) => handleSettingsChange('rdstation_enabled', v)}
                  />
                </div>
                {localForm.settings?.rdstation_enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rdstation_api_token">Token da API</Label>
                      <Input
                        id="rdstation_api_token"
                        type="password"
                        value={localForm.settings?.rdstation_api_token || ''}
                        onChange={(e) => handleSettingsChange('rdstation_api_token', e.target.value)}
                        placeholder="seu-token-api-rdstation"
                      />
                      <p className="text-xs text-muted-foreground">
                        Token de integração gerado em RD Station → Integrações → Tokens
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rdstation_conversion_identifier">Identificador de Conversão</Label>
                      <Input
                        id="rdstation_conversion_identifier"
                        value={localForm.settings?.rdstation_conversion_identifier || ''}
                        onChange={(e) => handleSettingsChange('rdstation_conversion_identifier', e.target.value)}
                        placeholder="formulario-site-principal"
                      />
                      <p className="text-xs text-muted-foreground">
                        Identificador único para esta conversão (usado para criar automações no RD)
                      </p>
                    </div>
                  </>
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
              <CardContent className="space-y-6">
                {/* Facebook Pixel Section */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Facebook Pixel (Conversions API)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="facebook_pixel">Pixel ID</Label>
                    <Input
                      id="facebook_pixel"
                      value={localForm.settings?.facebook_pixel || ''}
                      onChange={(e) => handleSettingsChange('facebook_pixel', e.target.value)}
                      placeholder="123456789012345"
                    />
                    <p className="text-xs text-muted-foreground">
                      ID do seu Pixel do Facebook
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook_pixel_access_token">Access Token</Label>
                    <Input
                      id="facebook_pixel_access_token"
                      type="password"
                      value={localForm.settings?.facebook_pixel_access_token || ''}
                      onChange={(e) => handleSettingsChange('facebook_pixel_access_token', e.target.value)}
                      placeholder="EAAxxxxxxxxxxxxxxxx"
                    />
                    <p className="text-xs text-muted-foreground">
                      Token de acesso gerado no Gerenciador de Eventos do Facebook
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook_pixel_test_code">Test Event Code (opcional)</Label>
                    <Input
                      id="facebook_pixel_test_code"
                      value={localForm.settings?.facebook_pixel_test_code || ''}
                      onChange={(e) => handleSettingsChange('facebook_pixel_test_code', e.target.value)}
                      placeholder="TEST12345"
                    />
                    <p className="text-xs text-muted-foreground">
                      Código para testar eventos no modo de desenvolvimento
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium text-sm">Google Analytics</h4>
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

          {/* Embed Tab */}
          <TabsContent value="embed" className="space-y-4">
            <EmbedSection slug={localForm.slug || ''} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

// Embed Section Component
const EmbedSection: React.FC<{ slug: string }> = ({ slug }) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const formUrl = `${window.location.origin}/f/${slug}`;
  const embedUrl = `${formUrl}?embed=1`;

  const iframeCode = `<iframe 
  src="${embedUrl}"
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>`;

  const scriptCode = `<div id="formbuilder-embed-${slug}"></div>
<script>
  (function() {
    var container = document.getElementById('formbuilder-embed-${slug}');
    var iframe = document.createElement('iframe');
    iframe.src = '${embedUrl}';
    iframe.width = '100%';
    iframe.height = '600';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    container.appendChild(iframe);
  })();
</script>`;

  const popupCode = `<script>
  function openForm${slug.replace(/-/g, '')}() {
    var popup = window.open('${formUrl}', 'formbuilder', 'width=600,height=700,scrollbars=yes');
    popup.focus();
  }
</script>
<button onclick="openForm${slug.replace(/-/g, '')}()">
  Abrir Formulário
</button>`;

  const handleCopy = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(type);
    toast({
      title: 'Código copiado!',
      description: 'Cole no seu site para incorporar o formulário.',
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Incorporar Formulário
          </CardTitle>
          <CardDescription>
            Use esses códigos para incorporar o formulário em outros sites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Direct URL */}
          <div className="space-y-2">
            <Label>URL Direta</Label>
            <p className="text-sm text-muted-foreground">
              Link direto para o formulário
            </p>
            <div className="flex gap-2">
              <Input value={formUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(formUrl, 'url')}
              >
                {copiedCode === 'url' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={formUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Iframe embed */}
          <div className="space-y-2">
            <Label>Embed com iFrame</Label>
            <p className="text-sm text-muted-foreground">
              Código simples para incorporar em qualquer site
            </p>
            <div className="relative">
              <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
                <code>{iframeCode}</code>
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(iframeCode, 'iframe')}
              >
                {copiedCode === 'iframe' ? (
                  <><Check className="h-3 w-3 mr-1" /> Copiado</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Copiar</>
                )}
              </Button>
            </div>
          </div>

          {/* Script embed */}
          <div className="space-y-2">
            <Label>Embed com JavaScript</Label>
            <p className="text-sm text-muted-foreground">
              Para integração mais flexível via script
            </p>
            <div className="relative">
              <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
                <code>{scriptCode}</code>
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(scriptCode, 'script')}
              >
                {copiedCode === 'script' ? (
                  <><Check className="h-3 w-3 mr-1" /> Copiado</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Copiar</>
                )}
              </Button>
            </div>
          </div>

          {/* Popup */}
          <div className="space-y-2">
            <Label>Abrir em Popup</Label>
            <p className="text-sm text-muted-foreground">
              Abre o formulário em uma nova janela popup
            </p>
            <div className="relative">
              <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto">
                <code>{popupCode}</code>
              </pre>
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(popupCode, 'popup')}
              >
                {copiedCode === 'popup' ? (
                  <><Check className="h-3 w-3 mr-1" /> Copiado</>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /> Copiar</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização do Embed</CardTitle>
          <CardDescription>
            Veja como o formulário ficará quando incorporado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden" style={{ height: '500px' }}>
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title="Form Preview"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default FormEditor;
