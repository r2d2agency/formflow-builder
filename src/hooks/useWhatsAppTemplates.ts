import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '@/services/api';

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string | null;
  message: any; // WhatsAppMessage structure
  created_by: string;
  created_at: string;
  updated_at: string;
}

let templatesEndpointUnavailable = false;

const isMissingTemplatesEndpoint = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes('404') || message.includes('not found') || message.includes('html');
};

const markTemplatesEndpointUnavailable = () => {
  templatesEndpointUnavailable = true;
};

const getTemplatesQueryOptions = () => ({
  enabled: !templatesEndpointUnavailable,
  retry: false,
  staleTime: 1000 * 60 * 60,
  gcTime: 1000 * 60 * 60,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

export const useWhatsAppTemplates = (category?: string) => {
  return useQuery({
    queryKey: ['whatsapp-templates', category],
    ...getTemplatesQueryOptions(),
    queryFn: async () => {
      const endpoint = category
        ? `/whatsapp-templates?category=${encodeURIComponent(category)}`
        : '/whatsapp-templates';
      const res = await apiService.get<WhatsAppTemplate[]>(endpoint);
      if (!res.success) {
        if (isMissingTemplatesEndpoint(new Error(res.error))) {
          markTemplatesEndpointUnavailable();
          return [];
        }
        throw new Error(res.error);
      }
      return res.data || [];
    },
  });
};

export const useWhatsAppTemplateCategories = () => {
  return useQuery({
    queryKey: ['whatsapp-template-categories'],
    ...getTemplatesQueryOptions(),
    queryFn: async () => {
      const res = await apiService.get<string[]>('/whatsapp-templates/categories');
      if (!res.success) {
        if (isMissingTemplatesEndpoint(new Error(res.error))) {
          markTemplatesEndpointUnavailable();
          return [];
        }
        throw new Error(res.error);
      }
      return res.data || [];
    },
  });
};

export const useCreateWhatsAppTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; category?: string; message: any }) => {
      const res = await apiService.post<WhatsAppTemplate>('/whatsapp-templates', data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-template-categories'] });
    },
  });
};

export const useUpdateWhatsAppTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; category?: string; message: any }) => {
      const res = await apiService.put<WhatsAppTemplate>(`/whatsapp-templates/${id}`, data);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-template-categories'] });
    },
  });
};

export const useDeleteWhatsAppTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiService.delete(`/whatsapp-templates/${id}`);
      if (!res.success) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-template-categories'] });
    },
  });
};
