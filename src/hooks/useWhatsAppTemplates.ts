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

const TEMPLATES_ENDPOINT_UNAVAILABLE_MESSAGE =
  'Mensagens salvas indisponíveis: o backend publicado ainda não possui a rota /api/whatsapp-templates. Atualize e republique o backend.';

const isMissingTemplatesEndpoint = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('cannot get /api/whatsapp-templates') ||
    message.includes('html')
  );
};

const markTemplatesEndpointUnavailable = () => {
  templatesEndpointUnavailable = true;
};

export const isWhatsAppTemplatesEndpointUnavailable = () => templatesEndpointUnavailable;

export const getWhatsAppTemplatesEndpointUnavailableMessage = () =>
  TEMPLATES_ENDPOINT_UNAVAILABLE_MESSAGE;

const handleTemplatesQueryError = (error: unknown) => {
  if (isMissingTemplatesEndpoint(error)) {
    markTemplatesEndpointUnavailable();
    return [];
  }

  throw error instanceof Error ? error : new Error('Erro ao carregar mensagens salvas');
};

const handleTemplatesMutationError = (errorMessage: string) => {
  const error = new Error(errorMessage);

  if (isMissingTemplatesEndpoint(error)) {
    markTemplatesEndpointUnavailable();
    throw new Error(TEMPLATES_ENDPOINT_UNAVAILABLE_MESSAGE);
  }

  throw error;
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
        return handleTemplatesQueryError(new Error(res.error));
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
        return handleTemplatesQueryError(new Error(res.error));
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
      if (!res.success) handleTemplatesMutationError(res.error);
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
      if (!res.success) handleTemplatesMutationError(res.error);
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
      if (!res.success) handleTemplatesMutationError(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-template-categories'] });
    },
  });
};
