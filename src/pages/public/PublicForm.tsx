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
import { usePartialLead } from '@/hooks/usePartialLead';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft, Check, Loader2, MessageCircle, Image as ImageIcon } from 'lucide-react';
import type { Form, FormField } from '@/types';
import { cn } from '@/lib/utils';
import MaskedInput from '@/components/forms/MaskedInput';
import WhatsAppFloatButton from '@/components/forms/WhatsAppFloatButton';
import WhatsAppCheckStatus from '@/components/forms/WhatsAppCheckStatus';
import { useWhatsAppCheck } from '@/hooks/useWhatsAppCheck';

// Helper to get cookie value
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

// Helper to generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper to apply custom colors
const useCustomStyles = (form: Form | undefined) => {
  const primaryColor = form?.settings?.primary_color || '#1e40af';
  const backgroundColor = form?.settings?.background_color || '#f8fafc';
  const textColor = form?.settings?.text_color || '#1e293b';
  const buttonTextColor = form?.settings?.button_text_color || '#ffffff';
  const inputBorderColor = form?.settings?.input_border_color || '#94a3b8';
  const placeholderColor = form?.settings?.placeholder_color || '#9ca3af';

  return {
    '--form-primary': primaryColor,
    '--form-bg': backgroundColor,
    '--form-text': textColor,
    '--form-button-text': buttonTextColor,
    '--form-input-border': inputBorderColor,
    '--form-placeholder': placeholderColor,
  } as React.CSSProperties;
};

// Validation Helper
const validateField = (field: FormField, value: any): string | null => {
  // Check required
  if (field.required) {
    if (!value || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)) {
      return `O campo "${field.label}" é obrigatório.`;
    }
  }

  // If empty and not required, skip format check
  if (!value) return null;

  // Check formats
  if (field.type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `O campo "${field.label}" deve ser um e-mail válido.`;
    }
  }

  if (field.type === 'phone') {
     const digits = String(value).replace(/\D/g, '');
     if (digits.length < 10) {
       return `O campo "${field.label}" deve conter um número de telefone válido (DDD + número).`;
     }
  }

  if (field.type === 'whatsapp') {
     const digits = String(value).replace(/\D/g, '');
     // Expected format: 55 + DDD(2 digits) + number(8-9 digits) = 12 or 13 digits
     if (digits.length < 12 || digits.length > 13) {
       return `O campo "${field.label}" deve conter um número de WhatsApp válido com DDD.`;
     }
     // Check country code
     if (!digits.startsWith('55')) {
       return `O campo "${field.label}" deve começar com o código do Brasil (55).`;
     }
     // DDD validation: 2 digits after 55, cannot start with 0
     const ddd = digits.substring(2, 4);
     if (ddd.startsWith('0')) {
       return `O DDD não deve começar com zero. Use apenas os 2 dígitos (ex: 11, 21, 31).`;
     }
     const dddNum = parseInt(ddd, 10);
     if (dddNum < 11 || dddNum > 99) {
       return `DDD inválido. Informe um DDD válido (ex: 11, 21, 31).`;
     }
     // Mobile numbers in Brazil should start with 9 after DDD
     const numberPart = digits.substring(4);
     if (numberPart.length === 9 && !numberPart.startsWith('9')) {
       return `Número de celular inválido. Números de 9 dígitos devem começar com 9.`;
     }
  }
  
  return null;
};

