// Master Data API Service (Sites, Audis, Projectors, Projector Models)

import api from './api';

export interface Site {
  id: string;
  siteName: string;
  location?: string;
  contactPerson?: string;
  contactNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectorModel {
  id: string;
  modelNo: string;
  manufacturer?: string;
  specifications?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Projector {
  id: string;
  serialNumber: string;
  projectorModelId: string;
  projectorModel?: ProjectorModel;
  status?: string;
  installationDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Audi {
  id: string;
  audiNo: string;
  siteId: string;
  projectorId?: string;
  site?: Site;
  projector?: Projector;
  createdAt?: string;
  updatedAt?: string;
}

export const masterDataService = {
  // Sites
  async getAllSites() {
    return await api.get<{ sites: Site[]; total: number }>('/master-data/sites');
  },

  async getSiteById(id: string) {
    return await api.get<{ site: Site }>(`/master-data/sites/${id}`);
  },

  async createSite(data: Partial<Site>) {
    return await api.post<{ site: Site }>('/master-data/sites', data);
  },

  async updateSite(id: string, data: Partial<Site>) {
    return await api.put<{ site: Site }>(`/master-data/sites/${id}`, data);
  },

  async deleteSite(id: string) {
    return await api.delete(`/master-data/sites/${id}`);
  },

  // Projector Models
  async getAllProjectorModels(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await api.get<{ models: ProjectorModel[]; total: number }>(`/master-data/projector-models${query}`);
  },

  // Alias for consistency
  async getProjectorModels(search?: string) {
    return this.getAllProjectorModels(search);
  },

  async getProjectorModelById(id: string) {
    return await api.get<{ model: ProjectorModel }>(`/master-data/projector-models/${id}`);
  },

  async getProjectorModelByModelNo(modelNo: string) {
    return await api.get<{ model: ProjectorModel }>(`/master-data/projector-models/model/${modelNo}`);
  },

  async createProjectorModel(data: Partial<ProjectorModel>) {
    return await api.post<{ model: ProjectorModel }>('/master-data/projector-models', data);
  },

  async updateProjectorModel(id: string, data: Partial<ProjectorModel>) {
    return await api.put<{ model: ProjectorModel }>(`/master-data/projector-models/${id}`, data);
  },

  async deleteProjectorModel(id: string) {
    return await api.delete(`/master-data/projector-models/${id}`);
  },

  // Projectors (Physical Units)
  async getAllProjectors(siteId?: string, search?: string) {
    const params = new URLSearchParams();
    if (siteId) params.append('siteId', siteId);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await api.get<{ projectors: Projector[]; total: number }>(`/master-data/projectors${query}`);
  },

  async getProjectorById(id: string) {
    return await api.get<{ projector: Projector }>(`/master-data/projectors/${id}`);
  },

  async createProjector(data: Partial<Projector>) {
    return await api.post<{ projector: Projector }>('/master-data/projectors', data);
  },

  async updateProjector(id: string, data: Partial<Projector>) {
    return await api.put<{ projector: Projector }>(`/master-data/projectors/${id}`, data);
  },

  async deleteProjector(id: string) {
    return await api.delete(`/master-data/projectors/${id}`);
  },

  // Audis
  async getAllAudis(siteId?: string) {
    const query = siteId ? `?siteId=${siteId}` : '';
    return await api.get<{ audis: Audi[]; total: number }>(`/master-data/audis${query}`);
  },

  async getAudiById(id: string) {
    return await api.get<{ audi: Audi }>(`/master-data/audis/${id}`);
  },

  async createAudi(data: Partial<Audi>) {
    return await api.post<{ audi: Audi }>('/master-data/audis', data);
  },

  async updateAudi(id: string, data: Partial<Audi>) {
    return await api.put<{ audi: Audi }>(`/master-data/audis/${id}`, data);
  },

  async deleteAudi(id: string) {
    return await api.delete(`/master-data/audis/${id}`);
  },
};

export default masterDataService;

