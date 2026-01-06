import api from './api';

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  caseType: 'DTR' | 'RMA' | 'ALL';
  filters: any;
  isPublic: boolean;
  usageCount: number;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const searchService = {
  async getSavedSearches(caseType?: string): Promise<{ success: boolean; data: { searches: SavedSearch[] } }> {
    const query = caseType ? `?caseType=${caseType}` : '';
    return await api.get(`/searches${query}`);
  },

  async getSavedSearchById(id: string): Promise<{ success: boolean; data: { search: SavedSearch } }> {
    return await api.get(`/searches/${id}`);
  },

  async createSavedSearch(data: {
    name: string;
    description?: string;
    caseType: 'DTR' | 'RMA' | 'ALL';
    filters: any;
    isPublic?: boolean;
  }): Promise<{ success: boolean; data: { search: SavedSearch } }> {
    return await api.post('/searches', data);
  },

  async updateSavedSearch(id: string, data: Partial<SavedSearch>): Promise<{ success: boolean; data: { search: SavedSearch } }> {
    return await api.put(`/searches/${id}`, data);
  },

  async useSavedSearch(id: string): Promise<{ success: boolean; data: { search: SavedSearch } }> {
    return await api.post(`/searches/${id}/use`);
  },

  async deleteSavedSearch(id: string): Promise<{ success: boolean }> {
    return await api.delete(`/searches/${id}`);
  },
};

