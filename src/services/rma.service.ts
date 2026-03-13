// RMA Cases API Service

import api from './api';

export interface RMACase {
  id: string;
  rmaType: 'RMA' | 'SRMA' | 'RMA_CL' | 'Lamps';
  callLogNumber?: string;
  rmaNumber?: string;
  rmaOrderNumber?: string;
  rmaRaisedDate: string;
  customerErrorDate: string;
  siteId: string;
  audiId?: string;
  siteName?: string;
  audiNo?: string;
  productName: string;
  productPartNumber: string;
  serialNumber: string;
  defectDetails?: string;
  defectivePartNumber?: string;
  defectivePartName?: string;
  defectivePartSerial?: string;
  isDefectivePartDNR?: boolean;
  defectivePartDNRReason?: string;
  replacedPartNumber?: string;
  replacedPartSerial?: string;
  symptoms?: string;
  shippingCarrier?: string;
  trackingNumberOut?: string;
  shippedDate?: string;
  returnShippedDate?: string;
  returnTrackingNumber?: string;
  returnShippedThrough?: string;
  status: 'open' | 'rma_raised_yet_to_deliver' | 'faulty_in_transit_to_cds' | 'closed' | 'cancelled';
  createdBy: string;
  assignedTo?: string;
  notes?: string;
  auditLog?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export const rmaService = {
  // Get all RMA cases
  async getAllRMACases(filters?: {
    status?: string;
    rmaType?: string;
    assignedTo?: string;
    search?: string;
    page?: number;
    limit?: number;
    includeAudit?: boolean;
    includeStats?: boolean;
    dateFrom?: string;
    dateTo?: string;
    year?: string;
    dnr?: boolean;
    ageDays?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.rmaType) params.append('type', filters.rmaType);
    if (filters?.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.includeAudit) params.append('includeAudit', 'true');
    if (filters?.includeStats) params.append('includeStats', 'true');
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.year) params.append('year', filters.year);
    if (filters?.dnr) params.append('dnr', 'true');
    if (filters?.ageDays) params.append('ageDays', filters.ageDays.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return await api.get<{
      cases: RMACase[];
      total: number;
      page: number;
      limit: number;
      stats?: {
        total: number;
        open: number;
        rmaRaised: number;
        inTransit: number;
        pending: number;
        closed: number;
        cancelled: number;
        dnr: number;
      };
    }>(`/rma${query}`);
  },

  // Get RMA case by ID
  async getRMACaseById(id: string, includeRelations: boolean = false) {
    const query = includeRelations ? '?include=audi,site' : '';
    return await api.get<{ case: RMACase }>(`/rma/${id}${query}`);
  },

  // Create RMA case
  async createRMACase(data: Partial<RMACase>) {
    return await api.post<{ case: RMACase }>('/rma', data);
  },

  // Update RMA case
  async updateRMACase(id: string, data: Partial<RMACase>) {
    return await api.put<{ case: RMACase }>(`/rma/${id}`, data);
  },

  // Update tracking
  async updateRMATracking(id: string, data: {
    returnTrackingNumber?: string;
    returnShippedThrough?: string;
    returnShippedDate?: string;
  }) {
    return await api.post<{ case: RMACase }>(`/rma/${id}/tracking`, data);
  },

  // Send RMA docket email to client
  async emailClient(id: string, data: { email: string; clientName?: string }) {
    return await api.post(`/rma/${id}/email-client`, data);
  },

  // Get audit log for RMA case
  async getAuditLog(id: string) {
    return await api.get<{ auditLogs: Array<{ id: string; action: string; description: string | null; performedAt: string; user: { name: string; email: string } }> }>(`/rma/${id}/audit-log`);
  },
};

export default rmaService;




