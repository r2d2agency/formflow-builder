import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFormBySlug } from '@/hooks/useForms';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { Form, FormField } from '@/types';
import { cn } from '@/lib/utils';
import MaskedInput from '@/components/forms/MaskedInput';

// Helper to apply custom colors
const useCustomStyles = (form: Form | undefined) => {
  const primaryColor = form?.settings?.primary_color || '#1e40af';
  const backgroundColor = form?.settings?.background_color || '#f8fafc';
  const textColor = form?.settings?.text_color || '#1e293b';
  const buttonTextColor = form?.settings?.button_text_color || '#ffffff';

  return {
    '--form-primary': primaryColor,
    '--form-bg': backgroundColor,
    '--form-text': textColor,
    '--form-button-text': buttonTextColor,
  } as React.CSSProperties;
};

// Typeform style - one question at a time with slide animation
const TypeformRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
  isEmbed?: boolean;
}> = ({ form, onSubmit, isSubmitting, isEmbed }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentValue, setCurrentValue] = useState<string | string[]>('');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const customStyles = useCustomStyles(form);

  const fields = form.fields || [];
  const currentField = fields[currentIndex];
  const isLastField = currentIndex === fields.length - 1;

  const handleNext = () => {
    if (currentField) {
      if (currentField.required && !currentValue.toString().trim()) {
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
        setSlideDirection('left');
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setCurrentValue(answers[fields[currentIndex + 1]?.label] || '');
          setIsAnimating(false);
        }, 300);
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setSlideDirection('right');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setCurrentValue(answers[fields[currentIndex - 1]?.label] || '');
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const renderInput = () => {
    if (!currentField) return null;

    // Style: only bottom border (underline style like Typeform)
    const baseInputClass = "h-14 text-xl border-0 border-b-2 border-current/40 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-current focus:border-current placeholder:opacity-50 transition-colors";

    switch (currentField.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={currentField.placeholder || 'Digite sua resposta...'}
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] text-xl border-0 border-b-2 border-current/40 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-current focus:border-current placeholder:opacity-50 resize-none transition-colors"
            autoFocus
          />
        );
      case 'whatsapp':
        return (
          <MaskedInput
            mask="whatsapp"
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(val) => setCurrentValue(val)}
            onKeyDown={handleKeyDown}
            className={baseInputClass}
            autoFocus
          />
        );
      case 'phone':
        return (
          <MaskedInput
            mask="phone"
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(val) => setCurrentValue(val)}
            onKeyDown={handleKeyDown}
            className={baseInputClass}
            autoFocus
          />
        );
      case 'email':
        return (
          <MaskedInput
            mask="email"
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(val) => setCurrentValue(val)}
            onKeyDown={handleKeyDown}
            className={baseInputClass}
            autoFocus
          />
        );
      case 'select':
        return (
          <Select 
            value={typeof currentValue === 'string' ? currentValue : ''} 
            onValueChange={(val) => setCurrentValue(val)}
          >
            <SelectTrigger 
              className="h-14 text-lg border-0 border-b-2 border-current/40 rounded-none bg-transparent focus:ring-0"
              style={{ color: 'var(--form-text)', borderColor: 'currentColor' }}
            >
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border shadow-lg z-50">
              {(currentField.options || []).map((option, i) => (
                <SelectItem 
                  key={i} 
                  value={option}
                  className="text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <RadioGroup 
            value={typeof currentValue === 'string' ? currentValue : ''} 
            onValueChange={(val) => setCurrentValue(val)} 
            className="space-y-3"
          >
            {(currentField.options || []).map((option, i) => (
              <label
                key={i}
                className="flex items-center gap-3 rounded-lg border border-current/30 p-4 cursor-pointer transition-colors hover:bg-white/10"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'inherit'
                }}
              >
                <RadioGroupItem 
                  value={option} 
                  className="border-current text-current"
                />
                <span className="text-lg">{option}</span>
              </label>
            ))}
          </RadioGroup>
        );
      case 'checkbox':
        const selectedValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className="space-y-3">
            {(currentField.options || []).map((option, i) => (
              <label
                key={i}
                className="flex items-center gap-3 rounded-lg border border-current/30 p-4 cursor-pointer transition-colors hover:bg-white/10"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'inherit'
                }}
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setCurrentValue([...selectedValues, option]);
                    } else {
                      setCurrentValue(selectedValues.filter((v: string) => v !== option));
                    }
                  }}
                  className="border-current"
                />
                <span className="text-lg">{option}</span>
              </label>
            ))}
          </div>
        );
      default:
        return (
          <Input
            type={currentField.type === 'number' ? 'number' : currentField.type === 'date' ? 'date' : 'text'}
            placeholder={currentField.placeholder || 'Digite sua resposta...'}
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={baseInputClass}
            autoFocus
          />
        );
    }
  };

  if (!currentField) {
    return null;
  }

  const progress = ((currentIndex + 1) / fields.length) * 100;

  // Animation classes based on direction
  const getAnimationClass = () => {
    if (!isAnimating) return 'translate-x-0 opacity-100';
    return slideDirection === 'left' 
      ? '-translate-x-full opacity-0' 
      : 'translate-x-full opacity-0';
  };

  return (
    <div 
      className={cn(
        "flex flex-col overflow-hidden",
        isEmbed ? "min-h-full" : "min-h-screen"
      )}
      style={{ 
        ...customStyles,
        backgroundColor: 'var(--form-bg)',
        color: 'var(--form-text)',
      }}
    >
      {/* Logo */}
      {form.settings?.logo_url && (
        <div className="flex justify-center pt-6">
          <img 
            src={form.settings.logo_url} 
            alt="Logo" 
            className="max-h-16 object-contain"
          />
        </div>
      )}

      {/* Progress bar */}
      <div className={cn("left-0 right-0 h-1 bg-current/10", isEmbed ? "relative mt-4" : "fixed top-0")}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: 'var(--form-primary)' }}
        />
      </div>

      {/* Main content with slide animation */}
      <div className="flex flex-1 items-center justify-center p-6 overflow-hidden">
        <div 
          className={cn(
            "w-full max-w-xl space-y-8 text-center transition-all duration-300 ease-out",
            getAnimationClass()
          )}
        >
          {/* Question number */}
          <div className="flex items-center justify-center gap-2 opacity-70">
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
          <div className="space-y-6 text-left">
            {renderInput()}

            <div className="flex items-center justify-center gap-4 pt-2">
              <Button
                onClick={handleNext}
                disabled={isSubmitting || isAnimating}
                className="gap-2 px-6"
                style={{ 
                  backgroundColor: 'var(--form-button-text)',
                  color: 'var(--form-bg)',
                }}
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
              <span className="text-sm opacity-60">
                pressione <kbd className="px-1.5 py-0.5 text-xs opacity-80">Enter ↵</kbd>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className={cn("flex justify-center gap-2 pb-6", isEmbed ? "" : "fixed bottom-6 right-6")}>
        <Button
          variant="outline"
          size="icon"
          onClick={handleBack}
          disabled={currentIndex === 0 || isAnimating}
          className="border-current/30 bg-transparent hover:bg-current/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isSubmitting || isAnimating}
          className="border-current/30 bg-transparent hover:bg-current/10"
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
  isEmbed?: boolean;
}> = ({ form, onSubmit, isSubmitting, isEmbed }) => {
  const [messages, setMessages] = useState<{ type: 'bot' | 'user'; text: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const customStyles = useCustomStyles(form);

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

    setMessages((prev) => [...prev, { type: 'user', text: inputValue }]);
    const newAnswers = { ...answers, [currentField.label]: inputValue };
    setAnswers(newAnswers);
    setInputValue('');

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
    <div 
      className={cn("flex flex-col", isEmbed ? "min-h-full" : "min-h-screen")}
      style={{ ...customStyles, backgroundColor: 'var(--form-bg)' }}
    >
      {/* Header */}
      <div className="border-b bg-card p-4 text-center">
        {form.settings?.logo_url && (
          <img 
            src={form.settings.logo_url} 
            alt="Logo" 
            className="mx-auto max-h-12 object-contain mb-2"
          />
        )}
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
                  ? 'text-white'
                  : 'bg-muted'
              )}
              style={msg.type === 'user' ? { backgroundColor: 'var(--form-primary)' } : {}}
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
            <Button 
              onClick={handleSend} 
              disabled={isSubmitting}
              style={{ backgroundColor: 'var(--form-primary)', color: 'var(--form-button-text)' }}
            >
              Enviar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Standard form renderer - CENTRALIZED
const StandardRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
  isEmbed?: boolean;
}> = ({ form, onSubmit, isSubmitting, isEmbed }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const customStyles = useCustomStyles(form);

  const handleChange = (label: string, value: any) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const fields = form.fields || [];
    for (const field of fields) {
      if (field.required && !formData[field.label]?.toString().trim()) {
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
    const value = formData[field.label] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleChange(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={isSubmitting}
            rows={4}
          />
        );
      case 'whatsapp':
        return (
          <MaskedInput
            mask="whatsapp"
            value={value}
            onChange={(val) => handleChange(field.label, val)}
            disabled={isSubmitting}
          />
        );
      case 'phone':
        return (
          <MaskedInput
            mask="phone"
            value={value}
            onChange={(val) => handleChange(field.label, val)}
            disabled={isSubmitting}
          />
        );
      case 'email':
        return (
          <MaskedInput
            mask="email"
            value={value}
            onChange={(val) => handleChange(field.label, val)}
            disabled={isSubmitting}
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleChange(field.label, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option, i) => (
                <SelectItem key={i} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <RadioGroup value={value} onValueChange={(val) => handleChange(field.label, val)} className="space-y-2">
            {(field.options || []).map((option, i) => (
              <label
                key={i}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value={option} />
                <span>{option}</span>
              </label>
            ))}
          </RadioGroup>
        );
      case 'checkbox':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {(field.options || []).map((option, i) => (
              <label
                key={i}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleChange(field.label, [...selectedValues, option]);
                    } else {
                      handleChange(field.label, selectedValues.filter((v: string) => v !== option));
                    }
                  }}
                  disabled={isSubmitting}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleChange(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={isSubmitting}
            type={
              field.type === 'number' ? 'number' :
              field.type === 'date' ? 'date' :
              'text'
            }
          />
        );
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-center p-4",
        isEmbed ? "min-h-full" : "min-h-screen"
      )}
      style={{ ...customStyles, backgroundColor: 'var(--form-bg)' }}
    >
      <div className="w-full max-w-lg rounded-xl border bg-card p-8 shadow-lg text-center">
        {/* Logo */}
        {form.settings?.logo_url && (
          <div className="flex justify-center mb-6">
            <img 
              src={form.settings.logo_url} 
              alt="Logo" 
              className="max-h-20 object-contain"
            />
          </div>
        )}

        <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--form-text)' }}>
          {form.name}
        </h1>
        {form.description && (
          <p className="mb-6 text-muted-foreground">{form.description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {(form.fields || []).map((field) => (
            <div key={field.id} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
            style={{ 
              backgroundColor: 'var(--form-primary)',
              color: 'var(--form-button-text)',
            }}
          >
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

// Success screen - CENTRALIZED
const SuccessScreen: React.FC<{ message?: string; logoUrl?: string; isEmbed?: boolean }> = ({ 
  message, 
  logoUrl, 
  isEmbed 
}) => (
  <div className={cn(
    "flex items-center justify-center bg-gradient-to-br from-background to-muted p-4",
    isEmbed ? "min-h-full" : "min-h-screen"
  )}>
    <div className="text-center space-y-4">
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="mx-auto max-h-16 object-contain mb-4"
        />
      )}
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
  const [searchParams] = useSearchParams();
  const { data: form, isLoading, error } = useFormBySlug(slug || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if embed mode
  const isEmbed = searchParams.get('embed') === '1' || searchParams.get('embed') === 'true';

  // Mock form for demo
  const mockForm: Form = {
    id: '1',
    name: 'Formulário de Demonstração',
    slug: slug || 'demo',
    type: 'typeform',
    fields: [
      { id: '1', type: 'text', label: 'Qual é o seu nome?', placeholder: 'Digite seu nome completo', required: true, order: 0 },
      { id: '2', type: 'email', label: 'Qual é o seu email?', placeholder: 'seu@email.com', required: true, order: 1 },
      { id: '3', type: 'whatsapp', label: 'Qual é o seu WhatsApp?', placeholder: '+55 (00) 00000-0000', required: false, order: 2 },
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
      const response = await apiService.post(
        API_CONFIG.ENDPOINTS.SUBMIT_FORM(slug || ''),
        { data }
      );

      if (!response.success && !error) {
        throw new Error(response.error);
      }

      setIsSuccess(true);

      if (displayForm?.settings?.redirect_url) {
        setTimeout(() => {
          if (isEmbed) {
            // For embed, open in parent window
            window.parent.location.href = displayForm.settings.redirect_url!;
          } else {
            window.location.href = displayForm.settings.redirect_url!;
          }
        }, 2000);
      }
    } catch (err) {
      console.log('Form submitted (demo):', data);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center",
        isEmbed ? "min-h-full" : "min-h-screen"
      )}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!displayForm) {
    return (
      <div className={cn(
        "flex items-center justify-center p-4",
        isEmbed ? "min-h-full" : "min-h-screen"
      )}>
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
      <div className={cn(
        "flex items-center justify-center p-4",
        isEmbed ? "min-h-full" : "min-h-screen"
      )}>
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
    return (
      <SuccessScreen 
        message={displayForm.settings?.success_message} 
        logoUrl={displayForm.settings?.logo_url}
        isEmbed={isEmbed}
      />
    );
  }

  // Render based on form type
  switch (displayForm.type) {
    case 'typeform':
      return (
        <TypeformRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEmbed={isEmbed}
        />
      );
    case 'chat':
      return (
        <ChatRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEmbed={isEmbed}
        />
      );
    case 'standard':
    default:
      return (
        <StandardRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEmbed={isEmbed}
        />
      );
  }
};

export default PublicForm;
