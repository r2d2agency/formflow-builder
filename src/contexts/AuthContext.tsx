import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, AuthState } from '@/types';
import apiService from '@/services/api';
import { API_CONFIG } from '@/config/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const refreshUser = useCallback(async () => {
    const token = apiService.getToken();
    if (!token) {
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    // If it's the superadmin mock token, we skip the server-side check 
    if (token === 'superadmin-session-token') {
      const superAdminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@example.com';
      setState({
        user: {
          id: 'super-admin-id',
          email: superAdminEmail,
          name: 'Super Admin',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        token,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    const response = await apiService.get<User>(API_CONFIG.ENDPOINTS.ME);
    
    if (response.success && response.data) {
      setState({
        user: response.data,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      apiService.setToken(null);
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Superadmin bypass via environment variables
    const superAdminEmail = import.meta.env.VITE_SUPERADMIN_EMAIL || 'superadmin@example.com';
    const superAdminPassword = import.meta.env.VITE_SUPERADMIN_PASSWORD || 'superadmin123';

    if (email === superAdminEmail && password === superAdminPassword) {
      const superUser: User = {
        id: 'super-admin-id',
        email: superAdminEmail,
        name: 'Super Admin',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const mockToken = 'superadmin-session-token';
      apiService.setToken(mockToken);
      
      setState({
        user: superUser,
        token: mockToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    }

    const response = await apiService.post<{ user: User; token: string }>(
      API_CONFIG.ENDPOINTS.LOGIN,
      { email, password }
    );

    if (response.success && response.data) {
      apiService.setToken(response.data.token);
      setState({
        user: response.data.user,
        token: response.data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    }

    setState(prev => ({ ...prev, isLoading: false }));
    return false;
  };

  const logout = () => {
    apiService.setToken(null);
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
