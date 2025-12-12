import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Calendar, Download, Filter } from 'lucide-react';
import { useDTRCases, useRMACases } from '../hooks/useAPI';

interface AnalyticsProps {
  currentUser: any;
}

export function Analytics({ currentUser }: AnalyticsProps) {
  const { cases: dtrCases } = useDTRCases();
  const { cases: rmaCases } = useRMACases();
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedEngineer, setSelectedEngineer] = useState('all');

  // Helper function to safely get site name
  const getSiteName = (site: any): string => {
    if (!site) return 'Unknown';
    if (typeof site === 'string') return site;
    return site.siteName || 'Unknown';
  };

  // Calculate days between dates
  const daysBetween = (date1: string, date2: string): number => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get current date
  const today = new Date().toISOString().split('T')[0];

  // Overdue Analysis - Updated to match real database statuses
  const overdueReplacementShipping = rmaCases.filter(rma => {
    if (rma.status === 'closed' || rma.status === 'cancelled') return false;
    if (rma.shippedDate) return false; // Already shipped
    const daysSinceRaised = daysBetween(rma.rmaRaisedDate, today);
    return daysSinceRaised > 30;
  });

  const overdueDefectiveReturn = rmaCases.filter(rma => {
    if (rma.status === 'closed' || rma.status === 'cancelled') return false;
    if (!rma.shippedDate) return false; // Haven't shipped replacement yet
    if (rma.returnShippedDate) return false; // Already received return
    const daysSinceShipped = daysBetween(rma.shippedDate, today);
    return daysSinceShipped > 30;
  });

  // DTR vs RMA counts
  const totalDTR = dtrCases.length;
  const totalRMA = rmaCases.length;

  // Status breakdown - Updated to match real database statuses
  const dtrByStatus = [
    { name: 'Open', count: dtrCases.filter(d => d.callStatus === 'open').length, color: '#f59e0b' },
    { name: 'In Progress', count: dtrCases.filter(d => d.callStatus === 'in_progress').length, color: '#3b82f6' },
    { name: 'Closed', count: dtrCases.filter(d => d.callStatus === 'closed').length, color: '#10b981' },
    { name: 'Escalated', count: dtrCases.filter(d => d.callStatus === 'escalated').length, color: '#8b5cf6' },
  ];

  const rmaByStatus = [
    { name: 'Open', count: rmaCases.filter(r => r.status === 'open').length, color: '#f59e0b' },
    { name: 'RMA Raised - Yet to Deliver', count: rmaCases.filter(r => r.status === 'rma_raised_yet_to_deliver').length, color: '#8b5cf6' },
    { name: 'Faulty in Transit to CDS', count: rmaCases.filter(r => r.status === 'faulty_in_transit_to_cds').length, color: '#3b82f6' },
    { name: 'Closed', count: rmaCases.filter(r => r.status === 'closed').length, color: '#10b981' },
  ];

  // RMA Type breakdown - Updated to match real database types
  const rmaByType = [
    { name: 'RMA', count: rmaCases.filter(r => r.rmaType === 'RMA').length, color: '#3b82f6' },
    { name: 'SRMA', count: rmaCases.filter(r => r.rmaType === 'SRMA').length, color: '#8b5cf6' },
    { name: 'RMA CL', count: rmaCases.filter(r => r.rmaType === 'RMA CL').length, color: '#f59e0b' },
    { name: 'Lamps', count: rmaCases.filter(r => r.rmaType === 'Lamps').length, color: '#10b981' },
  ];

  // Site-wise issue frequency
  const siteStats = dtrCases.reduce((acc, dtr) => {
    const siteName = getSiteName(dtr.site);
    acc[siteName] = (acc[siteName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sitewiseData = Object.entries(siteStats)
    .map(([site, count]) => ({ site, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Model-wise failure patterns
  const modelStats = dtrCases.reduce((acc, dtr) => {
    acc[dtr.unitModel] = (acc[dtr.unitModel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const modelwiseData = Object.entries(modelStats)
    .map(([model, count]) => ({ model: model.substring(0, 20), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Turnaround time for closed RMAs
  const closedRMAs = rmaCases.filter(r => r.status === 'closed' && r.shippedDate);
  const avgShippingTime = closedRMAs.length > 0
    ? Math.round(
        closedRMAs.reduce((sum, rma) => {
          return sum + daysBetween(rma.rmaRaisedDate, rma.shippedDate!);
        }, 0) / closedRMAs.length
      )
    : 0;

  const avgReturnTime = closedRMAs.filter(r => r.returnShippedDate).length > 0
    ? Math.round(
        closedRMAs
          .filter(r => r.returnShippedDate)
          .reduce((sum, rma) => {
            return sum + daysBetween(rma.shippedDate!, rma.returnShippedDate!);
          }, 0) / closedRMAs.filter(r => r.returnShippedDate).length
      )
    : 0;

  // Defective vs Replaced parts
  const defectivePartTypes = rmaCases.reduce((acc, rma) => {
    if (rma.defectivePartName) {
      acc[rma.defectivePartName] = (acc[rma.defectivePartName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const partFailureData = Object.entries(defectivePartTypes)
    .map(([part, count]) => ({ part, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Severity trends
  const severityData = [
    { severity: 'Low', count: dtrCases.filter(d => d.caseSeverity === 'low').length },
    { severity: 'Medium', count: dtrCases.filter(d => d.caseSeverity === 'medium').length },
    { severity: 'High', count: dtrCases.filter(d => d.caseSeverity === 'high').length },
    { severity: 'Critical', count: dtrCases.filter(d => d.caseSeverity === 'critical').length },
  ];

  // Export to Excel (CSV)
  const exportToExcel = () => {
    const csv = [
      ['Analytics Report - Generated on ' + new Date().toLocaleString()],
      [],
      ['DTR Statistics'],
      ['Total DTR Cases', totalDTR],
      ['Open Cases', dtrCases.filter(d => d.callStatus === 'open').length],
      ['In Progress', dtrCases.filter(d => d.callStatus === 'in-progress').length],
      ['Closed Cases', dtrCases.filter(d => d.callStatus === 'closed').length],
      ['Escalated to RMA', dtrCases.filter(d => d.callStatus === 'escalated').length],
      [],
      ['RMA Statistics'],
      ['Total RMA Cases', totalRMA],
      ['Pending RMAs', rmaCases.filter(r => r.status === 'pending').length],
      ['Completed RMAs', rmaCases.filter(r => r.status === 'completed').length],
      ['Average Shipping Time (days)', avgShippingTime],
      ['Average Return Time (days)', avgReturnTime],
      [],
      ['Overdue Cases'],
      ['Replacement Parts Not Shipped (30+ days)', overdueReplacementShipping.length],
      ['Defective Parts Not Returned (30+ days)', overdueDefectiveReturn.length],
      [],
      ['Top 5 Sites by Issue Frequency'],
      ['Site', 'Issue Count'],
      ...sitewiseData.map(s => [s.site, s.count]),
      [],
      ['Top 5 Models by Failure Rate'],
      ['Model', 'Failure Count'],
      ...modelwiseData.map(m => [m.model, m.count]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Analytics & Reports</h2>
          <p className="text-sm text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Site</label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sites</option>
              {Object.keys(siteStats).map(site => (
                <option key={site} value={site}>{site}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Engineer</label>
            <select
              value={selectedEngineer}
              onChange={(e) => setSelectedEngineer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Engineers</option>
              <option value="engineer@company.com">engineer@company.com</option>
              <option value="staff@company.com">staff@company.com</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overdue Alerts */}
      {(overdueReplacementShipping.length > 0 || overdueDefectiveReturn.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-red-900">Overdue Cases (30+ Days)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Replacement Parts Not Shipped</p>
              <p className="text-red-600">{overdueReplacementShipping.length} RMA cases</p>
              {overdueReplacementShipping.length > 0 && (
                <div className="mt-3 space-y-2">
                  {overdueReplacementShipping.slice(0, 3).map(rma => (
                    <div key={rma.id} className="text-xs text-gray-700 border-l-2 border-red-500 pl-2">
                      {rma.rmaNumber} - {rma.siteName} ({daysBetween(rma.rmaRaisedDate, today)} days)
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Defective Parts Not Returned</p>
              <p className="text-red-600">{overdueDefectiveReturn.length} RMA cases</p>
              {overdueDefectiveReturn.length > 0 && (
                <div className="mt-3 space-y-2">
                  {overdueDefectiveReturn.slice(0, 3).map(rma => (
                    <div key={rma.id} className="text-xs text-gray-700 border-l-2 border-red-500 pl-2">
                      {rma.rmaNumber} - {rma.siteName} ({daysBetween(rma.shippedDate!, today)} days)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Total DTR Cases</p>
          <p className="text-blue-600">{totalDTR}</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Total RMA Cases</p>
          <p className="text-purple-600">{totalRMA}</p>
          <p className="text-xs text-gray-500 mt-2">All time</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Shipping Time</p>
          <p className="text-green-600">{avgShippingTime} days</p>
          <p className="text-xs text-gray-500 mt-2">RMA raised to shipped</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Return Time</p>
          <p className="text-orange-600">{avgReturnTime} days</p>
          <p className="text-xs text-gray-500 mt-2">Shipped to returned</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DTR Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">DTR Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dtrByStatus}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}: ${entry.count}`}
              >
                {dtrByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* RMA Status Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">RMA Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={rmaByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site-wise Issues */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Top 5 Sites by Issue Frequency</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sitewiseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="site" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Model-wise Failures */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Top 5 Models by Failure Rate</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={modelwiseData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="model" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RMA Type Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">RMA Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={rmaByType}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}: ${entry.count}`}
              >
                {rmaByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Part Failure Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-gray-900 mb-4">Defective Part Analysis</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={partFailureData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="part" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Case Severity Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-gray-900 mb-4">DTR Case Severity Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={severityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="severity" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
