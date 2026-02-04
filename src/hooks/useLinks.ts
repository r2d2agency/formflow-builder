import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { ShortLink, ShortLinkWithStats, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useLinks = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['links', page, limit],
    queryFn: async () => {
      const response = await apiService.get<PaginatedResponse<ShortLink>>(
        `${API_CONFIG.ENDPOINTS.LINKS}?page=${page}&limit=${limit}`
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
};

export const useLink = (id: string) => {
  return useQuery({
    queryKey: ['link', id],
    queryFn: async () => {
      const response = await apiService.get<ShortLinkWithStats>(
        API_CONFIG.ENDPOINTS.LINK_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ShortLink>) => {
      const response = await apiService.post<ShortLink>(
        API_CONFIG.ENDPOINTS.LINKS,
        data
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast({
        title: 'Link criado',
        description: 'O link foi encurtado com sucesso.',
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

export const useUpdateLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ShortLink> }) => {
      const response = await apiService.put<ShortLink>(
        API_CONFIG.ENDPOINTS.LINK_BY_ID(id),
        data
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link', variables.id] });
      toast({
        title: 'Link atualizado',
        description: 'As alterações foram salvas.',
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

export const useDeleteLink = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(
        API_CONFIG.ENDPOINTS.LINK_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast({
        title: 'Link excluído',
        description: 'O link foi removido.',
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
