import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { EvolutionInstance } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useEvolutionInstances = () => {
  return useQuery({
    queryKey: ['evolution-instances'],
    queryFn: async () => {
      const response = await apiService.get<EvolutionInstance[]>(
        API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
};

export const useEvolutionInstance = (id: string) => {
  return useQuery({
    queryKey: ['evolution-instance', id],
    queryFn: async () => {
      const response = await apiService.get<EvolutionInstance>(
        API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCE_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateEvolutionInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<EvolutionInstance>) => {
      const response = await apiService.post<EvolutionInstance>(
        API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCES,
        data
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
      toast({
        title: 'Instância criada',
        description: 'A instância Evolution foi criada com sucesso.',
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

export const useUpdateEvolutionInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EvolutionInstance> }) => {
      const response = await apiService.put<EvolutionInstance>(
        API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCE_BY_ID(id),
        data
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
      queryClient.invalidateQueries({ queryKey: ['evolution-instance', variables.id] });
      toast({
        title: 'Instância atualizada',
        description: 'As alterações foram salvas com sucesso.',
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

export const useDeleteEvolutionInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(
        API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCE_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
      toast({
        title: 'Instância excluída',
        description: 'A instância Evolution foi excluída com sucesso.',
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

export const useTestEvolutionInstance = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.post<{ success: boolean }>(
        `${API_CONFIG.ENDPOINTS.EVOLUTION_INSTANCE_BY_ID(id)}/test`,
        {}
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Conexão OK',
        description: 'A instância Evolution está funcionando corretamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro de conexão',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
