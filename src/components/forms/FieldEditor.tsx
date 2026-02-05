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
import { GripVertical, Trash2, Plus, X } from 'lucide-react';
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
];

interface FieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties };
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onUpdate, onRemove, dragHandleProps }) => {
  const fieldTypeConfig = fieldTypes.find(t => t.value === field.type);
  const hasOptions = fieldTypeConfig?.hasOptions || false;
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

    // Clear options for non-option types
    if (!config?.hasOptions) {
      updates.options = undefined;
    }

    onUpdate(updates);
  };

  const handleAddOption = () => {
    const currentOptions = field.options || [];
    const newOption = `Opção ${currentOptions.length + 1}`;
    onUpdate({ options: [...currentOptions, newOption] });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const currentOptions = [...(field.options || [])];
    currentOptions[index] = value;
    onUpdate({ options: currentOptions });
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = [...(field.options || [])];
    currentOptions.splice(index, 1);
    onUpdate({ options: currentOptions });
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={field.type}
              onValueChange={handleTypeChange}
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
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder="Nome do campo"
            />
          </div>
          
          {hasPlaceholder && (
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder={fieldTypeConfig?.defaultPlaceholder || 'Texto de exemplo'}
              />
            </div>
          )}
          
          <div className="flex items-end gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(v) => onUpdate({ required: v })}
              />
              <Label>Obrigatório</Label>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    disabled={(field.options || []).length <= 1}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              
              {(field.options || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhuma opção cadastrada. Clique em "Adicionar" para criar opções.
                </p>
              )}
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
