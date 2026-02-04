import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LogoUploaderProps {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  label?: string;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({
  value,
  onChange,
  label = 'Logo do Formulário',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onChange(base64);
        setIsUploading(false);
        toast({
          title: 'Logo enviada',
          description: 'A logo foi carregada com sucesso',
        });
      };
      reader.onerror = () => {
        setIsUploading(false);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a imagem',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: 'Erro',
        description: 'Erro ao processar a imagem',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = () => {
    onChange(undefined);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {value ? (
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={value}
              alt="Logo"
              className="h-16 w-auto max-w-[200px] object-contain rounded border bg-white p-1"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Alterar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
            >
              <Trash2 className="mr-2 h-4 w-4 text-destructive" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {isUploading ? 'Enviando...' : 'Clique para enviar uma logo'}
          </p>
          <p className="text-xs text-muted-foreground">PNG, JPG até 2MB</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default LogoUploader;