// Typeform style - one question at a time with slide animation
const TypeformRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>, partialLeadId?: string | null) => Promise<void>;
  isSubmitting: boolean;
  isEmbed?: boolean;
  onFieldComplete?: (fieldLabel: string, value: any) => void;
}> = ({ form, onSubmit, isSubmitting, isEmbed, onFieldComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentValue, setCurrentValue] = useState<string | string[]>('');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Quiz & Lead Capture State
  const [isLeadCapturePhase, setIsLeadCapturePhase] = useState(
    !!(form.settings?.is_quiz_mode && form.settings?.collect_lead_before_quiz)
  );
  const [quizScore, setQuizScore] = useState(0);

  const customStyles = useCustomStyles(form);
  const { checkWhatsApp, isChecking: isCheckingWA, checkResult: waCheckResult, resetCheck: resetWACheck } = useWhatsAppCheck(form.slug);

  const fields = form.fields || [];
  const currentField = fields[currentIndex];
  const isLastField = currentIndex === fields.length - 1;

  const handleNext = async () => {
    if (currentField) {
      const error = validateField(currentField, currentValue);
      if (error) {
        toast({
          title: 'Atenção',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      // WhatsApp verification before proceeding
      if (currentField.type === 'whatsapp' && typeof currentValue === 'string' && currentValue.replace(/\D/g, '').length >= 12) {
        const result = await checkWhatsApp(currentValue);
        if (result && result.exists === false) {
          toast({
            title: 'Número inválido',
            description: 'Este número não possui WhatsApp. Por favor, informe um número válido.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      const newAnswers = { ...answers, [currentField.label]: currentValue };
      setAnswers(newAnswers);
      
      // Quiz Logic: Calculate Score
      if (form.settings?.is_quiz_mode) {
        let isCorrect = false;

        if (currentField.correct_answer) {
             // Handle array vs string comparison
             const userVal = Array.isArray(currentValue) ? [...currentValue].sort().join(',') : String(currentValue).trim();
             const correctVal = Array.isArray(currentField.correct_answer) 
                ? [...currentField.correct_answer].sort().join(',') 
                : String(currentField.correct_answer).trim();
             
             // Simple case-insensitive check
             if (userVal.toLowerCase() === correctVal.toLowerCase()) {
                 isCorrect = true;
                 setQuizScore(prev => prev + (currentField.points || 0));
             }

             // Show Feedback Toast
             if (isCorrect && currentField.feedback_correct) {
                 toast({
                   title: "Resposta Correta!",
                   description: currentField.feedback_correct,
                   className: "bg-green-100 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300",
                   duration: 3000,
                 });
             } else if (!isCorrect && currentField.feedback_incorrect) {
                 toast({
                   title: "Resposta Incorreta",
                   description: currentField.feedback_incorrect,
                   variant: "destructive",
                   duration: 3000,
                 });
             }
        }
      }
      
      // Save partial data when moving to next field
      if (onFieldComplete && currentValue.toString().trim()) {
        onFieldComplete(currentField.label, currentValue);
      }
      
      if (isLastField) {
        if (form.settings?.is_quiz_mode) {
           // Recalculate full score from answers to ensure accuracy
           let totalScore = 0;
           let totalPoints = 0;
           
           fields.forEach(f => {
              totalPoints += (f.points || 0);
              const answer = newAnswers[f.label];
              if (f.correct_answer && answer) {
                 const userVal = Array.isArray(answer) ? [...answer].sort().join(',') : String(answer).trim();
                 const correctVal = Array.isArray(f.correct_answer) ? [...f.correct_answer].sort().join(',') : String(f.correct_answer).trim();
                 if (userVal.toLowerCase() === correctVal.toLowerCase()) {
                    totalScore += (f.points || 0);
                 }
              }
           });
           
           const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
           const passed = percentage >= (form.settings?.quiz_passing_score || 0);

           onSubmit({
               ...newAnswers,
               _quiz_score: totalScore,
               _quiz_total: totalPoints,
               _quiz_percentage: percentage,
               _quiz_passed: passed
           });
        } else {
           onSubmit(newAnswers);
        }
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

    // Style: only bottom border (underline style like Typeform) - no focus outline/ring
    // Uses CSS variables for border and placeholder colors
    const inputStyle = {
      borderColor: 'var(--form-input-border)',
      color: 'var(--form-text)',
      '--tw-placeholder-opacity': '1',
    } as React.CSSProperties;
    
    const baseInputClass = "h-14 text-xl border-0 border-b-2 rounded-none bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors [&::placeholder]:text-[var(--form-placeholder)]";

    switch (currentField.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={currentField.placeholder || 'Digite sua resposta...'}
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(e) => setCurrentValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] text-xl border-0 border-b-2 rounded-none bg-transparent focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none transition-colors [&::placeholder]:text-[var(--form-placeholder)]"
            style={inputStyle}
            autoFocus
          />
        );
      case 'whatsapp':
        return (
          <div>
            <MaskedInput
              mask="whatsapp"
              value={typeof currentValue === 'string' ? currentValue : ''}
              onChange={(val) => { setCurrentValue(val); resetWACheck(); }}
              onBlur={() => {
                const val = typeof currentValue === 'string' ? currentValue : '';
                if (val.replace(/\D/g, '').length >= 12) {
                  checkWhatsApp(val);
                }
              }}
              onKeyDown={handleKeyDown}
              className={baseInputClass}
              style={inputStyle}
              autoFocus
            />
            <WhatsAppCheckStatus isChecking={isCheckingWA} checkResult={waCheckResult} />
          </div>
        );
      case 'phone':
        return (
          <MaskedInput
            mask="phone"
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChange={(val) => setCurrentValue(val)}
            onKeyDown={handleKeyDown}
            className={baseInputClass}
            style={inputStyle}
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
            style={inputStyle}
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
              className="h-14 text-lg border-0 border-b-2 rounded-none bg-transparent focus:ring-0"
              style={{ color: 'var(--form-text)', borderColor: 'var(--form-input-border)' }}
            >
              <SelectValue 
                placeholder="Selecione uma opção" 
              />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {(currentField.options || []).map((option, i) => (
                <SelectItem 
                  key={i} 
                  value={option}
                  className="text-foreground hover:bg-accent"
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
      case 'image_select':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(currentField.options_with_images || []).map((option, i) => (
              <button
                key={i}
                onClick={() => setCurrentValue(option.value)}
                className={`
                  relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all hover:bg-white/5
                  ${currentValue === option.value 
                    ? 'border-[var(--form-primary)] bg-[var(--form-primary)]/5' 
                    : 'border-current/20 hover:border-current/40'}
                `}
                style={currentValue === option.value ? { borderColor: 'var(--form-primary)' } : {}}
              >
                {/* Image Part */}
                <div className="aspect-video w-full overflow-hidden bg-black/20 relative">
                  {option.image_url ? (
                    <img 
                      src={option.image_url} 
                      alt={option.label}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-current/20">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>
                
                {/* Content Part */}
                <div className="p-4 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg leading-tight">{option.label}</h3>
                    {currentValue === option.value && (
                      <div className="shrink-0 rounded-full bg-[var(--form-primary)] p-1 text-[var(--form-button-text)]">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  {option.description && (
                    <p className="mt-1 text-sm opacity-70 leading-snug">{option.description}</p>
                  )}
                </div>
              </button>
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

  if (isLeadCapturePhase) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center min-h-screen p-6")}
        style={{ ...customStyles, backgroundColor: 'var(--form-bg)', color: 'var(--form-text)' }}
      >
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-lg animate-in fade-in zoom-in duration-500">
           {form.settings?.logo_url && (
            <div className="flex justify-center mb-6">
               <img src={form.settings.logo_url} alt="Logo" className="object-contain w-auto max-w-full" style={{ height: `${form.settings?.logo_size || 48}px`, minHeight: `${form.settings?.logo_size || 48}px` }} />
            </div>
           )}

           <div className="text-center space-y-2">
             <h1 className="text-2xl font-bold">Identificação</h1>
             <p className="opacity-80">Preencha seus dados para iniciar.</p>
           </div>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Nome Completo</Label>
               <Input 
                 value={answers['name'] || ''} 
                 onChange={e => setAnswers({...answers, name: e.target.value})}
                 className="bg-background/50"
                 placeholder="Seu nome"
               />
             </div>
             <div className="space-y-2">
               <Label>E-mail</Label>
               <Input 
                 type="email"
                 value={answers['email'] || ''} 
                 onChange={e => setAnswers({...answers, email: e.target.value})}
                 className="bg-background/50"
                 placeholder="seu@email.com"
               />
             </div>
             <div className="space-y-2">
               <Label>Telefone / WhatsApp</Label>
               <MaskedInput
                 mask="phone"
                 value={answers['phone'] || ''}
                 onChange={val => setAnswers({...answers, phone: val})}
                 className="bg-background/50"
               />
             </div>
             
             <Button 
               className="w-full h-12 text-base mt-4"
               onClick={() => {
                 if(!answers['name'] || !answers['email']) {
                   toast({ title: "Atenção", description: "Nome e E-mail são obrigatórios.", variant: "destructive" });
                   return;
                 }
                 setIsLeadCapturePhase(false);
               }}
               style={{ backgroundColor: 'var(--form-primary)', color: 'var(--form-button-text)' }}
             >
               Começar <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
        </div>
      </div>
    );
  }

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
      {/* Progress bar - top */}
      <div className={cn("left-0 right-0 h-1 bg-current/10", isEmbed ? "relative" : "fixed top-0 z-10")}>
        <div
          className="h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%`, backgroundColor: 'var(--form-primary)' }}
        />
      </div>

      {/* Centered content container */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 overflow-hidden">
        <div 
          className={cn(
            "w-full max-w-md flex flex-col items-center gap-6 transition-all duration-300 ease-out",
            getAnimationClass()
          )}
        >
          {/* Logo */}
          {form.settings?.logo_url && (
            <img 
              src={form.settings.logo_url} 
              alt="Logo" 
              className="object-contain w-auto max-w-full"
              style={{ height: `${form.settings?.logo_size || 48}px`, minHeight: `${form.settings?.logo_size || 48}px` }}
            />
          )}

          {/* Title and Description */}
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold">{form.name}</h1>
            {form.description && (
              <p className="text-sm opacity-80">{form.description}</p>
            )}
          </div>

          {/* Question number */}
          <span className="text-sm font-medium opacity-60">
            {currentIndex + 1} / {fields.length}
          </span>

          {/* Question */}
          <h2 className="text-2xl font-bold tracking-tight text-center md:text-3xl">
            {currentField.label}
            {currentField.required && <span className="text-destructive ml-1">*</span>}
          </h2>

          {/* Input - full width */}
          <div className="w-full">
            {renderInput()}
          </div>

          {/* Action button - directly below input */}
          <Button
            onClick={handleNext}
            disabled={isSubmitting || isAnimating}
            className="w-full gap-2 h-12 text-base"
            style={{ 
              backgroundColor: 'var(--form-primary)',
              color: 'var(--form-button-text)',
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
                Continuar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          {/* Navigation arrows */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={currentIndex === 0 || isAnimating}
              className="gap-1 opacity-60 hover:opacity-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <span className="text-xs opacity-40">|</span>
            <span className="text-xs opacity-50">
              <kbd className="px-1.5 py-0.5 rounded bg-current/10">Enter ↵</kbd>
            </span>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      {form.settings?.whatsapp_float_enabled && form.settings?.whatsapp_float_number && (
        <WhatsAppFloatButton
          phoneNumber={form.settings.whatsapp_float_number}
          message={form.settings.whatsapp_float_message}
          position="left"
        />
      )}
    </div>
  );
};

// Chat style renderer
const ChatRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>, partialLeadId?: string | null) => Promise<void>;
  isSubmitting: boolean;
  isEmbed?: boolean;
  onFieldComplete?: (fieldLabel: string, value: any) => void;
}> = ({ form, onSubmit, isSubmitting, isEmbed, onFieldComplete }) => {
  const [messages, setMessages] = useState<{ type: 'bot' | 'user'; text: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [isLeadCapturePhase, setIsLeadCapturePhase] = useState(
    !!(form.settings?.is_quiz_mode && form.settings?.collect_lead_before_quiz)
  );
  const customStyles = useCustomStyles(form);

  const fields = form.fields || [];

  useEffect(() => {
    if (fields[0]) {
      setMessages([{ type: 'bot', text: fields[0].label }]);
    }
  }, []);

  const handleSend = async () => {
    const currentField = fields[currentIndex];
    const error = validateField(currentField, inputValue);
    if (error) {
      toast({
        title: 'Atenção',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    setMessages((prev) => [...prev, { type: 'user', text: inputValue }]);
    const newAnswers = { ...answers, [currentField.label]: inputValue };
    setAnswers(newAnswers);
    
    // Save partial data
    if (onFieldComplete && inputValue.trim()) {
      onFieldComplete(currentField.label, inputValue);
    }
    
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

  if (isLeadCapturePhase) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center min-h-screen p-6")}
        style={{ ...customStyles, backgroundColor: 'var(--form-bg)', color: 'var(--form-text)' }}
      >
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-lg animate-in fade-in zoom-in duration-500">
           {form.settings?.logo_url && (
            <div className="flex justify-center mb-6">
               <img src={form.settings.logo_url} alt="Logo" className="object-contain w-auto max-w-full" style={{ height: `${form.settings?.logo_size || 48}px`, minHeight: `${form.settings?.logo_size || 48}px` }} />
            </div>
           )}

           <div className="text-center space-y-2">
             <h1 className="text-2xl font-bold">Identificação</h1>
             <p className="opacity-80">Preencha seus dados para iniciar.</p>
           </div>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Nome Completo</Label>
               <Input 
                 value={answers['name'] || ''} 
                 onChange={e => setAnswers({...answers, name: e.target.value})}
                 className="bg-background/50"
                 placeholder="Seu nome"
               />
             </div>
             <div className="space-y-2">
               <Label>E-mail</Label>
               <Input 
                 type="email"
                 value={answers['email'] || ''} 
                 onChange={e => setAnswers({...answers, email: e.target.value})}
                 className="bg-background/50"
                 placeholder="seu@email.com"
               />
             </div>
             <div className="space-y-2">
               <Label>Telefone / WhatsApp</Label>
               <MaskedInput
                 mask="phone"
                 value={answers['phone'] || ''}
                 onChange={val => setAnswers({...answers, phone: val})}
                 className="bg-background/50"
               />
             </div>
             
             <Button 
               className="w-full h-12 text-base mt-4"
               onClick={() => {
                 if(!answers['name'] || !answers['email']) {
                   toast({ title: "Atenção", description: "Nome e E-mail são obrigatórios.", variant: "destructive" });
                   return;
                 }
                 setIsLeadCapturePhase(false);
               }}
               style={{ backgroundColor: 'var(--form-primary)', color: 'var(--form-button-text)' }}
             >
               Começar <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
        </div>
      </div>
    );
  }

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
            className="mx-auto object-contain w-auto max-w-full mb-2"
            style={{ height: `${form.settings?.logo_size || 48}px`, minHeight: `${form.settings?.logo_size || 48}px` }}
          />
        )}
        <h1 className="text-lg font-semibold">{form.name}</h1>
        {form.description && (
          <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
        )}
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

      {/* Floating WhatsApp Button */}
      {form.settings?.whatsapp_float_enabled && form.settings?.whatsapp_float_number && (
        <WhatsAppFloatButton
          phoneNumber={form.settings.whatsapp_float_number}
          message={form.settings.whatsapp_float_message}
          position="left"
        />
      )}
    </div>
  );
};

// Link Bio style renderer
const LinkBioRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>, partialLeadId?: string | null) => Promise<void>;
  isSubmitting: boolean;
  isEmbed?: boolean;
  onFieldComplete?: (fieldLabel: string, value: any) => void;
}> = ({ form, onSubmit, isSubmitting, isEmbed, onFieldComplete }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLeadCapturePhase, setIsLeadCapturePhase] = useState(
    !!(form.settings?.is_quiz_mode && form.settings?.collect_lead_before_quiz)
  );
  const customStyles = useCustomStyles(form);
  const { checkWhatsApp, isChecking: isCheckingWA, checkResult: waCheckResult, resetCheck: resetWACheck } = useWhatsAppCheck(form.slug);
  
  const links = (form.fields || []).filter(f => f.type === 'link').sort((a, b) => a.order - b.order);
  const inputs = (form.fields || []).filter(f => f.type !== 'link').sort((a, b) => a.order - b.order);

  const handleChange = (label: string, value: any) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleBlur = (label: string, value: any) => {
    if (onFieldComplete && value && value.toString().trim()) {
      onFieldComplete(label, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    for (const field of inputs) {
      const value = formData[field.label];
      const error = validateField(field, value);
      
      if (error) {
        toast({
          title: 'Atenção',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      // Check WhatsApp before submit
      if (field.type === 'whatsapp' && value) {
        const digits = String(value).replace(/\D/g, '');
        if (digits.length >= 12) {
          const result = await checkWhatsApp(value);
          if (result && result.exists === false) {
            toast({
              title: 'Número inválido',
              description: `O número informado em "${field.label}" não possui WhatsApp.`,
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }
    
    if (form.settings?.is_quiz_mode) {
       let totalScore = 0;
       let totalPoints = 0;
       
       inputs.forEach(f => {
          totalPoints += (f.points || 0);
          const answer = formData[f.label];
          if (f.correct_answer && answer) {
             const userVal = Array.isArray(answer) ? [...answer].sort().join(',') : String(answer).trim();
             const correctVal = Array.isArray(f.correct_answer) ? [...f.correct_answer].sort().join(',') : String(f.correct_answer).trim();
             if (userVal.toLowerCase() === correctVal.toLowerCase()) {
                totalScore += (f.points || 0);
             }
          }
       });
       
       const percentage = totalPoints > 0 ? (totalScore / totalPoints) * 100 : 0;
       const passed = percentage >= (form.settings?.quiz_passing_score || 0);

       onSubmit({
           ...formData,
           _quiz_score: totalScore,
           _quiz_total: totalPoints,
           _quiz_percentage: percentage,
           _quiz_passed: passed
       });
    } else {
       onSubmit(formData);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.label] || '';
    const fieldId = `field-${field.id}`;

    // Reuse StandardRenderer logic logic for rendering inputs
    // We can copy the switch case here or extract it to a helper if we wanted to be DRY,
    // but for now, to avoid massive refactoring, I'll just handle basic inputs needed for lead capture.
    
    // Simplification: Support Text, Email, Phone, WhatsApp, Select
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleChange(field.label, e.target.value)}
            onBlur={(e) => handleBlur(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={isSubmitting}
            className="bg-background/50 border-input/50 focus:bg-background transition-colors"
          />
        );
      case 'whatsapp':
        return (
          <div>
            <MaskedInput
              id={fieldId}
              mask="whatsapp"
              value={value}
              onChange={(val) => { handleChange(field.label, val); resetWACheck(); }}
              onBlur={() => {
                handleBlur(field.label, value);
                const digits = String(value).replace(/\D/g, '');
                if (digits.length >= 12) checkWhatsApp(value);
              }}
              disabled={isSubmitting}
              className="bg-background/50 border-input/50 focus:bg-background transition-colors"
            />
            <WhatsAppCheckStatus isChecking={isCheckingWA} checkResult={waCheckResult} />
          </div>
        );
      case 'phone':
      case 'email':
        return (
          <MaskedInput
            id={fieldId}
            mask={field.type}
            value={value}
            onChange={(val) => handleChange(field.label, val)}
            onBlur={() => handleBlur(field.label, value)}
            disabled={isSubmitting}
            className="bg-background/50 border-input/50 focus:bg-background transition-colors"
          />
        );
      case 'select':
         return (
          <Select 
            value={value} 
            onValueChange={(val) => {
              handleChange(field.label, val);
              handleBlur(field.label, val);
            }}
          >
            <SelectTrigger id={fieldId} className="bg-background/50 border-input/50">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option, i) => (
                <SelectItem key={i} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            id={fieldId}
            value={value}
            onChange={(e) => handleChange(field.label, e.target.value)}
            onBlur={(e) => handleBlur(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={isSubmitting}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            className="bg-background/50 border-input/50 focus:bg-background transition-colors"
          />
        );
    }
  };

  if (isLeadCapturePhase) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center min-h-screen p-6")}
        style={{ ...customStyles, backgroundColor: 'var(--form-bg)', color: 'var(--form-text)' }}
      >
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-lg animate-in fade-in zoom-in duration-500">
           {form.settings?.logo_url && (
            <div className="flex justify-center mb-6">
               <img src={form.settings.logo_url} alt="Logo" className="object-contain w-auto max-w-full" style={{ height: `${form.settings?.logo_size || 48}px`, minHeight: `${form.settings?.logo_size || 48}px` }} />
            </div>
           )}

           <div className="text-center space-y-2">
             <h1 className="text-2xl font-bold">Identificação</h1>
             <p className="opacity-80">Preencha seus dados para iniciar.</p>
           </div>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Nome Completo</Label>
               <Input 
                 value={formData['name'] || ''} 
                 onChange={e => setFormData({...formData, name: e.target.value})}
                 className="bg-background/50"
                 placeholder="Seu nome"
               />
             </div>
             <div className="space-y-2">
               <Label>E-mail</Label>
               <Input 
                 type="email"
                 value={formData['email'] || ''} 
                 onChange={e => setFormData({...formData, email: e.target.value})}
                 className="bg-background/50"
                 placeholder="seu@email.com"
               />
             </div>
             <div className="space-y-2">
               <Label>Telefone / WhatsApp</Label>
               <MaskedInput
                 mask="phone"
                 value={formData['phone'] || ''}
                 onChange={val => setFormData({...formData, phone: val})}
                 className="bg-background/50"
               />
             </div>
             
             <Button 
               className="w-full h-12 text-base mt-4"
               onClick={() => {
                 if(!formData['name'] || !formData['email']) {
                   toast({ title: "Atenção", description: "Nome e E-mail são obrigatórios.", variant: "destructive" });
                   return;
                 }
                 setIsLeadCapturePhase(false);
               }}
               style={{ backgroundColor: 'var(--form-primary)', color: 'var(--form-button-text)' }}
             >
               Começar <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col items-center min-h-screen p-6",
        isEmbed ? "bg-transparent" : "bg-gradient-to-b from-[var(--form-bg)] to-muted/20"
      )}
      style={{ 
        ...customStyles, 
        backgroundColor: 'var(--form-bg)',
        color: 'var(--form-text)' 
      }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Profile / Header */}
        <div className="text-center space-y-4">
          {form.settings?.logo_url && (
            <div 
              className="mx-auto rounded-full overflow-hidden border-4 border-background shadow-xl"
              style={{ width: `${form.settings?.logo_size || 96}px`, height: `${form.settings?.logo_size || 96}px` }}
            >
              <img 
                src={form.settings.logo_url} 
                alt="Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{form.name}</h1>
            {form.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
        </div>

        {/* Links Section */}
        {links.length > 0 && (
          <div className="space-y-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.placeholder || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <div 
                  className="w-full p-4 rounded-xl flex items-center justify-center relative font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md min-h-[64px]"
                  style={{ 
                    backgroundColor: 'var(--form-primary)',
                    color: 'var(--form-button-text)'
                  }}
                >
                  {link.image_url && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg overflow-hidden bg-black/10 flex-shrink-0 border border-white/20">
                      <img 
                        src={link.image_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <span className={link.image_url ? "px-8" : ""}>{link.label}</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Lead Capture Form Section (if there are input fields) */}
        {inputs.length > 0 && (
          <div className="pt-8">
            <div className="rounded-2xl border bg-card/50 backdrop-blur-sm p-6 shadow-sm">
              <div className="mb-4 text-center">
                <h3 className="font-semibold text-lg">Entre em contato</h3>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {inputs.map((field) => (
                  <div key={field.id} className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">
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
        )}
        
        {/* Footer / Branding */}
        <div className="pt-8 pb-4 text-center text-xs text-muted-foreground opacity-50">
          Powered by FormFlow
        </div>
      </div>
      
      {/* Floating WhatsApp Button */}
      {form.settings?.whatsapp_float_enabled && form.settings?.whatsapp_float_number && (
        <WhatsAppFloatButton
          phoneNumber={form.settings.whatsapp_float_number}
          message={form.settings.whatsapp_float_message}
          position="left"
        />
      )}
    </div>
  );
};

// Standard form renderer - CENTRALIZED
const StandardRenderer: React.FC<{
  form: Form;
  onSubmit: (data: Record<string, any>, partialLeadId?: string | null) => Promise<void>;
  isSubmitting: boolean;
  isEmbed?: boolean;
  onFieldComplete?: (fieldLabel: string, value: any) => void;
}> = ({ form, onSubmit, isSubmitting, isEmbed, onFieldComplete }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  // Quiz & Lead Capture State
  const [isLeadCapturePhase, setIsLeadCapturePhase] = useState(
    !!(form.settings?.is_quiz_mode && form.settings?.collect_lead_before_quiz)
  );
  const customStyles = useCustomStyles(form);
  const { checkWhatsApp, isChecking: isCheckingWA, checkResult: waCheckResult, resetCheck: resetWACheck } = useWhatsAppCheck(form.slug);

  const handleChange = (label: string, value: any) => {
    setFormData((prev) => ({ ...prev, [label]: value }));
  };

  const handleBlur = (label: string, value: any) => {
    // Save partial data when field loses focus
    if (onFieldComplete && value && value.toString().trim()) {
      onFieldComplete(label, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const fields = form.fields || [];
    for (const field of fields) {
      const value = formData[field.label];
      const error = validateField(field, value);
      
      if (error) {
        toast({
          title: 'Atenção',
          description: error,
          variant: 'destructive',
        });
        // Find element and scroll to it
        const element = document.getElementById(`field-${field.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus();
        }
        return;
      }

      // Check WhatsApp before submit
      if (field.type === 'whatsapp' && value) {
        const digits = String(value).replace(/\D/g, '');
        if (digits.length >= 12) {
          const result = await checkWhatsApp(value);
          if (result && result.exists === false) {
            toast({
              title: 'Número inválido',
              description: `O número informado em "${field.label}" não possui WhatsApp.`,
              variant: 'destructive',
            });
            const element = document.getElementById(`field-${field.id}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.focus();
            }
            return;
          }
        }
      }
    }
    
    onSubmit(formData);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.label] || '';
    const fieldId = `field-${field.id}`;

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={fieldId}
            value={value}
            onChange={(e) => handleChange(field.label, e.target.value)}
            onBlur={(e) => handleBlur(field.label, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={isSubmitting}
            rows={4}
          />
        );
      case 'whatsapp':
        return (
          <div>
            <MaskedInput
              id={fieldId}
              mask="whatsapp"
              value={value}
              onChange={(val) => { handleChange(field.label, val); resetWACheck(); }}
              onBlur={() => {
                handleBlur(field.label, value);
                const digits = String(value).replace(/\D/g, '');
                if (digits.length >= 12) checkWhatsApp(value);
              }}
              disabled={isSubmitting}
            />
            <WhatsAppCheckStatus isChecking={isCheckingWA} checkResult={waCheckResult} />
          </div>
        );
      case 'phone':
        return (
          <MaskedInput
            id={fieldId}
            mask="phone"
            value={value}
            onChange={(val) => handleChange(field.label, val)}
            onBlur={() => handleBlur(field.label, value)}
            disabled={isSubmitting}
          />
        );
      case 'email':
        return (
          <MaskedInput
            id={fieldId}
            mask="email"
            value={value}
            onChange={(val) => handleChange(field.label, val)}
            onBlur={() => handleBlur(field.label, value)}
            disabled={isSubmitting}
          />
        );
      case 'select':
        return (
          <Select 
            value={value} 
            onValueChange={(val) => {
              handleChange(field.label, val);
              handleBlur(field.label, val);
            }}
          >
            <SelectTrigger id={fieldId}>
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
          <RadioGroup 
            id={fieldId}
            value={value} 
            onValueChange={(val) => {
              handleChange(field.label, val);
              handleBlur(field.label, val);
            }} 
            className="space-y-2"
          >
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
          <div className="space-y-2" id={fieldId} tabIndex={-1}>
            {(field.options || []).map((option, i) => (
              <label
                key={i}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked 
                      ? [...selectedValues, option]
                      : selectedValues.filter((v: string) => v !== option);
                    handleChange(field.label, newValues);
                    handleBlur(field.label, newValues);
                  }}
                  disabled={isSubmitting}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      case 'image_select':
        return (
          <div className="grid grid-cols-2 gap-3" id={fieldId}>
            {(field.options_with_images || []).map((option, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                   handleChange(field.label, option.value);
                   handleBlur(field.label, option.value);
                }}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-lg border text-left transition-all hover:bg-muted/50",
                  value === option.value ? "ring-2 ring-primary border-primary" : "border-input"
                )}
              >
                <div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
                   {option.image_url ? (
                     <img src={option.image_url} alt={option.label} className="w-full h-full object-cover" />
                   ) : (
                     <ImageIcon className="h-8 w-8 opacity-20" />
                   )}
                </div>
                <div className="p-2">
                  <div className="font-medium text-sm">{option.label}</div>
                  {option.description && <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>}
                </div>
              </button>
            ))}
          </div>
        );
      default:
        return (
          <Input
            id={fieldId}
            value={value}
            onChange={(e) => handleChange(field.label, e.target.value)}
            onBlur={(e) => handleBlur(field.label, e.target.value)}
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

  if (isLeadCapturePhase) {
    return (
      <div 
        className={cn("flex flex-col items-center justify-center min-h-screen p-6")}
        style={{ ...customStyles, backgroundColor: 'var(--form-bg)', color: 'var(--form-text)' }}
      >
        <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-xl border shadow-lg animate-in fade-in zoom-in duration-500">
           {form.settings?.logo_url && (
            <div className="flex justify-center mb-6">
              <img src={form.settings.logo_url} alt="Logo" className="object-contain w-auto max-w-full" style={{ height: `${form.settings?.logo_size || 48}px`, minHeight: `${form.settings?.logo_size || 48}px` }} />
            </div>
           )}

           <div className="text-center space-y-2">
             <h1 className="text-2xl font-bold">Identificação</h1>
             <p className="opacity-80">Preencha seus dados para iniciar.</p>
           </div>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Nome Completo</Label>
               <Input 
                 value={formData['name'] || ''} 
                 onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                 className="bg-background/50"
                 placeholder="Seu nome"
               />
             </div>
             <div className="space-y-2">
               <Label>E-mail</Label>
               <Input 
                 type="email"
                 value={formData['email'] || ''} 
                 onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                 className="bg-background/50"
                 placeholder="seu@email.com"
               />
             </div>
             <div className="space-y-2">
               <Label>Telefone / WhatsApp</Label>
               <MaskedInput
                 mask="phone"
                 value={formData['phone'] || ''}
                 onChange={val => setFormData(prev => ({ ...prev, phone: val }))}
                 className="bg-background/50"
               />
             </div>
             
             <Button 
               className="w-full h-12 text-base mt-4"
               onClick={() => {
                 if(!formData['name'] || !formData['email']) {
                   toast({ title: "Atenção", description: "Nome e E-mail são obrigatórios.", variant: "destructive" });
                   return;
                 }
                 setIsLeadCapturePhase(false);
               }}
               style={{ backgroundColor: 'var(--form-primary)', color: 'var(--form-button-text)' }}
             >
               Começar <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
           </div>
        </div>
      </div>
    );
  }

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
              className="object-contain w-auto max-w-full"
              style={{ height: `${form.settings?.logo_size || 48}px`, minHeight: `${form.settings?.logo_size || 48}px` }}
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

      {/* Floating WhatsApp Button */}
      {form.settings?.whatsapp_float_enabled && form.settings?.whatsapp_float_number && (
        <WhatsAppFloatButton
          phoneNumber={form.settings.whatsapp_float_number}
          message={form.settings.whatsapp_float_message}
          position="left"
        />
      )}
    </div>
  );
};

// Success screen - CENTRALIZED
const SuccessScreen: React.FC<{ 
  message?: string; 
  logoUrl?: string; 
  logoSize?: number;
  isEmbed?: boolean;
  downloadButtonText?: string;
  downloadButtonUrl?: string;
  primaryColor?: string;
  quizResult?: {
    score: number;
    total: number;
    passed: boolean;
    percentage: number;
  };
}> = ({ 
  message, 
  logoUrl, 
  logoSize,
  isEmbed,
  downloadButtonText,
  downloadButtonUrl,
  primaryColor,
  quizResult
}) => (
  <div className={cn(
    "flex items-center justify-center bg-gradient-to-br from-background to-muted p-4",
    isEmbed ? "min-h-full" : "min-h-screen"
  )}>
    <div className="text-center space-y-6">
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="mx-auto object-contain w-auto max-w-full mb-4"
          style={{ height: `${logoSize || 48}px`, minHeight: `${logoSize || 48}px` }}
        />
      )}
      
      {quizResult ? (
        <div className="space-y-4 animate-in zoom-in duration-500">
           <div className={cn(
             "mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4",
             quizResult.passed ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"
           )}>
             {quizResult.passed ? (
               <Check className="h-12 w-12 text-green-600" />
             ) : (
               <span className="text-4xl font-bold text-red-500">!</span>
             )}
           </div>
           
           <div>
             <h1 className={cn("text-3xl font-bold", quizResult.passed ? "text-green-600" : "text-red-600")}>
               {quizResult.passed ? 'Aprovado!' : 'Reprovado'}
             </h1>
             <div className="mt-2 text-xl font-medium text-muted-foreground">
               Você fez {quizResult.score} de {quizResult.total} pontos ({Math.round(quizResult.percentage)}%)
             </div>
           </div>
        </div>
      ) : (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-8 w-8 text-primary" />
        </div>
      )}
      
      <div className="space-y-2">
        {!quizResult && <h1 className="text-2xl font-bold">Obrigado!</h1>}
        <p className="text-muted-foreground max-w-md mx-auto">
          {message || 'Seu cadastro foi realizado com sucesso.'}
        </p>
      </div>

      {downloadButtonUrl && (
        <div className="pt-4">
          <Button 
            size="lg" 
            onClick={() => window.open(downloadButtonUrl, '_blank')}
            className="gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <ArrowRight className="h-4 w-4" />
            {downloadButtonText || 'Baixar Arquivo'}
          </Button>
        </div>
      )}
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
  const [quizResult, setQuizResult] = useState<{
    score: number;
    total: number;
    passed: boolean;
    percentage: number;
  } | undefined>(undefined);
  
  // Partial lead saving
  const { savePartialData, getPartialLeadId } = usePartialLead(slug || '');

  // Check if embed mode
  const isEmbed = searchParams.get('embed') === '1' || searchParams.get('embed') === 'true';

  // Inject custom head/body code for domain verification and Pixel
  useEffect(() => {
    if (!form?.settings) return;

    // Initialize Facebook Pixel if configured
    if (form.settings.facebook_pixel) {
      // @ts-ignore
      !function(f,b,e,v,n,t,s)
      // @ts-ignore
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      // @ts-ignore
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      // @ts-ignore
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      // @ts-ignore
      n.queue=[];t=b.createElement(e);t.async=!0;
      // @ts-ignore
      t.src=v;s=b.getElementsByTagName(e)[0];
      // @ts-ignore
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      
      // @ts-ignore
      window.fbq('init', form.settings.facebook_pixel);
      
      const eventId = generateUUID();
      // @ts-ignore
      window.fbq('track', 'PageView', {}, { eventID: eventId });
    }

    const { custom_head_code, custom_body_code } = form.settings;

    // Inject head code
    if (custom_head_code) {
      const headFragment = document.createRange().createContextualFragment(custom_head_code);
      const headElements = Array.from(headFragment.childNodes) as Element[];
      headElements.forEach((el) => {
        if (el.nodeType === Node.ELEMENT_NODE) {
          (el as Element).setAttribute('data-custom-head', 'true');
          document.head.appendChild(el);
        }
      });
    }

    // Inject body code
    if (custom_body_code) {
      const bodyContainer = document.createElement('div');
      bodyContainer.setAttribute('data-custom-body', 'true');
      bodyContainer.innerHTML = custom_body_code;
      document.body.appendChild(bodyContainer);
      
      // Execute scripts manually
      const scripts = bodyContainer.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
      });
    }

    // Cleanup on unmount
    return () => {
      document.querySelectorAll('[data-custom-head="true"]').forEach((el) => el.remove());
      document.querySelectorAll('[data-custom-body="true"]').forEach((el) => el.remove());
    };
  }, [form?.settings]);

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

  // Handle field completion for partial save
  const handleFieldComplete = (fieldLabel: string, value: any) => {
    savePartialData(fieldLabel, value);
  };

  const handleSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    
    // Extract quiz data if present
    if (data._quiz_score !== undefined) {
      setQuizResult({
        score: data._quiz_score,
        total: data._quiz_total,
        passed: data._quiz_passed,
        percentage: data._quiz_percentage
      });
    }
    
    try {
      // Prepare tracking data (Facebook CAPI)
      const tracking = {
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc'),
        event_id: generateUUID(),
      };

      // Fire Client-side Pixel
      if (form?.settings?.facebook_pixel) {
        // @ts-ignore
        if (window.fbq) {
           // @ts-ignore
           window.fbq('track', 'Lead', {
             content_name: form.name,
             content_category: 'Form Submission',
           }, { eventID: tracking.event_id });
        }
      }

      const response = await apiService.post(
        API_CONFIG.ENDPOINTS.SUBMIT_FORM(slug || ''),
        { 
          data,
          partial_lead_id: getPartialLeadId(), // Link to partial lead if exists
          tracking, // Send tracking data to backend
        }
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
        "flex flex-col items-center justify-center gap-3",
        isEmbed ? "min-h-full" : "min-h-screen"
      )}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">Carregando...</span>
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
        logoSize={displayForm.settings?.logo_size}
        isEmbed={isEmbed}
        downloadButtonText={displayForm.settings?.download_button_text}
        downloadButtonUrl={displayForm.settings?.download_button_url}
        primaryColor={displayForm.settings?.primary_color}
        quizResult={quizResult}
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
          onFieldComplete={handleFieldComplete}
        />
      );
    case 'chat':
      return (
        <ChatRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEmbed={isEmbed}
          onFieldComplete={handleFieldComplete}
        />
      );
    case 'link_bio':
      return (
        <LinkBioRenderer
          form={displayForm}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEmbed={isEmbed}
          onFieldComplete={handleFieldComplete}
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
          onFieldComplete={handleFieldComplete}
        />
      );
  }
};

export default PublicForm;
