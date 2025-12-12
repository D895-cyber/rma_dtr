// Parts Management API Service

import api from './api';

export interface Part {
  id: string;
  partName: string;
  partNumber: string;
  projectorModelId: string;
  category: string;
  description?: string;
  projectorModel?: {
    id: string;
    modelNo: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const partsService = {
  // Get all parts
  async getAllParts(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await api.get<{ parts: Part[]; total: number }>(`/parts${query}`);
  },

  // Get parts by projector model
  async getPartsByProjectorModel(modelNo: string) {
    return await api.get<{ parts: Part[] }>(`/parts/projector/${modelNo}`);
  },

  // Get part by ID
  async getPartById(id: string) {
    return await api.get<{ part: Part }>(`/parts/${id}`);
  },

  // Get part categories
  async getPartCategories() {
    return await api.get<{ categories: string[] }>('/parts/categories');
  },

  // Create part
  async createPart(data: {
    partName: string;
    partNumber: string;
    projectorModelId: string;
    category: string;
    description?: string;
  }) {
    return await api.post<{ part: Part }>('/parts', data);
  },

  // Update part
  async updatePart(id: string, data: Partial<Part>) {
    return await api.put<{ part: Part }>(`/parts/${id}`, data);
  },

  // Delete part
  async deletePart(id: string) {
    return await api.delete(`/parts/${id}`);
  },
};

export default partsService;

