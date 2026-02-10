import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Trash2, Plus, X, Check, Upload } from 'lucide-react';
import ImageUploadInput from './ImageUploadInput';
import type { FormField } from '@/types';

const fieldTypes = [
  { value: 'text', label: 'Texto', hasPlaceholder: true },
  { value: 'email', label: 'Email', hasPlaceholder: true, defaultPlaceholder: 'seu@email.com' },
  { value: 'phone', label: 'Telefone', hasPlaceholder: true, defaultPlaceholder: '(00) 00000-0000' },
  { value: 'whatsapp', label: 'WhatsApp', hasPlaceholder: true, defaultPlaceholder: '+55 (00) 00000-0000' },
  { value: 'textarea', label: 'Texto Longo', hasPlaceholder: true },
  { value: 'number', label: 'Número', hasPlaceholder: true },
  { value: 'date', label: 'Data', hasPlaceholder: false },
  { value: 'select', label: 'Seleção (Dropdown)', hasPlaceholder: false, hasOptions: true },
  { value: 'radio', label: 'Múltipla Escolha', hasPlaceholder: false, hasOptions: true },
  { value: 'checkbox', label: 'Checkbox', hasPlaceholder: false, hasOptions: true },
  { value: 'image_select', label: 'Seleção com Imagem', hasPlaceholder: false, hasOptions: false, hasImageOptions: true },
  { value: 'link', label: 'Link / Botão', hasPlaceholder: true, defaultPlaceholder: 'https://...' },
];

interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties };
  isQuizMode?: boolean;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onUpdate, onRemove, dragHandleProps, isQuizMode }) => {
  const fieldTypeConfig = fieldTypes.find(t => t.value === field.type);
  const hasOptions = fieldTypeConfig?.hasOptions || false;
  const hasImageOptions = (fieldTypeConfig as any)?.hasImageOptions || false;
  const hasPlaceholder = fieldTypeConfig?.hasPlaceholder !== false;

  const handleTypeChange = (newType: string) => {
    const config = fieldTypes.find(t => t.value === newType);
    const updates: Partial<FormField> = { type: newType as FormField['type'] };

    // Set default label based on type
    if (field.label === 'Novo Campo' || !field.label) {
      updates.label = config?.label || 'Novo Campo';
    }

    // Set default placeholder based on type
    if (config?.defaultPlaceholder) {
      updates.placeholder = config.defaultPlaceholder;
    } else if (!config?.hasPlaceholder) {
      updates.placeholder = '';
    }

    // Initialize options for select/radio/checkbox
    if (config?.hasOptions && (!field.options || field.options.length === 0)) {
      updates.options = ['Opção 1', 'Opção 2', 'Opção 3'];
    }
    
    // Initialize image options
    if ((config as any)?.hasImageOptions && (!field.options_with_images || field.options_with_images.length === 0)) {
      updates.options_with_images = [
        { label: 'Opção 1', value: 'Opção 1', image_url: 'https://via.placeholder.com/150', description: 'Descrição 1' },
        { label: 'Opção 2', value: 'Opção 2', image_url: 'https://via.placeholder.com/150', description: 'Descrição 2' }
      ];
      // Sync basic options too
      updates.options = ['Opção 1', 'Opção 2'];
    }

    // Clear options for non-option types
    if (!config?.hasOptions && !(config as any)?.hasImageOptions) {
      updates.options = undefined;
      updates.options_with_images = undefined;
    }

    onUpdate(updates);
  };

  const handleAddOption = () => {
    const currentOptions = field.options || [];
    const newOption = `Opção ${currentOptions.length + 1}`;
    onUpdate({ options: [...currentOptions, newOption] });
  };

  const handleAddImageOption = () => {
    const currentOptions = field.options_with_images || [];
    const num = currentOptions.length + 1;
    const newOption = { 
        label: `Opção ${num}`, 
        value: `Opção ${num}`, 
        image_url: 'https://via.placeholder.com/150',
        description: '' 
    };
    const newBasicOptions = [...(field.options || []), newOption.value];
    onUpdate({ 
        options_with_images: [...currentOptions, newOption],
        options: newBasicOptions 
    });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const currentOptions = [...(field.options || [])];
    currentOptions[index] = value;
    onUpdate({ options: currentOptions });
  };
  
  const handleUpdateImageOption = (index: number, updates: any) => {
    const currentOptions = [...(field.options_with_images || [])];
    currentOptions[index] = { ...currentOptions[index], ...updates };
    
    // Sync basic options
    const currentBasicOptions = [...(field.options || [])];
    if (updates.value && index < currentBasicOptions.length) {
        currentBasicOptions[index] = updates.value;
    }
    
    onUpdate({ 
        options_with_images: currentOptions,
        options: currentBasicOptions
    });
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = [...(field.options || [])];
    currentOptions.splice(index, 1);
    onUpdate({ options: currentOptions });
  };

  const handleRemoveImageOption = (index: number) => {
    const currentOptions = [...(field.options_with_images || [])];
    currentOptions.splice(index, 1);
    
    const currentBasicOptions = [...(field.options || [])];
    currentBasicOptions.splice(index, 1);
    
    onUpdate({ 
        options_with_images: currentOptions,
        options: currentBasicOptions
    });
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4 bg-background">
      <div 
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors select-none"
        {...dragHandleProps}
        style={{ touchAction: 'none', ...dragHandleProps?.style }}
      >
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="flex-1 space-y-4">
        {/* Main row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo do Campo</Label>
            <Select value={field.type} onValueChange={handleTypeChange}>
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
            <Label>{field.type === 'link' ? 'Texto do Botão' : 'Rótulo (Label)'}</Label>
            <Input
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder={field.type === 'link' ? 'Ex: Meu Site' : 'Ex: Nome completo'}
            />
          </div>
        </div>

        {/* Second row */}
        <div className="grid gap-4 sm:grid-cols-2">
          {hasPlaceholder && (
            <div className="space-y-2">
              <Label>{field.type === 'link' ? 'URL de Destino' : 'Placeholder'}</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder={field.type === 'link' ? 'https://exemplo.com.br' : 'Ex: Digite seu nome...'}
              />
            </div>
          )}
          
          <div className="flex items-center gap-4 pt-8">
            {field.type !== 'link' && (
              <div className="flex items-center space-x-2">
                <Switch
                  id={`required-${field.id}`}
                  checked={field.required}
                  onCheckedChange={(checked) => onUpdate({ required: checked })}
                />
                <Label htmlFor={`required-${field.id}`}>Obrigatório</Label>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Options section for select/radio/checkbox */}
        {hasOptions && (
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Opções {field.type === 'select' ? '(Dropdown)' : field.type === 'radio' ? '(Escolha única)' : '(Múltipla escolha)'}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
              >
                <Plus className="mr-1 h-3 w-3" />
                Adicionar
              </Button>
            </div>
            
            <div className="space-y-2">
              {(field.options || []).map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs text-muted-foreground">
                    {index + 1}.
                  </span>
                  <Input
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1"
                  />
                  {isQuizMode && (field.type === 'radio' || field.type === 'select') && (
                    <Button
                      type="button"
                      variant={field.correct_answer === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => onUpdate({ correct_answer: option })}
                      title="Marcar como resposta correta"
                    >
                      <Check className={field.correct_answer === option ? "h-4 w-4" : "h-4 w-4 text-muted-foreground"} />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    disabled={(field.options || []).length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Options section */}
        {hasImageOptions && (
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
             <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Opções com Imagem
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddImageOption}
              >
                <Plus className="mr-1 h-3 w-3" />
                Adicionar
              </Button>
            </div>

            <div className="space-y-4">
              {(field.options_with_images || []).map((option, index) => (
                <div key={index} className="flex flex-col gap-3 p-3 border rounded-md bg-background">
                   <div className="flex items-center gap-2">
                      <span className="w-6 text-center text-xs text-muted-foreground">{index + 1}.</span>
                      <Input
                        value={option.label}
                        onChange={(e) => handleUpdateImageOption(index, { label: e.target.value, value: e.target.value })}
                        placeholder="Título da opção"
                        className="flex-1 font-medium"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveImageOption(index)}
                        disabled={(field.options_with_images || []).length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                   </div>
                   <div className="pl-8 grid gap-2">
                      <ImageUploadInput
                        value={option.image_url || ''}
                        onChange={(url) => handleUpdateImageOption(index, { image_url: url })}
                        placeholder="URL da Imagem ou Upload"
                        className="text-xs"
                      />
                      <Input
                        value={option.description || ''}
                        onChange={(e) => handleUpdateImageOption(index, { description: e.target.value })}
                        placeholder="Descrição curta (opcional)"
                        className="text-xs"
                      />
                   </div>
                   {isQuizMode && (
                      <div className="pl-8 flex items-center gap-2">
                        <Button
                          type="button"
                          variant={field.correct_answer === option.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => onUpdate({ correct_answer: option.value })}
                          className="h-7 text-xs"
                          title="Marcar como resposta correta"
                        >
                          <Check className={field.correct_answer === option.value ? "mr-1 h-3 w-3" : "mr-1 h-3 w-3 text-muted-foreground"} />
                          {field.correct_answer === option.value ? "Resposta Correta" : "Marcar como Correta"}
                        </Button>
                      </div>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quiz Settings */}
        {isQuizMode && (
          <div className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/50 p-4">
             <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                <Label className="text-sm font-semibold text-yellow-700 dark:text-yellow-500">Configurações do Quiz</Label>
             </div>
             
             <div className="grid gap-4 sm:grid-cols-2">
               <div className="space-y-2">
                  <Label>Pontos</Label>
                  <Input 
                    type="number" 
                    value={field.points || 0} 
                    onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 0 })}
                    className="bg-background"
                  />
               </div>
               
               {/* For non-option fields, we might want a text input for correct answer, or just skip it for now as it's harder to validate */}
               {!hasOptions && (
                 <div className="space-y-2">
                    <Label>Resposta Correta (Exata)</Label>
                    <Input 
                      value={typeof field.correct_answer === 'string' ? field.correct_answer : ''} 
                      onChange={(e) => onUpdate({ correct_answer: e.target.value })}
                      placeholder="Resposta esperada"
                      className="bg-background"
                    />
                 </div>
               )}
             </div>

             <div className="space-y-2">
                <Label>Mensagem de Acerto (Opcional)</Label>
                <Input 
                  value={field.feedback_correct || ''} 
                  onChange={(e) => onUpdate({ feedback_correct: e.target.value })}
                  placeholder="Ex: Muito bem! Você acertou."
                  className="bg-background"
                />
             </div>
             <div className="space-y-2">
                <Label>Mensagem de Erro (Opcional)</Label>
                <Input 
                  value={field.feedback_incorrect || ''} 
                  onChange={(e) => onUpdate({ feedback_incorrect: e.target.value })}
                  placeholder="Ex: Que pena, a resposta correta era..."
                  className="bg-background"
                />
             </div>
          </div>
        )}

        {/* Field-specific hints */}
        {field.type === 'whatsapp' && (
          <p className="text-xs text-muted-foreground">
            💡 O campo já inclui código do Brasil (+55) e máscara automática
          </p>
        )}
        {field.type === 'email' && (
          <p className="text-xs text-muted-foreground">
            💡 Validação de email aplicada automaticamente
          </p>
        )}
        {field.type === 'phone' && (
          <p className="text-xs text-muted-foreground">
            💡 Máscara de telefone brasileiro aplicada automaticamente
          </p>
        )}
      </div>
    </div>
  );
};

export default FieldEditor;
