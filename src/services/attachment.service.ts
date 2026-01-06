import api from './api';

// Get API base URL (without /api suffix for direct fetch calls)
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    // If VITE_API_URL includes /api, remove it for base URL
    const url = import.meta.env.VITE_API_URL;
    return url.endsWith('/api') ? url.slice(0, -4) : url;
  }
  
  // Auto-detect for production (same origin)
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // If deployed (not localhost), use same origin
    if (!origin.includes('localhost')) {
      return origin;
    }
  }
  
  // Default to local development
  return 'http://localhost:5002';
};

const API_BASE = getApiUrl();

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
    const response = await fetch(`${API_BASE}/api/attachments/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to upload file');
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

