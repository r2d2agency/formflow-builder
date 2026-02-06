import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { Form, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useForms = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ['forms', page, limit],
    queryFn: async () => {
      const response = await apiService.get<PaginatedResponse<Form>>(
        `${API_CONFIG.ENDPOINTS.FORMS}?page=${page}&limit=${limit}`
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
};

export const useForm = (id: string) => {
  return useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const response = await apiService.get<Form>(
        API_CONFIG.ENDPOINTS.FORM_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!id,
  });
};

export const useFormBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['form-slug', slug],
    queryFn: async () => {
      const response = await apiService.get<Form>(
        API_CONFIG.ENDPOINTS.FORM_BY_SLUG(slug)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 min cache
    gcTime: 1000 * 60 * 10, // 10 min garbage collection
    retry: 1, // Retry only once for faster feedback
    retryDelay: 500,
  });
};

export const useCreateForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Form>) => {
      const response = await apiService.post<Form>(
        API_CONFIG.ENDPOINTS.FORMS,
        data
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Formulário criado',
        description: 'O formulário foi criado com sucesso.',
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

export const useImportForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Form>) => {
      const response = await apiService.post<Form>(
        API_CONFIG.ENDPOINTS.FORM_IMPORT,
        data
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Formulário importado',
        description: 'O formulário foi importado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const exportForm = async (id: string, fileName: string) => {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.FORM_EXPORT(id)}`, 
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      }
    );

    if (!response.ok) {
      throw new Error('Falha ao exportar formulário');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export error:', error);
    toast({
      title: 'Erro na exportação',
      description: 'Não foi possível exportar o formulário.',
      variant: 'destructive',
    });
  }
};

export const useUpdateForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Form> }) => {
      const response = await apiService.put<Form>(
        API_CONFIG.ENDPOINTS.FORM_BY_ID(id),
        data
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', variables.id] });
      toast({
        title: 'Formulário atualizado',
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

export const useDeleteForm = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(
        API_CONFIG.ENDPOINTS.FORM_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Formulário excluído',
        description: 'O formulário foi excluído com sucesso.',
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
