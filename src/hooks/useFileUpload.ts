import { useState } from 'react';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { toast } from '@/hooks/use-toast';

interface UploadResult {
  url: string;
  filename: string;
  original_filename: string;
  content_type: string;
}

type UploadType = 'logos' | 'audio' | 'video' | 'documents';

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadFile = async (
    file: File,
    type: UploadType
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(10);

    try {
      const base64 = await fileToBase64(file);
      setProgress(50);

      const response = await apiService.post<UploadResult>(
        API_CONFIG.ENDPOINTS.UPLOAD(type),
        {
          file_base64: base64,
          filename: file.name,
          content_type: file.type,
        }
      );

      setProgress(100);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro ao fazer upload');
      }

      return response.data;
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message || 'Não foi possível fazer upload do arquivo',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const uploadLogo = (file: File) => uploadFile(file, 'logos');
  const uploadAudio = (file: File) => uploadFile(file, 'audio');
  const uploadVideo = (file: File) => uploadFile(file, 'video');
  const uploadDocument = (file: File) => uploadFile(file, 'documents');

  return {
    isUploading,
    progress,
    uploadFile,
    uploadLogo,
    uploadAudio,
    uploadVideo,
    uploadDocument,
  };
};
