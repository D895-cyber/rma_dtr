// Authentication API Service

import api, { setAuthToken, removeAuthToken } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'engineer' | 'staff';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export const authService = {
  // Login
  async login(credentials: LoginCredentials) {
    const response = await api.post<{ token: string; user: AuthUser }>('/auth/login', credentials);
    
    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },

  // Register
  async register(data: RegisterData) {
    const response = await api.post<{ token: string; user: AuthUser }>('/auth/register', data);
    
    if (response.success && response.data?.token) {
      setAuthToken(response.data.token);
    }
    
    return response;
  },

  // Get current user
  async getCurrentUser() {
    return await api.get<{ user: AuthUser }>('/auth/me');
  },

  // Logout
  logout() {
    removeAuthToken();
  },
};

export default authService;








