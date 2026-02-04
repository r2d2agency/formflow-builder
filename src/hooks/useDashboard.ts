import { useQuery } from '@tanstack/react-query';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';
import type { DashboardStats } from '@/types';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiService.get<DashboardStats>(
        API_CONFIG.ENDPOINTS.DASHBOARD_STATS
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });
};
