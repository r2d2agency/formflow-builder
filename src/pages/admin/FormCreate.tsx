import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateForm } from '@/hooks/useForms';
import { FileText, MessageSquare, Layout, ArrowRight, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import type { FormType } from '@/types';

const formTypes: { value: FormType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'typeform',
    label: 'Estilo Typeform',
    description: 'Uma pergunta por vez, experiência imersiva',
    icon: FileText,
  },
  {
    value: 'chat',
    label: 'Estilo Chat',
    description: 'Conversacional, como uma troca de mensagens',
    icon: MessageSquare,
  },
  {
    value: 'standard',
    label: 'Formulário Padrão',
    description: 'Todos os campos visíveis de uma vez',
    icon: Layout,
  },
  {
    value: 'link_bio',
    label: 'Link na Bio',
    description: 'Página de links estilo Linktree para redes sociais',
    icon: LinkIcon,
  },
];

const FormCreate: React.FC = () => {
  const [step, setStep] = useState(1);
  const [formType, setFormType] = useState<FormType>('typeform');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  
  const createForm = useCreateForm();
  const navigate = useNavigate();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreate = async () => {
    // Default fields based on type
    let initialFields: any[] = [];
    
    if (formType === 'link_bio') {
      initialFields = [
        { id: '1', type: 'link', label: 'Meu Site', placeholder: 'https://seusite.com.br', required: false, order: 0 },
        { id: '2', type: 'link', label: 'Fale no WhatsApp', placeholder: 'https://wa.me/55...', required: false, order: 1 },
      ];
    }

    const result = await createForm.mutateAsync({
      name,
      slug,
      description,
      type: formType,
      fields: initialFields,
      settings: {
        webhook_enabled: false,
        whatsapp_notification: false,
        button_text: 'Enviar',
        success_message: 'Obrigado! Seu cadastro foi realizado com sucesso.',
      },
      is_active: true,
    });

    if (result) {
      navigate(`/admin/forms/${result.id}`);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/forms')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Formulário</h1>
            <p className="text-muted-foreground">
              Etapa {step} de 2
            </p>
          </div>
        </div>

        {/* Step 1: Choose Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Escolha o Tipo de Formulário</CardTitle>
              <CardDescription>
                Selecione o estilo que melhor se adapta ao seu objetivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={formType} onValueChange={(v) => setFormType(v as FormType)}>
                {formTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                      formType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-muted-foreground/50'
                    }`}
                  >
                    <RadioGroupItem value={type.value} className="mt-1" />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <type.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)}>
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Configure o nome e identificador do formulário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Formulário *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Formulário de Contato"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/f/</span>
                  <Input
                    id="slug"
                    placeholder="formulario-contato"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O slug é usado na URL do formulário público
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo deste formulário"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!name.trim() || !slug.trim() || createForm.isPending}
                >
                  {createForm.isPending ? 'Criando...' : 'Criar Formulário'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default FormCreate;
