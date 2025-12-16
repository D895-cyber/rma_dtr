import React, { useState, useEffect } from 'react';
import { FileText, Package, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { analyticsService } from '../services/analytics.service';

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
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-gray-900 mb-1">Welcome back, {currentUser.name}!</h2>
        <p className="text-gray-600">Here&apos;s an overview of your service operations</p>
      </div>

      {/* DTR Stats */}
      <div>
        <h3 className="text-gray-900 mb-4">DTR Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Cases</p>
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-900">{dtrStats.total}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Open</p>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-gray-900">{dtrStats.open}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">In Progress</p>
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-gray-900">{dtrStats.inProgress}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Closed</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-900">{dtrStats.closed}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Critical</p>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-gray-900">{dtrStats.critical}</p>
          </div>
        </div>
      </div>

      {/* RMA Stats */}
      <div>
        <h3 className="text-gray-900 mb-4">RMA Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total RMAs</p>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-gray-900">{rmaStats.total}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Open</p>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-gray-900">{rmaStats.open}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">In Transit</p>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-900">{rmaStats.inTransit}</p>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Closed</p>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-900">{rmaStats.closed}</p>
          </div>

          {/* Overdue (30+ days since shipped) */}
          <div className="bg-white rounded-lg border border-red-200 p-6 bg-red-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-red-700">Overdue (30+ days)</p>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-gray-900">{rmaStats.overdue}</p>
            <p className="text-xs text-red-600 mt-1">
              {rmaStats.total > 0 ? Math.round((rmaStats.overdue / rmaStats.total) * 100) : 0}% of RMAs
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent DTR */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-gray-900">Recent DTR Cases</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentDTR.map((dtr) => (
              <div key={dtr.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm text-gray-900">{dtr.caseNumber}</p>
                    <p className="text-xs text-gray-600">{getSiteName(dtr.site)}</p>
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
                <p className="text-xs text-gray-500">{dtr.natureOfProblem}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent RMA */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-gray-900">Recent RMA Cases</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {recentRMA.map((rma) => (
              <div key={rma.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    {/* Top line: RMA # or Call Log # */}
                    <p className="text-sm text-gray-900">
                      {rma.rmaNumber || rma.callLogNumber || 'N/A'}
                    </p>
                    {/* Second line: Site name (like DTR list) */}
                    <p className="text-xs text-gray-600">
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
                <p className="text-xs text-gray-500">
                  {rma.defectivePartName || rma.productName || '-'}
                </p>
              </div>
            ))}
          </div>

          {/* Overdue RMA Cases (30+ days) */}
          {overdueRMA.length > 0 && (
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="flex items-center justify-between px-6 py-3">
                <h4 className="text-sm font-semibold text-gray-800">
                  Overdue RMA Cases (30+ days after shipped)
                </h4>
                <span className="text-xs text-red-600 font-medium">
                  {overdueRMA.length} shown
                </span>
              </div>
              <div className="divide-y divide-gray-200">
                {overdueRMA.map((rma: any) => {
                  const shippedDate = rma.shippedDate ? new Date(rma.shippedDate) : null;
                  const daysOverdue =
                    shippedDate != null
                      ? Math.floor(
                          (Date.now() - shippedDate.getTime()) / (1000 * 60 * 60 * 24),
                        )
                      : null;

                  return (
                    <div key={rma.id} className="px-6 py-3 bg-red-50 hover:bg-red-100/60">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <p className="text-sm text-gray-900">
                            {rma.rmaNumber || rma.callLogNumber || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {getSiteName(rma.site)} • {rma.productName}
                          </p>
                          {rma.defectivePartName && (
                            <p className="text-xs text-gray-500">
                              Part: {rma.defectivePartName}
                            </p>
                          )}
                          {shippedDate && (
                            <p className="text-[11px] text-gray-500">
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
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
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
      </div>
    </div>
  );
}