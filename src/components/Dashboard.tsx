import React, { useState, useEffect } from 'react';
import { FileText, Package, AlertCircle, CheckCircle, Clock, TrendingUp, LayoutGrid, X } from 'lucide-react';
import { analyticsService } from '../services/analytics.service';
import { useDashboardLayout, DASHBOARD_WIDGET_IDS, WIDGET_LABELS, type DashboardWidgetId } from '../hooks/useDashboardLayout';

interface DashboardProps {
  currentUser: any;
}

interface DashboardStats {
  dtr: {
    total: number;
    open: number;
    inProgress: number;
    closed: number;
    critical: number;
    recentCases?: any[];
  };
  rma: {
    total: number;
    open: number;
    rmaRaisedYetToDeliver: number;
    faultyInTransitToCds: number;
    closed: number;
    recentCases?: any[];
  };
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const { visibleOrder, layout, setEnabled } = useDashboardLayout(currentUser?.id || '');

  // Helper function to get site name
  const getSiteName = (site: string | { siteName: string } | any): string => {
    if (typeof site === 'string') return site;
    if (site && typeof site === 'object' && site.siteName) return site.siteName;
    return '';
  };

  // Load dashboard stats on mount
  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await analyticsService.getDashboardStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const dtrStats = {
    total: stats.dtr.total,
    open: stats.dtr.open,
    inProgress: stats.dtr.inProgress,
    closed: stats.dtr.closed,
    critical: stats.dtr.critical,
  };

  const rmaStats = {
    total: stats.rma.total,
    open: stats.rma.open,
    rmaRaised: stats.rma.rmaRaisedYetToDeliver,
    inTransit: stats.rma.faultyInTransitToCds,
    closed: stats.rma.closed,
    overdue: (stats.rma as any).overdue ?? 0,
  };

  const recentDTR = stats.dtr.recentCases || [];
  const recentRMA = stats.rma.recentCases || [];
  const overdueRMA = (stats.rma as any).overdueCases || [];

