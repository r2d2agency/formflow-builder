import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';

export interface IntegrationLog {
  id: string;
  form_id: string;
  form_name: string;
  lead_id: string;
  integration_type: string;
  status: 'success' | 'error';
  payload: any;
  response: any;
  error_message?: string;
  created_at: string;
}

interface IntegrationLogsResponse {
  success: boolean;
  logs: IntegrationLog[];
  total: number;
  page: number;
  limit: number;
}

export const useIntegrationLogs = (page = 1, limit = 20, filters?: { form_id?: string; status?: string }) => {
  return useQuery({
    queryKey: ['integration-logs', page, limit, filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.form_id && { form_id: filters.form_id }),
        ...(filters?.status && { status: filters.status }),
      });

      const response = await apiService.get<IntegrationLogsResponse>(
        `${API_CONFIG.ENDPOINTS.INTEGRATION_LOGS}?${queryParams.toString()}`
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch logs');
      }

      return response.data;
    },
  });
};
