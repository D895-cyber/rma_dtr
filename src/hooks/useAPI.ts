// API Hook - Replaces useMockData with real API calls

import { useState, useEffect, useCallback } from 'react';
import { dtrService, DTRCase } from '../services/dtr.service';
import { rmaService, RMACase } from '../services/rma.service';
import { masterDataService, Site, Audi, Projector, ProjectorModel } from '../services/masterData.service';
import { userService, User } from '../services/user.service';
import { notificationService, Notification } from '../services/notification.service';
import { partsService, Part } from '../services/parts.service';
import { analyticsService } from '../services/analytics.service';

// Export types
export type { DTRCase, RMACase, Site, Audi, Projector, ProjectorModel, User, Notification, Part };

// DTR Cases Hook
export function useDTRCases() {
  const [cases, setCases] = useState<DTRCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async (filters?: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await dtrService.getAllDTRCases(filters);
      if (response.success && response.data) {
        setCases(response.data.cases || []);
      } else {
        setError(response.message || 'Failed to load DTR cases');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCase = async (data: Partial<DTRCase>) => {
    const response = await dtrService.createDTRCase(data);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  const updateCase = async (id: string, data: Partial<DTRCase>) => {
    const response = await dtrService.updateDTRCase(id, data);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  const assignCase = async (id: string, assignedTo: string) => {
    const response = await dtrService.assignDTRCase(id, assignedTo);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  const updateStatus = async (id: string, status: DTRCase['callStatus']) => {
    const response = await dtrService.updateDTRStatus(id, status);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  const closeCase = async (id: string, finalRemarks: string) => {
    const response = await dtrService.closeDTRCase(id, finalRemarks);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  return {
    cases,
    loading,
    error,
    loadCases,
    createCase,
    updateCase,
    assignCase,
    updateStatus,
    closeCase,
  };
}

// RMA Cases Hook
export function useRMACases() {
  const [cases, setCases] = useState<RMACase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async (filters?: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await rmaService.getAllRMACases(filters);
      if (response.success && response.data) {
        setCases(response.data.cases || []);
      } else {
        setError(response.message || 'Failed to load RMA cases');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createCase = async (data: Partial<RMACase>) => {
    const response = await rmaService.createRMACase(data);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  const updateCase = async (id: string, data: Partial<RMACase>) => {
    const response = await rmaService.updateRMACase(id, data);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  const updateTracking = async (id: string, data: any) => {
    const response = await rmaService.updateRMATracking(id, data);
    if (response.success) {
      await loadCases();
    }
    return response;
  };

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  return {
    cases,
    loading,
    error,
    loadCases,
    createCase,
    updateCase,
    updateTracking,
  };
}

// Master Data Hook
export function useMasterDataAPI() {
  const [sites, setSites] = useState<Site[]>([]);
  const [audis, setAudis] = useState<Audi[]>([]);
  const [projectors, setProjectors] = useState<Projector[]>([]);
  const [projectorModels, setProjectorModels] = useState<ProjectorModel[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSites = useCallback(async () => {
    const response = await masterDataService.getAllSites();
    if (response.success && response.data) {
      setSites(response.data.sites || []);
    }
  }, []);

  const loadAudis = useCallback(async (siteId?: string) => {
    const response = await masterDataService.getAllAudis(siteId);
    if (response.success && response.data) {
      setAudis(response.data.audis || []);
    }
  }, []);

  const loadProjectors = useCallback(async () => {
    const response = await masterDataService.getAllProjectors();
    if (response.success && response.data) {
      setProjectors(response.data.projectors || []);
    }
  }, []);

  const loadProjectorModels = useCallback(async () => {
    const response = await masterDataService.getAllProjectorModels();
    if (response.success && response.data) {
      setProjectorModels(response.data.models || []);
    }
  }, []);

  useEffect(() => {
    loadSites();
    loadAudis();
    loadProjectors();
    loadProjectorModels();
  }, [loadSites, loadAudis, loadProjectors, loadProjectorModels]);

  // Helper functions matching old useMockData interface
  const getAudisBySite = (siteName: string) => {
    const site = sites.find(s => s.siteName === siteName);
    if (!site) return [];
    return audis.filter(a => a.siteId === site.id);
  };

  const getProjectorByAudi = (siteName: string, audiNo: string) => {
    const site = sites.find(s => s.siteName === siteName);
    if (!site) return null;
    
    const audi = audis.find(a => a.siteId === site.id && a.audiNo === audiNo);
    if (!audi || !audi.projectorId) return null;
    
    const projector = projectors.find(p => p.id === audi.projectorId);
    if (!projector) return null;

    return {
      id: projector.id,
      modelNo: projector.projectorModel?.modelNo || '',
      serialNumber: projector.serialNumber,
    };
  };

  return {
    sites,
    audis,
    projectors,
    projectorModels,
    loading,
    loadSites,
    loadAudis,
    loadProjectors,
    loadProjectorModels,
    getAudisBySite,
    getProjectorByAudi,
    // CRUD operations
    createSite: masterDataService.createSite,
    updateSite: masterDataService.updateSite,
    deleteSite: masterDataService.deleteSite,
    createAudi: masterDataService.createAudi,
    updateAudi: masterDataService.updateAudi,
    deleteAudi: masterDataService.deleteAudi,
    createProjector: masterDataService.createProjector,
    updateProjector: masterDataService.updateProjector,
    deleteProjector: masterDataService.deleteProjector,
    createProjectorModel: masterDataService.createProjectorModel,
    updateProjectorModel: masterDataService.updateProjectorModel,
    deleteProjectorModel: masterDataService.deleteProjectorModel,
  };
}

// Users Hook
export function useUsersAPI() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    const response = await userService.getAllUsers();
    if (response.success && response.data) {
      setUsers(response.data.users || []);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getEngineersList = () => {
    return users.filter(u => u.role === 'engineer' && u.isActive);
  };

  const createUser = async (data: any) => {
    const response = await userService.createUser(data);
    if (response.success) {
      await loadUsers();
    }
    return response;
  };

  const updateUser = async (id: string, data: any) => {
    const response = await userService.updateUser(id, data);
    if (response.success) {
      await loadUsers();
    }
    return response;
  };

  const deleteUser = async (id: string) => {
    const response = await userService.deleteUser(id);
    if (response.success) {
      await loadUsers();
    }
    return response;
  };

  return {
    users,
    loading,
    loadUsers,
    getEngineersList,
    createUser,
    updateUser,
    deleteUser,
  };
}

// Notifications Hook
export function useNotificationsAPI() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    const response = await notificationService.getNotifications();
    if (response.success && response.data) {
      setNotifications(response.data.notifications || []);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    const response = await notificationService.getUnreadCount();
    if (response.success && response.data) {
      setUnreadCount(response.data.count || 0);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  const markAsRead = async (id: string) => {
    const response = await notificationService.markAsRead(id);
    if (response.success) {
      await loadNotifications();
      await loadUnreadCount();
    }
    return response;
  };

  const markAllAsRead = async () => {
    const response = await notificationService.markAllAsRead();
    if (response.success) {
      await loadNotifications();
      await loadUnreadCount();
    }
    return response;
  };

  const deleteNotification = async (id: string) => {
    const response = await notificationService.deleteNotification(id);
    if (response.success) {
      await loadNotifications();
      await loadUnreadCount();
    }
    return response;
  };

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

// Parts Hook
export function usePartsAPI() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);

  const loadParts = useCallback(async (search?: string) => {
    const response = await partsService.getAllParts(search);
    if (response.success && response.data) {
      setParts(response.data.parts || []);
    }
  }, []);

  const getPartsByModel = async (modelNo: string) => {
    const response = await partsService.getPartsByProjectorModel(modelNo);
    if (response.success && response.data) {
      return response.data.parts || [];
    }
    return [];
  };

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  return {
    parts,
    loading,
    loadParts,
    getPartsByModel,
    createPart: partsService.createPart,
    updatePart: partsService.updatePart,
    deletePart: partsService.deletePart,
  };
}

// Analytics Hook
export function useAnalytics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadDashboardStats = useCallback(async () => {
    setLoading(true);
    const response = await analyticsService.getDashboardStats();
    if (response.success && response.data) {
      setStats(response.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  return {
    stats,
    loading,
    loadDashboardStats,
    getTrends: analyticsService.getTrends,
    getSeverityBreakdown: analyticsService.getSeverityBreakdown,
    getEngineerPerformance: analyticsService.getEngineerPerformance,
    getSiteStats: analyticsService.getSiteStats,
  };
}

// Re-export services for direct use
export { dtrService, rmaService, masterDataService, userService, notificationService, partsService, analyticsService };



