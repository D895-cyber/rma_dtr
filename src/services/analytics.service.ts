// Analytics API Service

import api from './api';

export interface DashboardStats {
  dtr: {
    total: number;
    open: number;
    inProgress: number;
    onHold: number;
    closed: number;
    myAssigned: number;
  };
  rma: {
    total: number;
    open: number;
    rmaRaisedYetToDeliver: number;
    faultyInTransitToCds: number;
    closed: number;
    myAssigned: number;
  };
  activeEngineers: number;
  totalSites: number;
}

export interface TrendData {
  date: string;
  dtrCount: number;
  rmaCount: number;
}

export interface SeverityBreakdown {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface EngineerPerformance {
  engineerId: string;
  engineerName: string;
  email: string;
  dtr: {
    assigned: number;
    closed: number;
  };
  rma: {
    assigned: number;
    closed: number;
  };
  totalAssigned: number;
  totalCompleted: number;
}

export interface SiteStats {
  siteId: string;
  siteName: string;
  dtrCount: number;
  rmaCount: number;
  totalCases: number;
}

export interface RmaAgingRepeatPair {
  firstCaseId: string;
  secondCaseId: string;
  firstRmaNumber?: string | null;
  secondRmaNumber?: string | null;
  firstCallLogNumber?: string | null;
  secondCallLogNumber?: string | null;
  firstDate: string;
  secondDate: string;
  daysBetween: number;
}

export interface RmaAgingGroup {
  projectorSerial: string;
  projectorModel: string | null;
  siteName: string;
  partNumber: string | null;
  partName: string | null;
  normalizedPartName: string; // The normalized part name used for grouping
  totalCases: number;
  repeatPairs: RmaAgingRepeatPair[];
}

export interface RmaAgingResponse {
  summary: {
    totalRmaCases: number;
    totalGroups: number;
    groupsWithRepeats: number;
    totalRepeatPairs: number;
    thresholdDays: number;
    minRepeats: number;
    showOnlyShortest: boolean;
    dateRange: {
      from: string | null;
      to: string | null;
    };
  };
  groups: RmaAgingGroup[];
}

export const analyticsService = {
  // Get dashboard statistics
  async getDashboardStats() {
    return await api.get<DashboardStats>('/analytics/dashboard');
  },

  // Get trends (last 30 days)
  async getTrends(days: number = 30) {
    return await api.get<{ trends: TrendData[] }>(`/analytics/trends?days=${days}`);
  },

  // Get severity breakdown
  async getSeverityBreakdown() {
    return await api.get<SeverityBreakdown>('/analytics/severity');
  },

  // Get engineer performance
  async getEngineerPerformance() {
    return await api.get<{ performance: EngineerPerformance[] }>('/analytics/engineer-performance');
  },

  // Get site statistics
  async getSiteStats() {
    return await api.get<{ stats: SiteStats[] }>('/analytics/site-stats');
  },

  // Get RMA aging analytics (repeat RMAs for same part on same projector)
  async getRmaAging(params?: { 
    fromDate?: string; 
    toDate?: string; 
    thresholdDays?: number; 
    minRepeats?: number; 
    showOnlyShortest?: boolean;
    serialNumbers?: string[];
    partNames?: string[];
    siteNames?: string[];
  }) {
    const searchParams = new URLSearchParams();
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate);
    if (params?.toDate) searchParams.append('toDate', params.toDate);
    if (params?.thresholdDays !== undefined) searchParams.append('thresholdDays', String(params.thresholdDays));
    if (params?.minRepeats !== undefined) searchParams.append('minRepeats', String(params.minRepeats));
    if (params?.showOnlyShortest !== undefined) searchParams.append('showOnlyShortest', String(params.showOnlyShortest));
    
    // Add filter arrays (multiple values)
    if (params?.serialNumbers && params.serialNumbers.length > 0) {
      params.serialNumbers.forEach(sn => searchParams.append('serialNumbers', sn));
    }
    if (params?.partNames && params.partNames.length > 0) {
      params.partNames.forEach(pn => searchParams.append('partNames', pn));
    }
    if (params?.siteNames && params.siteNames.length > 0) {
      params.siteNames.forEach(sn => searchParams.append('siteNames', sn));
    }

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await api.get<RmaAgingResponse>(`/analytics/rma-aging${query}`);
  },

  // Get filter options for RMA aging analytics (for autocomplete)
  async getRmaAgingFilterOptions(params?: { fromDate?: string; toDate?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate);
    if (params?.toDate) searchParams.append('toDate', params.toDate);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await api.get<{
      serialNumbers: string[];
      partNames: string[];
      siteNames: string[];
    }>(`/analytics/rma-aging/filter-options${query}`);
  },
};

export default analyticsService;








