import React from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Webhook } from 'lucide-react';

const WebhooksPage: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure integrações de webhook para seus formulários
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Configuração de Webhooks
            </CardTitle>
            <CardDescription>
              Os webhooks são configurados individualmente por formulário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Para configurar um webhook, acesse o formulário desejado e vá até a aba "Integrações".
              Lá você pode ativar o webhook e definir a URL de destino.
            </p>
            <div className="mt-4 rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Formato do payload enviado:</p>
              <pre className="mt-2 text-xs overflow-x-auto">
{`{
  "form_id": "abc123",
  "form_name": "Formulário de Contato",
  "lead_id": "lead123",
  "data": {
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999998888"
  },
  "submitted_at": "2024-01-15T10:30:00Z"
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default WebhooksPage;
