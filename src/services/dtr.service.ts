// DTR Cases API Service

import api from './api';

export interface DTRCase {
  id: string;
  errorDate: string;
  caseNumber: string;
  site: string | { id: string; siteName: string; createdAt: string; updatedAt: string };
  siteId: string; // Added: Direct site ID reference
  audiNo: string;
  audiId: string; // Added: Direct audi ID reference
  unitModel: string;
  unitSerial: string;
  natureOfProblem: string;
  actionTaken: string;
  remarks?: string;
  callStatus: 'open' | 'in-progress' | 'on-hold' | 'escalated' | 'closed' | 'cancelled';
  caseSeverity: 'low' | 'medium' | 'high' | 'critical';
  createdBy: string;
  createdDate: string;
  assignedTo?: string;
  closedBy?: string;
  closedDate?: string;
  finalRemarks?: string;
  auditLog?: any[];
  audi?: { id: string; audiNo: string; projector?: any }; // Added: Audi object
}

export const dtrService = {
  // Get all DTR cases
  async getAllDTRCases(filters?: {
    status?: string;
    severity?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return await api.get<{ cases: DTRCase[]; total: number; page: number; limit: number }>(`/dtr${query}`);
  },

  // Get DTR case by ID
  async getDTRCaseById(id: string) {
    return await api.get<{ case: DTRCase }>(`/dtr/${id}`);
  },

  // Create DTR case
  async createDTRCase(data: Partial<DTRCase>) {
    return await api.post<{ case: DTRCase }>('/dtr', data);
  },

  // Update DTR case
  async updateDTRCase(id: string, data: Partial<DTRCase>) {
    return await api.put<{ case: DTRCase }>(`/dtr/${id}`, data);
  },

  // Assign DTR case
  async assignDTRCase(id: string, assignedTo: string) {
    return await api.post<{ case: DTRCase }>(`/dtr/${id}/assign`, { assignedTo });
  },

  // Update DTR status
  async updateDTRStatus(id: string, status: DTRCase['callStatus']) {
    return await api.post<{ case: DTRCase }>(`/dtr/${id}/status`, { status });
  },

  // Close DTR case
  async closeDTRCase(id: string, finalRemarks: string) {
    return await api.post<{ case: DTRCase }>(`/dtr/${id}/close`, { finalRemarks });
  },
};

export default dtrService;

