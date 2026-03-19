import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Shuffle, Tag, TriangleAlert } from 'lucide-react';
import {
  getWhatsAppTemplatesEndpointUnavailableMessage,
  isWhatsAppTemplatesEndpointUnavailable,
  useWhatsAppTemplates,
  useWhatsAppTemplateCategories,
  type WhatsAppTemplate,
} from '@/hooks/useWhatsAppTemplates';

interface WhatsAppTemplateSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const WhatsAppTemplateSelector: React.FC<WhatsAppTemplateSelectorProps> = ({
  selectedIds,
  onChange,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('');
  const { data: templates = [], isLoading } = useWhatsAppTemplates(
    filterCategory && filterCategory !== 'all' ? filterCategory : undefined
  );
  const { data: categories = [] } = useWhatsAppTemplateCategories();
  const templatesEndpointUnavailable = isWhatsAppTemplatesEndpointUnavailable();
  const templatesEndpointMessage = getWhatsAppTemplatesEndpointUnavailableMessage();

  const toggleTemplate = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-base font-medium">Mensagens Salvas</Label>
          <p className="text-xs text-muted-foreground">
            Selecione uma ou mais mensagens. Se múltiplas, uma será escolhida aleatoriamente para cada lead.
          </p>
        </div>
        {selectedCount > 0 && (
          <Badge variant="default" className="flex items-center gap-1">
            {selectedCount > 1 && <Shuffle className="h-3 w-3" />}
            {selectedCount} selecionada(s)
          </Badge>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
      ) : templates.length === 0 ? (
        <div className="text-center py-6 border rounded-lg border-dashed">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma mensagem salva</p>
          <Button variant="link" size="sm" onClick={() => window.open('/admin/whatsapp-templates', '_blank')}>
            Criar mensagens
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {templates.map((template) => {
            const msg = typeof template.message === 'string'
              ? JSON.parse(template.message)
              : template.message;
            const itemCount = msg?.items?.length || 0;
            const isSelected = selectedIds.includes(template.id);

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                }`}
                onClick={() => toggleTemplate(template.id)}
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{template.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {template.category && (
                        <Badge variant="outline" className="text-xs py-0">
                          {template.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {itemCount} item(s)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCount > 1 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Shuffle className="h-4 w-4 text-primary" />
          <p className="text-sm text-primary">
            Uma mensagem aleatória será enviada para cada lead
          </p>
        </div>
      )}
    </div>
  );
};

export default WhatsAppTemplateSelector;
