import api from './api';

export interface CaseTemplate {
  id: string;
  name: string;
  description?: string;
  caseType: 'DTR' | 'RMA';
  templateData: any;
  isPublic: boolean;
  usageCount: number;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const templateService = {
  async getTemplates(caseType?: string): Promise<{ success: boolean; data: { templates: CaseTemplate[] } }> {
    const query = caseType ? `?caseType=${caseType}` : '';
    return await api.get(`/templates${query}`);
  },

  async getTemplateById(id: string): Promise<{ success: boolean; data: { template: CaseTemplate } }> {
    return await api.get(`/templates/${id}`);
  },

  async createTemplate(data: {
    name: string;
    description?: string;
    caseType: 'DTR' | 'RMA';
    templateData: any;
    isPublic?: boolean;
  }): Promise<{ success: boolean; data: { template: CaseTemplate } }> {
    return await api.post('/templates', data);
  },

  async updateTemplate(id: string, data: Partial<CaseTemplate>): Promise<{ success: boolean; data: { template: CaseTemplate } }> {
    return await api.put(`/templates/${id}`, data);
  },

  async useTemplate(id: string): Promise<{ success: boolean; data: { template: CaseTemplate } }> {
    return await api.post(`/templates/${id}/use`);
  },

  async deleteTemplate(id: string): Promise<{ success: boolean }> {
    return await api.delete(`/templates/${id}`);
  },
};

