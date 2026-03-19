import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Eye, List, UserCheck, Loader2, FileText } from 'lucide-react';
import { useDTRCases, useUsersAPI } from '../hooks/useAPI';
import { DTRForm } from './DTRForm';
import { DTRDetail } from './DTRDetail';
import { ProtectedComponent } from './ProtectedComponent';
import { usePermissions } from '../hooks/usePermissions';
import { useFieldMode } from '../contexts/FieldModeContext';
import { stripSerialSuffix } from '../utils/serialNumber';

interface DTRListProps {
  currentUser: any;
  openCaseId?: string | null;
  onOpenCaseHandled?: () => void;
}

export function DTRList({ currentUser, openCaseId, onOpenCaseHandled }: DTRListProps) {
  const { cases: dtrCases, loading, error, total, loadCases, createCase, updateCase } = useDTRCases();
  const { users } = useUsersAPI();
  const { isEngineer } = usePermissions();
  const { isFieldMode } = useFieldMode();
  const [showForm, setShowForm] = useState(false);
  const [selectedDTR, setSelectedDTR] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'assigned'>(isFieldMode ? 'assigned' : 'all'); // Field mode defaults to "My cases"
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Debounce search term - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Mark initial load complete once first data load finishes
  useEffect(() => {
    if (!loading) {
      setIsInitialLoad(false);
    }
  }, [loading]);

  // When field mode is turned on, switch to "My cases"
  useEffect(() => {
    if (isFieldMode) setViewMode('assigned');
  }, [isFieldMode]);

  // Open case from global search when list has loaded
  useEffect(() => {
    if (!openCaseId || !dtrCases.length) return;
    const found = dtrCases.some((c) => c.id === openCaseId);
    if (found) {
      setSelectedDTR(openCaseId);
      onOpenCaseHandled?.();
    }
  }, [openCaseId, dtrCases, onOpenCaseHandled]);

  // Helper function to get site name
  const getSiteName = (site: string | { siteName: string } | any): string => {
    if (typeof site === 'string') return site;
    if (site && typeof site === 'object' && site.siteName) return site.siteName;
    return '';
  };

  // Helper function to get user name from ID, email, or user object
  const getUserName = (userOrId: any): string => {
    if (!userOrId) return 'Unassigned';
    
    // If it's a user object with name or email
    if (typeof userOrId === 'object' && userOrId !== null) {
      if (userOrId.name) return userOrId.name;
      if (userOrId.email) return userOrId.email.split('@')[0];
      return 'Unassigned';
    }
    
    // If it's an email string
    if (typeof userOrId === 'string' && userOrId.includes('@')) {
      return userOrId.split('@')[0];
    }
    
    // If it's a UUID, find the user
    if (typeof userOrId === 'string') {
      const user = users.find((u: any) => u.id === userOrId);
      if (user) return user.name || user.email?.split('@')[0] || userOrId;
    }
    
    return userOrId || 'Unassigned';
  };

  // Helper function to format date for display
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      // Format as: Dec 9, 2024
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to check if a DTR case is assigned to current user
  const isAssignedToCurrentUser = (dtr: any): boolean => {
    if (!currentUser) return false;
    
    // Check by user ID
    if (dtr.assignedTo === currentUser.id) return true;
    
    // Check by email
    if (dtr.assignedTo === currentUser.email) return true;
    
    // Check if assignee object matches
    if (dtr.assignee) {
      if (dtr.assignee.id === currentUser.id) return true;
      if (dtr.assignee.email === currentUser.email) return true;
    }
    
    return false;
  };

  const filteredCases = dtrCases.filter(dtr => {
    // For engineers: filter by view mode
    if (isEngineer && viewMode === 'assigned') {
      if (!isAssignedToCurrentUser(dtr)) {
        return false;
      }
    }
    
    const siteName = getSiteName(dtr.site);
    const audiNo = dtr.audi?.audiNo || dtr.audiNo || '';
    const matchesSearch = 
      (dtr.caseNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (siteName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (audiNo?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (dtr.unitModel?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (dtr.unitSerial?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dtr.callStatus === statusFilter;
    const matchesSeverity = severityFilter === 'all' || dtr.caseSeverity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleExport = () => {
    const csv = [
      ['Case #', 'Error Date', 'Site', 'Audi No', 'Model', 'Serial', 'Problem', 'Status', 'Severity', 'Created By', 'Assigned To'].join(','),
      ...filteredCases.map(dtr => [
        dtr.caseNumber,
        dtr.errorDate,
        getSiteName(dtr.site),
        dtr.audi?.audiNo || dtr.audiNo || '-',
        dtr.unitModel,
        stripSerialSuffix(dtr.unitSerial),
        `"${dtr.natureOfProblem}"`,
        dtr.callStatus,
        dtr.caseSeverity,
        dtr.createdBy,
        dtr.assignedTo || 'Unassigned',
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dtr-cases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Only show full page loader on initial load
  if (loading && isInitialLoad && dtrCases.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading DTR cases...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-semibold mb-2">Error Loading DTR Cases</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (selectedDTR) {
    const dtr = dtrCases.find(d => d.id === selectedDTR);
    if (dtr) {
      return (
        <DTRDetail
          dtr={dtr}
          currentUser={currentUser}
          onClose={() => setSelectedDTR(null)}
          onUpdate={async (id, data, userEmail, action, details) => {
            await updateCase(id, data);
          }}
        />
      );
    }
  }

  if (showForm) {
    return (
      <DTRForm
        currentUser={currentUser}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => {
          const result = await createCase(data);
          if (result.success) {
            setShowForm(false);
          } else {
            alert(result.message || 'Failed to create DTR case');
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">DTR Cases</h2>
          <p className="text-sm text-gray-600">Daily Technical Reports & Service Tickets</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle for Engineers */}
          {isEngineer && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="View all DTR cases"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">All DTRs</span>
              </button>
              <button
                onClick={() => setViewMode('assigned')}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'assigned'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="View only my assigned DTR cases"
              >
                <UserCheck className="w-4 h-4" />
                <span className="hidden sm:inline">My Assigned</span>
              </button>
            </div>
          )}
          <ProtectedComponent permission="dtr:create">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New DTR Case
            </button>
          </ProtectedComponent>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by case #, site, model, or serial..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {loading && !isInitialLoad && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
          
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              {isEngineer && viewMode === 'assigned' ? (
                <>
                  Showing {filteredCases.length} of {dtrCases.filter(dtr => isAssignedToCurrentUser(dtr)).length} assigned cases
                  <span className="ml-2 text-blue-600 font-medium">(My Assigned Only)</span>
                </>
              ) : (
                <>Showing {filteredCases.length} of {total} total cases</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-16rem)]">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Case #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Error Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Site</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Audi No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Problem</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center">
                      <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-4 mb-4">
                        <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No DTR cases found</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {dtrCases.length === 0
                          ? 'Get started by creating your first DTR case.'
                          : 'No cases match your current filters. Try adjusting search or filters.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {dtrCases.length > 0 && (
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter('all');
                              setSeverityFilter('all');
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Clear filters
                          </button>
                        )}
                        <ProtectedComponent permission="dtr:create">
                          <button
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            New DTR Case
                          </button>
                        </ProtectedComponent>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
              filteredCases.map((dtr) => (
                <tr key={dtr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{dtr.caseNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{formatDate(dtr.errorDate)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">{getSiteName(dtr.site)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{dtr.audi?.audiNo || dtr.audiNo || '-'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900 dark:text-white">{dtr.unitModel}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">{stripSerialSuffix(dtr.unitSerial)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{dtr.natureOfProblem}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${
                      dtr.caseSeverity === 'critical' ? 'bg-red-100 text-red-700' :
                      dtr.caseSeverity === 'high' ? 'bg-orange-100 text-orange-700' :
                      dtr.caseSeverity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {dtr.caseSeverity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${
                      dtr.callStatus === 'closed' ? 'bg-green-100 text-green-700' :
                      dtr.callStatus === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      dtr.callStatus === 'escalated' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {dtr.callStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getUserName(dtr.assignee || dtr.assignedTo)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedDTR(dtr.id)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
