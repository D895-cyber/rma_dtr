import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Search, Calendar, Download, FileSpreadsheet, TrendingUp, AlertCircle, Package, Filter, BarChart3, Activity, RefreshCw, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../services/api';

interface RMAAnalyticsProps {
  currentUser: any;
}

interface AnalyticsData {
  summary: {
    totalCount: number;
    dateRange: { from: string | null; to: string | null };
    partFilter: { name: string | null; number: string | null };
  };
  statusBreakdown: Record<string, number>;
  defectPatterns: Array<{ pattern: string; count: number }>;
  trends: Array<{ date: string; count: number }>;
  partBreakdown: {
    productParts: number;
    defectiveParts: number;
    replacedParts: number;
  };
  siteDistribution: Array<{ site: string; count: number }>;
  typeBreakdown: Record<string, number>;
  cases: Array<any>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#a855f7'];
const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-blue-100 text-blue-700 border-blue-200',
  'closed': 'bg-green-100 text-green-700 border-green-200',
  'rma_raised_yet_to_deliver': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'faulty_in_transit_to_cds': 'bg-orange-100 text-orange-700 border-orange-200',
  'cancelled': 'bg-red-100 text-red-700 border-red-200',
};

export function RMAAnalytics({ currentUser }: RMAAnalyticsProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!fromDate && !toDate && !partSearch) {
      setError('Please select at least a date range or enter a part name/number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (partSearch) {
        params.append('partName', partSearch);
        params.append('partNumber', partSearch);
      }

      const response = await api.get<AnalyticsData>(`/analytics/rma-parts?${params.toString()}`);
      
      if (response.success && response.data) {
        setAnalyticsData(response.data);
      } else {
        setError(response.message || 'Failed to fetch analytics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (!analyticsData || analyticsData.cases.length === 0) {
      alert('No data to export');
      return;
    }

    const data = analyticsData.cases.map(case_ => ({
      'RMA Number': case_.rmaNumber || '-',
      'Call Log Number': case_.callLogNumber || '-',
      'RMA Raised Date': case_.rmaRaisedDate,
      'Product Part Number': case_.productPartNumber || '-',
      'Defective Part Number': case_.defectivePartNumber || '-',
      'Defective Part Name': case_.defectivePartName || '-',
      'Replaced Part Number': case_.replacedPartNumber || '-',
      'Status': case_.status,
      'Site': case_.siteName || '-',
      'Defect Details': case_.defectDetails || '-',
    }));

    if (format === 'csv') {
      const csv = [
        Object.keys(data[0]).join(','),
        ...data.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rma-part-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } else {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RMA Analytics');
      XLSX.writeFile(wb, `rma-part-analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  // Prepare chart data
  const statusChartData = analyticsData
    ? Object.entries(analyticsData.statusBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const defectChartData = analyticsData?.defectPatterns.slice(0, 10) || [];

  const trendChartData = analyticsData?.trends || [];

  const siteChartData = analyticsData?.siteDistribution.slice(0, 10) || [];

  const typeChartData = analyticsData
    ? Object.entries(analyticsData.typeBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const clearFilters = () => {
    setFromDate('');
    setToDate('');
    setPartSearch('');
    setAnalyticsData(null);
    setError(null);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">RMA Part Analytics</h2>
                <p className="text-sm text-gray-600 mt-1">Analyze RMA cases by date range and part information</p>
              </div>
            </div>
          </div>
          {analyticsData && analyticsData.cases.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm hover:shadow"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600" />
            Filters
          </h3>
          {(fromDate || toDate || partSearch) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Part Name or Number</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <input
                type="text"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Search by part name/number..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                onKeyPress={(e) => e.key === 'Enter' && fetchAnalytics()}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-start">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            type="button"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            style={{ 
              backgroundColor: '#1d4ed8',
              color: '#ffffff',
              minHeight: '44px'
            }}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Activity className="w-5 h-5" />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Results */}
      {analyticsData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-blue-700">Total RMA Cases</p>
                <div className="p-2 bg-blue-200 rounded-lg">
                  <Package className="w-5 h-5 text-blue-700" />
                </div>
              </div>
              <p className="text-4xl font-bold text-blue-900">{analyticsData.summary.totalCount.toLocaleString()}</p>
              <p className="text-xs text-blue-600 mt-2">Cases analyzed</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-green-700">Product Parts</p>
                <div className="p-2 bg-green-200 rounded-lg">
                  <Package className="w-5 h-5 text-green-700" />
                </div>
              </div>
              <p className="text-4xl font-bold text-green-900">{analyticsData.partBreakdown.productParts.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-2">Product parts tracked</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-red-700">Defective Parts</p>
                <div className="p-2 bg-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-700" />
                </div>
              </div>
              <p className="text-4xl font-bold text-red-900">{analyticsData.partBreakdown.defectiveParts.toLocaleString()}</p>
              <p className="text-xs text-red-600 mt-2">Defective parts found</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-purple-700">Replaced Parts</p>
                <div className="p-2 bg-purple-200 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-700" />
                </div>
              </div>
              <p className="text-4xl font-bold text-purple-900">{analyticsData.partBreakdown.replacedParts.toLocaleString()}</p>
              <p className="text-xs text-purple-600 mt-2">Parts replaced</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Status Breakdown</h3>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>

            {/* RMA Type Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">RMA Type Breakdown</h3>
                <div className="p-2 bg-green-50 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
              </div>
              {typeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>

            {/* Trend Over Time */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Frequency Trend Over Time</h3>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={trendChartData}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>

            {/* Top Defect Patterns */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Defect Patterns</h3>
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
              </div>
              {defectChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={defectChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      dataKey="pattern" 
                      type="category" 
                      width={120}
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="count" fill="#ef4444" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>

            {/* Site Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Sites by RMA Cases</h3>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Package className="w-4 h-4 text-green-600" />
                </div>
              </div>
              {siteChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={siteChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="site" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis 
                      tick={{ fill: '#6b7280', fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-gray-500">No data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Cases Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  RMA Cases
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({analyticsData.cases.length.toLocaleString()})
                  </span>
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">RMA Number</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Product Part</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Defective Part</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Replaced Part</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Site</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.cases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Package className="w-12 h-12 text-gray-300 mb-2" />
                          <p className="text-gray-500 font-medium">No RMA cases found</p>
                          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    analyticsData.cases.map((case_, index) => (
                      <tr 
                        key={case_.id} 
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {case_.rmaNumber || case_.callLogNumber || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(case_.rmaRaisedDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono text-xs">
                          {case_.productPartNumber || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div className="max-w-xs truncate" title={case_.defectivePartNumber || case_.defectivePartName || '-'}>
                            {case_.defectivePartNumber || case_.defectivePartName || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono text-xs">
                          {case_.replacedPartNumber || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                            STATUS_COLORS[case_.status] || 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
                            {case_.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {case_.siteName || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analyticsData && !loading && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-blue-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Filter className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600 mb-6">
              Select a date range and/or enter a part name/number to analyze RMA cases
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date();
                  lastMonth.setMonth(lastMonth.getMonth() - 1);
                  setFromDate(lastMonth.toISOString().split('T')[0]);
                  setToDate(today.toISOString().split('T')[0]);
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Use Last Month
              </button>
              <button
                onClick={() => {
                  const today = new Date();
                  const lastYear = new Date();
                  lastYear.setFullYear(lastYear.getFullYear() - 1);
                  setFromDate(lastYear.toISOString().split('T')[0]);
                  setToDate(today.toISOString().split('T')[0]);
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Use Last Year
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