  return (
    <div className="space-y-8 w-full max-w-full">
      {/* Welcome Section */}
      <div className="pb-1 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">Welcome back, {currentUser.name}!</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Here&apos;s what needs attention today.</p>
        </div>
        <button
          type="button"
          onClick={() => setCustomizeOpen(true)}
          className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
          title="Customize dashboard"
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          Customize
        </button>
      </div>

      {/* Widgets in user order */}
      {visibleOrder.includes('dtr-stats') && (
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            DTR Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-blue-300 dark:hover:border-blue-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{dtrStats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All cases</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-orange-300 dark:hover:border-orange-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Open</p>
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-orange-600">{dtrStats.open}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Need attention</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-yellow-400 dark:hover:border-yellow-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Active</p>
                <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-yellow-600">{dtrStats.inProgress}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In progress</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-green-300 dark:hover:border-green-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Closed</p>
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-green-600">{dtrStats.closed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Resolved</p>
            </div>
            <div className="rounded-lg border-2 border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 p-4 transition-colors hover:border-red-400 dark:hover:border-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Critical</p>
                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-red-700 dark:text-red-400">{dtrStats.critical}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Urgent action!</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {visibleOrder.includes('rma-stats') && (
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600 shrink-0" />
            RMA Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-purple-300 dark:hover:border-purple-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
                <Package className="w-4 h-4 text-purple-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{rmaStats.total}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All RMAs</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-orange-300 dark:hover:border-orange-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Open</p>
                <Clock className="w-4 h-4 text-orange-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-orange-600">{rmaStats.open}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pending</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-blue-300 dark:hover:border-blue-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Transit</p>
                <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-blue-600">{rmaStats.inTransit}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">On the way</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors hover:border-green-300 dark:hover:border-green-600">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Closed</p>
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-green-600">{rmaStats.closed}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed</p>
            </div>
            <div className="rounded-lg border-2 border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 p-4 transition-colors hover:border-red-400 dark:hover:border-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Overdue</p>
                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400" />
              </div>
              <p className="text-3xl font-bold tabular-nums text-red-700 dark:text-red-400">{rmaStats.overdue}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {rmaStats.total > 0 ? Math.round((rmaStats.overdue / rmaStats.total) * 100) : 0}% (30+ days)
              </p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleOrder.includes('recent-dtr') && (
        /* Recent DTR */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent DTR Cases</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentDTR.map((dtr) => (
              <div key={dtr.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{dtr.caseNumber}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{getSiteName(dtr.site)}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    dtr.caseSeverity === 'critical' ? 'bg-red-100 text-red-700' :
                    dtr.caseSeverity === 'high' ? 'bg-orange-100 text-orange-700' :
                    dtr.caseSeverity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {dtr.caseSeverity}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{dtr.natureOfProblem}</p>
              </div>
            ))}
          </div>
        </div>
        )}

        {visibleOrder.includes('recent-rma') && (
        /* Recent RMA */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-300 dark:border-gray-700 shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent RMA Cases</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentRMA.map((rma) => (
              <div key={rma.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {/* Top line: RMA # or Call Log # */}
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {rma.rmaNumber || rma.callLogNumber || 'N/A'}
                    </p>
                    {/* Second line: Site name (like DTR list) */}
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getSiteName(rma.site || (rma.siteName as any)) || '-'}
                    </p>
                  </div>
                  {/* Status badge with new RMA statuses */}
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      rma.status === 'closed'
                        ? 'bg-green-100 text-green-700'
                        : rma.status === 'faulty_in_transit_to_cds'
                        ? 'bg-blue-100 text-blue-700'
                        : rma.status === 'rma_raised_yet_to_deliver'
                        ? 'bg-yellow-100 text-yellow-700'
                        : rma.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {rma.status === 'open'
                      ? 'Open'
                      : rma.status === 'rma_raised_yet_to_deliver'
                      ? 'Yet to Deliver'
                      : rma.status === 'faulty_in_transit_to_cds'
                      ? 'In Transit'
                      : rma.status === 'closed'
                      ? 'Closed'
                      : rma.status === 'cancelled'
                      ? 'Cancelled'
                      : rma.status}
                  </span>
                </div>
                {/* Third line: Defective part name (or product) like DTR problem text */}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rma.defectivePartName || rma.productName || '-'}
                </p>
              </div>
            ))}
          </div>

          {/* Overdue RMA Cases (30+ days) */}
          {overdueRMA.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
              <div className="flex items-center justify-between px-6 py-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Overdue RMA Cases (30+ days after shipped)
                </h4>
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {overdueRMA.length} shown
                </span>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {overdueRMA.map((rma: any) => {
                  const shippedDate = rma.shippedDate ? new Date(rma.shippedDate) : null;
                  const daysOverdue =
                    shippedDate != null
                      ? Math.floor(
                          (Date.now() - shippedDate.getTime()) / (1000 * 60 * 60 * 24),
                        )
                      : null;

                  return (
                    <div key={rma.id} className="px-6 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100/60 dark:hover:bg-red-900/30 transition-colors">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {rma.rmaNumber || rma.callLogNumber || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {getSiteName(rma.site)} • {rma.productName}
                          </p>
                          {rma.defectivePartName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Part: {rma.defectivePartName}
                            </p>
                          )}
                          {shippedDate && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Shipped:{' '}
                              {shippedDate.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {daysOverdue != null && `• ${daysOverdue} days ago`}
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 rounded text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                          Overdue
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        )}
      </section>

      {customizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCustomizeOpen(false)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard widgets</h3>
              <button type="button" onClick={() => setCustomizeOpen(false)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Choose which widgets to show on your dashboard.</p>
            <div className="space-y-2">
              {DASHBOARD_WIDGET_IDS.map((id) => (
                <label key={id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layout.enabled.includes(id)}
                    onChange={(e) => setEnabled(id, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{WIDGET_LABELS[id]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}