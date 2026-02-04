import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Trash2, ImageIcon } from 'lucide-react';
import { useFileUpload } from '@/hooks/useFileUpload';

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
  const { isUploading, uploadLogo } = useFileUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadLogo(file);
    if (result) {
      onChange(result.url);
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
              <Upload className="mr-2 h-4 w-4" />
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
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
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
