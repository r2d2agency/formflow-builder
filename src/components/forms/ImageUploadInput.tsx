import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, ImageIcon, Loader2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import apiService from '@/services/api';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}

const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  placeholder = "URL da imagem",
  className,
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
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        // Upload to server
        const response = await apiService.post<{ url: string }>('/uploads/images', {
          file_base64: base64,
          filename: file.name,
          content_type: file.type
        });

        if (response.success && response.data) {
          onChange(response.data.url);
          toast({
            title: 'Sucesso',
            description: 'Imagem enviada com sucesso',
          });
        } else {
          toast({
            title: 'Erro no upload',
            description: response.error || 'Erro ao enviar imagem',
            variant: 'destructive',
          });
        }
        setIsUploading(false);
      };

      reader.onerror = () => {
        setIsUploading(false);
        toast({
          title: 'Erro',
          description: 'Não foi possível ler o arquivo',
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
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          disabled={isUploading}
        />
        {value && (
          <div className="absolute right-0 top-0 h-full flex items-center pr-2">
             <img 
               src={value} 
               alt="Preview" 
               className="h-6 w-6 object-cover rounded border bg-muted"
               onError={(e) => (e.currentTarget.style.display = 'none')} 
             />
          </div>
        )}
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        title="Enviar imagem"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploadInput;
