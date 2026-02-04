import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { toast } from '@/hooks/use-toast';

export interface SystemSettings {
  system_name: string;
  system_logo_url: string;
  primary_color: string;
  accent_color: string;
}

export const useSystemSettings = () => {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await apiService.get<SystemSettings>(API_CONFIG.ENDPOINTS.SETTINGS);
      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar configurações');
      }
      return response.data as SystemSettings;
    },
  });
};

export const useUpdateSystemSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<SystemSettings>) => {
      const response = await apiService.put<SystemSettings>(API_CONFIG.ENDPOINTS.SETTINGS, settings);
      if (!response.success) {
        throw new Error(response.error || 'Erro ao atualizar configurações');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: 'Sucesso',
        description: 'Configurações atualizadas com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUploadLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logo_base64: string) => {
      const response = await apiService.post<{ logo_url: string }>(
        API_CONFIG.ENDPOINTS.SETTINGS_UPLOAD_LOGO,
        { logo_base64 }
      );
      if (!response.success) {
        throw new Error(response.error || 'Erro ao fazer upload do logo');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast({
        title: 'Sucesso',
        description: 'Logo atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
