import api from './api';

export interface AssignmentRule {
  id: string;
  name: string;
  description?: string;
  caseType: 'DTR' | 'RMA';
  isActive: boolean;
  priority: number;
  conditions: any;
  assignTo?: string;
  assignToRole?: string;
  matchCount: number;
  createdBy: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const ruleService = {
  async getRules(caseType?: string): Promise<{ success: boolean; data: { rules: AssignmentRule[] } }> {
    const query = caseType ? `?caseType=${caseType}` : '';
    return await api.get(`/rules${query}`);
  },

  async getRuleById(id: string): Promise<{ success: boolean; data: { rule: AssignmentRule } }> {
    return await api.get(`/rules/${id}`);
  },

  async createRule(data: {
    name: string;
    description?: string;
    caseType: 'DTR' | 'RMA';
    conditions: any;
    assignTo?: string;
    assignToRole?: string;
    priority?: number;
    isActive?: boolean;
  }): Promise<{ success: boolean; data: { rule: AssignmentRule } }> {
    return await api.post('/rules', data);
  },

  async updateRule(id: string, data: Partial<AssignmentRule>): Promise<{ success: boolean; data: { rule: AssignmentRule } }> {
    return await api.put(`/rules/${id}`, data);
  },

  async testRule(id: string, caseData: any): Promise<{ success: boolean; data: { matches: boolean; rule: AssignmentRule } }> {
    return await api.post(`/rules/${id}/test`, { caseData });
  },

  async deleteRule(id: string): Promise<{ success: boolean }> {
    return await api.delete(`/rules/${id}`);
  },
};

