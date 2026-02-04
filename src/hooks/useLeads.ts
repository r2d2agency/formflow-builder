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
    mutationFn: async ({ formId, format = 'excel' }: { formId?: string; format?: 'csv' | 'excel' }) => {
      const endpoint = format === 'excel' 
        ? `${API_CONFIG.ENDPOINTS.LEADS}/export/excel${formId ? `?form_id=${formId}` : ''}`
        : `${API_CONFIG.ENDPOINTS.LEADS}/export/csv${formId ? `?form_id=${formId}` : ''}`;
      
      // For file download, we need to handle it differently
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao exportar leads');
      }
      
      // Get the blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'excel' ? 'leads.csv' : 'leads.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: 'Exportação concluída',
        description: 'O arquivo foi baixado com sucesso.',
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
