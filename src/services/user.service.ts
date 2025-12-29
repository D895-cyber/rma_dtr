// User Management API Service

import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'engineer' | 'staff';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const userService = {
  // Get all users
  async getAllUsers() {
    return await api.get<{ users: User[]; total: number }>('/users');
  },

  // Get user by ID
  async getUserById(id: string) {
    return await api.get<{ user: User }>(`/users/${id}`);
  },

  // Get engineers
  async getEngineers() {
    return await api.get<{ engineers: User[] }>('/users/engineers');
  },

  // Create user
  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
    isActive?: boolean;
  }) {
    return await api.post<{ user: User }>('/users', data);
  },

  // Update user
  async updateUser(id: string, data: Partial<User> & { password?: string }) {
    return await api.put<{ user: User }>(`/users/${id}`, data);
  },

  // Delete user
  async deleteUser(id: string) {
    return await api.delete(`/users/${id}`);
  },

  // Reset user password
  async resetUserPassword(id: string, newPassword: string) {
    return await api.post<{ message: string }>(`/users/${id}/reset-password`, { newPassword });
  },
};

export default userService;








