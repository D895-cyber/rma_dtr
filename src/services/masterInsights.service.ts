import api from './api';

export interface InsightsSiteSummary {
  id: string;
  siteName: string;
  siteType: 'pvr' | 'non_pvr';
  projectorCount: number;
  rmaCount: number;
}

export interface InsightsProjectorSummary {
  id: string;
  serialNumber: string;
  status?: string;
  projectorModel?: { id: string; modelNo: string };
  audis: Array<{ id: string; audiNo: string; siteId: string }>;
  rmaCount: number;
  lastRmaRaisedDate: string | null;
}

export interface InsightsProjectorAnalytics {
  projector: {
    id: string;
    serialNumber: string;
    status?: string;
    projectorModel?: { id: string; modelNo: string };
    audis: Array<{ id: string; audiNo: string; site: { id: string; siteName: string; siteType: 'pvr' | 'non_pvr' } }>;
  };
  totals: { totalRmaCount: number };
  breakdown: {
    byStatus: Array<{ status: string; count: number }>;
    byType: Array<{ rmaType: string; count: number }>;
    byPart: Array<{ partName: string; count: number }>;
  };
  recentRmas: Array<{
    id: string;
    rmaType: string;
    rmaNumber: string | null;
    callLogNumber: string | null;
    status: string;
    rmaRaisedDate: string;
    createdAt: string;
    defectivePartName: string | null;
    defectivePartNumber: string | null;
    serialNumber: string;
    productName: string;
    site: { id: string; siteName: string; siteType: 'pvr' | 'non_pvr' };
    audi: { id: string; audiNo: string } | null;
  }>;
  suggestions: string[];
}

export const masterInsightsService = {
  async getSites() {
    return await api.get<{ sites: InsightsSiteSummary[] }>('/master-data/insights/sites');
  },

  async getSiteProjectors(siteId: string) {
    return await api.get<{ site: { id: string; siteName: string; siteType: 'pvr' | 'non_pvr' }; projectors: InsightsProjectorSummary[] }>(
      `/master-data/insights/sites/${siteId}/projectors`
    );
  },

  async getProjectorAnalytics(projectorId: string) {
    return await api.get<InsightsProjectorAnalytics>(`/master-data/insights/projectors/${projectorId}/analytics`);
  },
};

export default masterInsightsService;

