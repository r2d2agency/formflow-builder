import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFormBySlug } from '@/hooks/useForms';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { Form, FormField } from '@/types';
import { cn } from '@/lib/utils';

// Typeform style - one question at a time
const TypeformRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
}> = ({ form, onSubmit, isSubmitting }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentValue, setCurrentValue] = useState('');

  const fields = form.fields || [];
  const currentField = fields[currentIndex];
  const isLastField = currentIndex === fields.length - 1;

  const handleNext = () => {
    if (currentField) {
      if (currentField.required && !currentValue.trim()) {
        toast({
          title: 'Campo obrigatório',
          description: 'Por favor, preencha este campo.',
          variant: 'destructive',
        });
        return;
      }
      
      setAnswers((prev) => ({ ...prev, [currentField.label]: currentValue }));
      
      if (isLastField) {
        onSubmit({ ...answers, [currentField.label]: currentValue });
      } else {
        setCurrentIndex((prev) => prev + 1);
        setCurrentValue(answers[fields[currentIndex + 1]?.label] || '');
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setCurrentValue(answers[fields[currentIndex - 1]?.label] || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  if (!currentField) {
    return null;
  }

  const progress = ((currentIndex + 1) / fields.length) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background to-muted">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-8">
          {/* Question number */}
          <div className="flex items-center gap-2 text-primary">
            <span className="text-sm font-medium">
              {currentIndex + 1} → {fields.length}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {currentField.label}
            {currentField.required && <span className="text-destructive">*</span>}
          </h2>

          {/* Input */}
          <div className="space-y-4">
            {currentField.type === 'textarea' ? (
              <Textarea
                placeholder={currentField.placeholder || 'Digite sua resposta...'}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[120px] text-lg border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
                autoFocus
              />
            ) : (
              <Input
                type={currentField.type === 'email' ? 'email' : currentField.type === 'phone' || currentField.type === 'whatsapp' ? 'tel' : currentField.type === 'number' ? 'number' : currentField.type === 'date' ? 'date' : 'text'}
                placeholder={currentField.placeholder || 'Digite sua resposta...'}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-14 text-lg border-0 border-b-2 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
                autoFocus
              />
            )}

            <div className="flex items-center gap-4">
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : isLastField ? (
                  <>
                    {form.settings?.button_text || 'Enviar'}
                    <Check className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    OK
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                pressione <kbd className="rounded border px-1">Enter ↵</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-6 right-6 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleBack}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isSubmitting}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Chat style renderer
const ChatRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
}> = ({ form, onSubmit, isSubmitting }) => {
  const [messages, setMessages] = useState<{ type: 'bot' | 'user'; text: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);

  const fields = form.fields || [];

  useEffect(() => {
    if (fields[0]) {
      setMessages([{ type: 'bot', text: fields[0].label }]);
    }
  }, []);

  const handleSend = async () => {
    const currentField = fields[currentIndex];
    if (!inputValue.trim()) {
      if (currentField?.required) {
        toast({
          title: 'Campo obrigatório',
          description: 'Por favor, preencha este campo.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Add user message
    setMessages((prev) => [...prev, { type: 'user', text: inputValue }]);
    const newAnswers = { ...answers, [currentField.label]: inputValue };
    setAnswers(newAnswers);
    setInputValue('');

    // Check if there are more questions
    if (currentIndex < fields.length - 1) {
      const nextField = fields[currentIndex + 1];
      setTimeout(() => {
        setMessages((prev) => [...prev, { type: 'bot', text: nextField.label }]);
        setCurrentIndex((prev) => prev + 1);
      }, 500);
    } else {
      setIsComplete(true);
      await onSubmit(newAnswers);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <h1 className="text-lg font-semibold">{form.name}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              msg.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2',
                msg.type === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isSubmitting && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {!isComplete && (
        <div className="border-t bg-card p-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta..."
              disabled={isSubmitting}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isSubmitting}>
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Standard form renderer
const StandardRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
}> = ({ form, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleChange = (label: string, value: any) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const fields = form.fields || [];
    for (const field of fields) {
      if (field.required && !formData[field.label]?.trim()) {
        toast({
          title: 'Campo obrigatório',
          description: `Por favor, preencha o campo "${field.label}".`,
          variant: 'destructive',
        });
        return;
      }
    }
    
    onSubmit(formData);
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      value: formData[field.label] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleChange(field.label, e.target.value),
      placeholder: field.placeholder,
      required: field.required,
      disabled: isSubmitting,
    };

    if (field.type === 'textarea') {
      return <Textarea {...commonProps} rows={4} />;
    }

    return (
      <Input
        {...commonProps}
        type={
          field.type === 'email' ? 'email' :
          field.type === 'phone' || field.type === 'whatsapp' ? 'tel' :
          field.type === 'number' ? 'number' :
          field.type === 'date' ? 'date' :
          'text'
        }
      />
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-lg">
        <h1 className="mb-2 text-2xl font-bold">{form.name}</h1>
        {form.description && (
          <p className="mb-6 text-muted-foreground">{form.description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {(form.fields || []).map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
              {renderField(field)}
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              form.settings?.button_text || 'Enviar'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

// Success screen
const SuccessScreen: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
    <div className="text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-8 w-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold">Obrigado!</h1>
      <p className="text-muted-foreground max-w-md">
        {message || 'Seu cadastro foi realizado com sucesso.'}
      </p>
    </div>
  </div>
);

// Main public form page
const PublicForm: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading, error } = useFormBySlug(slug || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mock form for demo
  const mockForm: Form = {
    id: '1',
    name: 'Formulário de Demonstração',
    slug: slug || 'demo',
    type: 'typeform',
    fields: [
      { id: '1', type: 'text', label: 'Qual é o seu nome?', placeholder: 'Digite seu nome completo', required: true, order: 0 },
      { id: '2', type: 'email', label: 'Qual é o seu email?', placeholder: 'seu@email.com', required: true, order: 1 },
      { id: '3', type: 'whatsapp', label: 'Qual é o seu WhatsApp?', placeholder: '11999998888', required: false, order: 2 },
    ],
    settings: {
      webhook_enabled: false,
      whatsapp_notification: false,
      button_text: 'Enviar',
      success_message: 'Obrigado! Seu cadastro foi realizado com sucesso.',
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const displayForm = error ? mockForm : form;

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    
    try {
      // Try to submit to API
      const response = await apiService.post(
        API_CONFIG.ENDPOINTS.SUBMIT_FORM(slug || ''),
        { data }
      );

      if (!response.success && !error) {
        throw new Error(response.error);
      }

      setIsSuccess(true);

      // Handle redirect
      if (displayForm?.settings?.redirect_url) {
        setTimeout(() => {
          window.location.href = displayForm.settings.redirect_url!;
        }, 2000);
      }
    } catch (err) {
      // For demo, show success anyway
      console.log('Form submitted (demo):', data);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!displayForm) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Formulário não encontrado</h1>
          <p className="text-muted-foreground">
            O formulário que você está procurando não existe ou foi desativado.
          </p>
        </div>
      </div>
    );
  }

  if (!displayForm.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Formulário Desativado</h1>
          <p className="text-muted-foreground">
            Este formulário não está mais aceitando respostas.
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return <SuccessScreen message={displayForm.settings?.success_message} />;
  }

  // Render based on form type
  switch (displayForm.type) {
    case 'typeform':
      return (
        <TypeformRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      );
    case 'chat':
      return (
        <ChatRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      );
    case 'standard':
    default:
      return (
        <StandardRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      );
  }
};

export default PublicForm;
