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
};

export default analyticsService;



