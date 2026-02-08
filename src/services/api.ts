import { API_CONFIG, getApiUrl } from '@/config/api';
import type { ApiResponse, PaginatedResponse } from '@/types';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(getApiUrl(endpoint), {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      const contentType = response.headers.get('content-type') || '';

      // Some proxies (or misconfigured routes) return HTML error pages.
      // Trying to parse that as JSON causes: Unexpected token '<'
      if (!contentType.includes('application/json')) {
        const text = await response.text().catch(() => '');

        if (!response.ok) {
          const isHtml = text.trim().startsWith('<') || text.toLowerCase().includes('<html');
          const preview = text ? text.slice(0, 200) : '';

          return {
            success: false,
            error: isHtml
              ? `API retornou HTML (provável 404/redirect). Status: ${response.status}. Verifique o VITE_API_URL e o roteamento do backend.`
              : preview || `Resposta inesperada do servidor. Status: ${response.status}`,
          };
        }

        return {
          success: false,
          error: `Resposta inesperada do servidor (${contentType || 'sem content-type'}).`,
        };
      }

      const data = await response.json();

      if (!response.ok) {
        // If token is missing/expired, clear it so the app can redirect to /login.
        if (response.status === 401) {
          this.setToken(null);
        }

        return {
          success: false,
          error: data.error || data.message || 'An error occurred',
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const options: RequestInit = { method: 'DELETE' };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return this.request<T>(endpoint, options);
  }
}

export const apiService = new ApiService();
export default apiService;
