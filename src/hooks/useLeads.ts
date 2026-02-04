import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { Lead, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useLeads = (page = 1, limit = 20, formId?: string) => {
  return useQuery({
    queryKey: ['leads', page, limit, formId],
    queryFn: async () => {
      const endpoint = formId
        ? `${API_CONFIG.ENDPOINTS.LEADS_BY_FORM(formId)}?page=${page}&limit=${limit}`
        : `${API_CONFIG.ENDPOINTS.LEADS}?page=${page}&limit=${limit}`;
      
      const response = await apiService.get<PaginatedResponse<Lead>>(endpoint);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
};

export const useLead = (id: string) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const response = await apiService.get<Lead>(
        API_CONFIG.ENDPOINTS.LEAD_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!id,
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiService.delete(
        API_CONFIG.ENDPOINTS.LEAD_BY_ID(id)
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Lead excluído',
        description: 'O lead foi excluído com sucesso.',
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

export const useExportLeads = () => {
  return useMutation({
    mutationFn: async (formId?: string) => {
      const endpoint = formId
        ? `${API_CONFIG.ENDPOINTS.LEADS_BY_FORM(formId)}/export`
        : `${API_CONFIG.ENDPOINTS.LEADS}/export`;
      
      const response = await apiService.get<{ url: string }>(endpoint);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      toast({
        title: 'Exportação iniciada',
        description: 'O download começará em instantes.',
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
