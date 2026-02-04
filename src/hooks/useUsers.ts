import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { User, CreateUserPayload, UpdateUserPayload, ChangePasswordPayload, ApiResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.get<User[]>(API_CONFIG.ENDPOINTS.USERS);
      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar usuários');
      }
      return response.data || [];
    },
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await apiService.get<User>(API_CONFIG.ENDPOINTS.USER_BY_ID(id));
      if (!response.success) {
        throw new Error(response.error || 'Erro ao buscar usuário');
      }
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserPayload) => {
      const response = await apiService.post<User>(API_CONFIG.ENDPOINTS.USERS, data);
      if (!response.success) {
        throw new Error(response.error || 'Erro ao criar usuário');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso.',
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

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserPayload }) => {
      const response = await apiService.put<User>(API_CONFIG.ENDPOINTS.USER_BY_ID(id), data);
      if (!response.success) {
        throw new Error(response.error || 'Erro ao atualizar usuário');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso.',
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

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChangePasswordPayload }) => {
      const response = await apiService.put<{ message: string }>(
        API_CONFIG.ENDPOINTS.USER_PASSWORD(id),
        data
      );
      if (!response.success) {
        throw new Error(response.error || 'Erro ao alterar senha');
      }
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Senha alterada com sucesso.',
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

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(API_CONFIG.ENDPOINTS.USER_BY_ID(id));
      if (!response.success) {
        throw new Error(response.error || 'Erro ao excluir usuário');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso.',
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
