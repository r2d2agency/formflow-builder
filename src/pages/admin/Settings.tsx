import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Save, Server, Key } from 'lucide-react';

const Settings: React.FC = () => {
  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem('api_url') || 'http://localhost:3001/api'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveApiUrl = () => {
    setIsSaving(true);
    localStorage.setItem('api_url', apiUrl);
    
    // In a real app, you'd also update the env variable
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: 'Configurações salvas',
        description: 'A URL da API foi atualizada. Recarregue a página para aplicar.',
      });
    }, 500);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Configure as opções do sistema
          </p>
        </div>

        <Tabs defaultValue="api" className="space-y-6">
          <TabsList>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="general">Geral</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-6">
            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Configuração da API
                </CardTitle>
                <CardDescription>
                  Configure a URL do seu backend Easypanel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api_url">URL da API</Label>
                  <Input
                    id="api_url"
                    placeholder="https://api.meusite.com/api"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL base do seu backend. Exemplo: https://api.meusite.com/api
                  </p>
                </div>
                <Button onClick={handleSaveApiUrl} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </CardContent>
            </Card>

            {/* API Documentation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Documentação da API
                </CardTitle>
                <CardDescription>
                  Endpoints necessários no seu backend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-4 text-sm font-mono space-y-2 overflow-x-auto">
                  <p className="text-muted-foreground"># Autenticação</p>
                  <p>POST /api/auth/login</p>
                  <p>POST /api/auth/logout</p>
                  <p>GET  /api/auth/me</p>
                  <br />
                  <p className="text-muted-foreground"># Formulários</p>
                  <p>GET    /api/forms</p>
                  <p>GET    /api/forms/:id</p>
                  <p>GET    /api/forms/slug/:slug</p>
                  <p>POST   /api/forms</p>
                  <p>PUT    /api/forms/:id</p>
                  <p>DELETE /api/forms/:id</p>
                  <br />
                  <p className="text-muted-foreground"># Leads</p>
                  <p>GET    /api/leads</p>
                  <p>GET    /api/leads/form/:formId</p>
                  <p>GET    /api/leads/:id</p>
                  <p>DELETE /api/leads/:id</p>
                  <p>GET    /api/leads/export</p>
                  <br />
                  <p className="text-muted-foreground"># Evolution API</p>
                  <p>GET    /api/evolution-instances</p>
                  <p>POST   /api/evolution-instances</p>
                  <p>PUT    /api/evolution-instances/:id</p>
                  <p>DELETE /api/evolution-instances/:id</p>
                  <p>POST   /api/evolution-instances/:id/test</p>
                  <br />
                  <p className="text-muted-foreground"># Dashboard</p>
                  <p>GET    /api/dashboard/stats</p>
                  <br />
                  <p className="text-muted-foreground"># Submissão pública</p>
                  <p>POST   /api/public/forms/:slug/submit</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>
                  Outras configurações do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configurações adicionais serão adicionadas em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Settings;
