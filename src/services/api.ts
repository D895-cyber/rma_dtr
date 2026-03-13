// API Service - Base configuration and utilities

// Auto-detect API URL for production
const getApiBaseUrl = () => {
  // Use environment variable if set
  const viteApiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (viteApiUrl) {
    return viteApiUrl;
  }
  
  // Auto-detect local vs deployed environments
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

    // Local dev: frontend on localhost/127.0.0.1 should call local backend.
    if (localHosts.has(hostname)) {
      return 'http://localhost:5002/api';
    }

    // Deployed environments use same-origin API route.
    if (origin.includes('vercel.app')) {
      return `${origin}/api`;
    }

    // Any non-local hostname should also use same-origin API route.
    return `${origin}/api`;
  }
  
  // Default to local development (backend runs on 5002)
  return 'http://localhost:5002/api';
};

const API_BASE_URL = getApiBaseUrl();

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Set auth token
export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

// Remove auth token
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

// API request wrapper with authentication, timeout, and retry logic
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries: number = 1
): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const token = getAuthToken();
  const REQUEST_TIMEOUT = 30000; // 30 seconds
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 (Unauthorized) - token expired
    if (response.status === 401) {
      removeAuthToken();
      return {
        success: false,
        message: 'Session expired. Please login again.',
        error: 'Unauthorized',
      };
    }

    // Handle 403 (Forbidden) - invalid token
    if (response.status === 403) {
      return {
        success: false,
        message: 'Forbidden: insufficient permissions',
        error: 'Forbidden',
      };
    }

    // Handle 504 (Gateway Timeout)
    if (response.status === 504) {
      return {
        success: false,
        message: 'Request timeout - server took too long to respond',
        error: 'Timeout',
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const rawBody = await response.text();
    const data = contentType.includes('application/json') && rawBody
      ? JSON.parse(rawBody)
      : {};

    if (!response.ok) {
      return {
        success: false,
        message: (data as any).message || `Request failed (${response.status})`,
        error: (data as any).error,
      };
    }

    return {
      success: true,
      data: (data as any).data || data,
      message: (data as any).message,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Handle abort (timeout)
    if (error.name === 'AbortError') {
      // Retry on timeout if retries remaining
      if (retries > 0) {
        console.warn(`Request timeout, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        return apiRequest<T>(endpoint, options, retries - 1);
      }
      return {
        success: false,
        message: 'Request timeout - please try again',
        error: 'Timeout',
      };
    }

    // Handle network errors with retry
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      if (retries > 0) {
        console.warn(`Network error, retrying... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        return apiRequest<T>(endpoint, options, retries - 1);
      }
    }

    console.error('API Request Error:', error);
    return {
      success: false,
      message: 'Network error - please check your connection',
      error: error.message,
    };
  }
}

// Convenient HTTP method wrappers
export const api = {
  get: <T = any>(endpoint: string) => 
    apiRequest<T>(endpoint, { method: 'GET' }),
  
  post: <T = any>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  put: <T = any>(endpoint: string, data?: any) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  delete: <T = any>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};

export default api;



