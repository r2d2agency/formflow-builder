import React, { useState, useRef, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSystemSettings, useUpdateSystemSettings, useUploadLogo } from '@/hooks/useSystemSettings';
import { Palette, Upload, Building2, Save, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const BrandingPage: React.FC = () => {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();
  const uploadLogo = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    system_name: '',
    primary_color: '#1e40af',
    accent_color: '#3b82f6',
  });
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    if (settings) {
      setFormData({
        system_name: settings.system_name || 'FormBuilder',
        primary_color: settings.primary_color || '#1e40af',
        accent_color: settings.accent_color || '#3b82f6',
      });
      setLogoPreview(settings.system_logo_url || '');
    }
  }, [settings]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!logoPreview) return;
    await uploadLogo.mutateAsync(logoPreview);
  };

  const handleSaveSettings = async () => {
    await updateSettings.mutateAsync(formData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branding</h1>
          <p className="text-muted-foreground">
            Personalize a identidade visual do sistema
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Logo do Sistema
              </CardTitle>
              <CardDescription>
                Faça upload do logo da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full rounded-lg object-contain p-2"
                    />
                  ) : (
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Imagem
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG ou SVG. Máximo 2MB.
                  </p>
                </div>
              </div>
              {logoPreview && logoPreview !== settings?.system_logo_url && (
                <Button
                  onClick={handleSaveLogo}
                  disabled={uploadLogo.isPending}
                >
                  {uploadLogo.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Logo
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Name & Colors Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Nome e Cores
              </CardTitle>
              <CardDescription>
                Configure o nome e as cores do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system_name">Nome do Sistema</Label>
                <Input
                  id="system_name"
                  value={formData.system_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, system_name: e.target.value }))}
                  placeholder="FormBuilder"
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primary_color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="h-10 w-14 cursor-pointer rounded border"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">Cor de Destaque</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="accent_color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="h-10 w-14 cursor-pointer rounded border"
                    />
                    <Input
                      value={formData.accent_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, accent_color: e.target.value }))}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm font-medium">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-semibold">{formData.system_name || 'FormBuilder'}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    Botão Primário
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ borderColor: formData.accent_color, color: formData.accent_color }}
                  >
                    Botão Secundário
                  </Button>
                </div>
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                className="w-full"
              >
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default BrandingPage;
