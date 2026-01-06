import api from './api';

// Get API base URL (without /api suffix for direct fetch calls)
// This should match the logic in api.ts for consistency
const getApiUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL;
    // If VITE_API_URL includes /api, remove it for base URL
    return url.endsWith('/api') ? url.slice(0, -4) : url;
  }
  
  // Auto-detect for production (same origin)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // If deployed (not localhost), use same origin
    if (origin.includes('vercel.app') || !origin.includes('localhost')) {
      return origin;
    }
  }
  
  // Default to local development
  return 'http://localhost:5002';
};

const API_BASE = getApiUrl();

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 Attachment Service API Base URL:', API_BASE);
}

export interface CaseAttachment {
  id: string;
  fileName: string;
  filePath?: string | null;
  fileSize: number;
  mimeType: string;
  caseId: string;
  caseType: 'DTR' | 'RMA';
  cloudinaryUrl?: string | null;
  cloudinaryPublicId?: string | null;
  fileType?: 'image' | 'log' | 'document' | null;
  description?: string;
  uploadedBy: string;
  uploader?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export const attachmentService = {
  async uploadAttachment(
    file: File,
    caseId: string,
    caseType: 'DTR' | 'RMA',
    description?: string
  ): Promise<{ success: boolean; data: { attachment: CaseAttachment } }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('caseType', caseType);
    if (description) {
      formData.append('description', description);
    }

    const token = localStorage.getItem('auth_token');
    
    // Construct full URL - use same logic as api.ts
    let uploadUrl: string;
    if (import.meta.env.VITE_API_URL) {
      uploadUrl = `${import.meta.env.VITE_API_URL}/attachments/upload`;
    } else if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('vercel.app') || !origin.includes('localhost')) {
        uploadUrl = `${origin}/api/attachments/upload`;
      } else {
        uploadUrl = 'http://localhost:5002/api/attachments/upload';
      }
    } else {
      uploadUrl = 'http://localhost:5002/api/attachments/upload';
    }
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Upload URL:', uploadUrl);
      console.log('📤 API_BASE:', API_BASE);
      console.log('📤 VITE_API_URL:', import.meta.env.VITE_API_URL);
    }
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData,
    });

    // Handle non-JSON responses
    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${text}`);
    }
    
    if (!response.ok) {
      console.error('Upload error response:', data);
      throw new Error(data.message || data.error || `Failed to upload file: ${response.status} ${response.statusText}`);
    }
    return data;
  },

  async getAttachments(caseId: string, caseType: 'DTR' | 'RMA'): Promise<{ success: boolean; data: { attachments: CaseAttachment[] } }> {
    return await api.get(`/attachments?caseId=${caseId}&caseType=${caseType}`);
  },

  async downloadAttachment(id: string): Promise<Blob> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/api/attachments/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return await response.blob();
  },

  async deleteAttachment(id: string): Promise<{ success: boolean }> {
    return await api.delete(`/attachments/${id}`);
  },
};

