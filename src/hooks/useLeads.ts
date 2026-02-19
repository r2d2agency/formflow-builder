import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { Lead, PaginatedResponse } from '@/types';
import { toast } from '@/hooks/use-toast';

export const useLeads = (page = 1, limit = 20, formId?: string, startDate?: Date, endDate?: Date, showPartial = false) => {
  return useQuery({
    queryKey: ['leads', page, limit, formId, startDate, endDate, showPartial],
    queryFn: async () => {
      let endpoint = formId
        ? `${API_CONFIG.ENDPOINTS.LEADS_BY_FORM(formId)}?page=${page}&limit=${limit}`
        : `${API_CONFIG.ENDPOINTS.LEADS}?page=${page}&limit=${limit}`;
      
      if (startDate) endpoint += `&start_date=${startDate.toISOString()}`;
      if (endDate) endpoint += `&end_date=${endDate.toISOString()}`;
      if (showPartial) endpoint += `&show_partial=true`;
      
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

export const useBulkDeleteLeads = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, delete_all, filters }: { ids?: string[]; delete_all?: boolean; filters?: any }) => {
      const response = await apiService.delete(
        `${API_CONFIG.ENDPOINTS.LEADS}/bulk`,
        { ids, delete_all, filters }
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Leads excluídos',
        description: 'Os leads foram excluídos com sucesso.',
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
    mutationFn: async ({ formId, format = 'excel', startDate, endDate, showPartial, search }: { 
      formId?: string; 
      format?: 'csv' | 'excel';
      startDate?: string;
      endDate?: string;
      showPartial?: boolean;
      search?: string;
    }) => {
      const params = new URLSearchParams();
      if (formId) params.append('form_id', formId);
      if (startDate) params.append('start_date', new Date(startDate).toISOString());
      if (endDate) params.append('end_date', new Date(endDate + 'T23:59:59').toISOString());
      if (showPartial) params.append('show_partial', 'true');
      if (search) params.append('search', search);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const endpoint = format === 'excel' 
        ? `${API_CONFIG.ENDPOINTS.LEADS}/export/excel${queryString}`
        : `${API_CONFIG.ENDPOINTS.LEADS}/export/csv${queryString}`;
      
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao exportar leads');
      }
      
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
