import React, { useState } from 'react';
import { Plus, Search, Download, Eye, Package, AlertCircle, Clock, CheckCircle, XCircle, Ban, TrendingUp, Calendar, X } from 'lucide-react';
import { useRMACases } from '../hooks/useAPI';
import { RMAForm } from './RMAForm';
import { RMADetail } from './RMADetail';

interface RMAListProps {
  currentUser: any;
}

export function RMAList({ currentUser }: RMAListProps) {
  const { cases: rmaCases, loading, error, createCase, updateCase } = useRMACases();
  const [showForm, setShowForm] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all'); // 'all' | '30' | '60' | '90'
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

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

  // Helper function to get site name
  const getSiteName = (site: any): string => {
    if (typeof site === 'string') return site;
    if (site && typeof site === 'object' && site.siteName) return site.siteName;
    return '';
  };

  // Helper function to get user display name
  const getUserName = (userOrEmail: any): string => {
    if (!userOrEmail) return '-';
    
    // If it's a user object with name or email
    if (typeof userOrEmail === 'object' && userOrEmail !== null) {
      if (userOrEmail.name) return userOrEmail.name;
      if (userOrEmail.email) return userOrEmail.email.split('@')[0];
      return '-';
    }
    
    // If it's an email string
    if (typeof userOrEmail === 'string' && userOrEmail.includes('@')) {
      return userOrEmail.split('@')[0];
    }
    
    // If it's a UUID or unknown format
    if (typeof userOrEmail === 'string' && userOrEmail.length > 20) {
      return userOrEmail.substring(0, 8) + '...';
    }
    
    return String(userOrEmail) || '-';
  };

  // Helper: get year from RMA raised date
  const getYearFromDate = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.getFullYear();
  };

  // Helper: check if date is within date range (inclusive)
  const isDateInRange = (dateStr: string | null | undefined, fromDate: string, toDate: string): boolean => {
    if (!dateStr) return false;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return false;
      
      // Set time to start of day for comparison
      date.setHours(0, 0, 0, 0);
      
      // If both dates are set, check range
      if (fromDate && toDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999); // End of day
        
        return date >= from && date <= to;
      }
      
      // If only fromDate is set
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        return date >= from;
      }
      
      // If only toDate is set
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        return date <= to;
      }
      
      return true; // No date filter
    } catch {
      return false;
    }
  };

  // Available years (from data)
  const availableYears = Array.from(
    new Set(
      rmaCases
        .map(r => getYearFromDate(r.rmaRaisedDate))
        .filter((y): y is number => y !== null)
    )
  ).sort((a, b) => b - a);

  // Apply date range filter first (takes precedence over year filter)
  const dateRangeFilteredCases = (dateFrom || dateTo)
    ? rmaCases.filter(r => isDateInRange(r.rmaRaisedDate, dateFrom, dateTo))
    : rmaCases;

  // Apply year filter (only if date range is not active)
  const yearFilteredCases = (dateFrom || dateTo)
    ? dateRangeFilteredCases // Date range takes precedence
    : (yearFilter === 'all'
        ? rmaCases
        : rmaCases.filter(r => getYearFromDate(r.rmaRaisedDate) === Number(yearFilter)));

  // Calculate statistics for filtered cases
  const rmaStats = {
    total: yearFilteredCases.length,
    open: yearFilteredCases.filter(r => r.status === 'open').length,
    rmaRaised: yearFilteredCases.filter(r => r.status === 'rma_raised_yet_to_deliver').length,
    inTransit: yearFilteredCases.filter(r => r.status === 'faulty_in_transit_to_cds').length,
    closed: yearFilteredCases.filter(r => r.status === 'closed').length,
    cancelled: yearFilteredCases.filter(r => r.status === 'cancelled').length,
    dnr: yearFilteredCases.filter(r => r.isDefectivePartDNR === true).length,
  };

  const filteredCases = yearFilteredCases.filter((rma) => {
    const search = searchTerm.toLowerCase();
    const siteName = getSiteName(rma.site || rma.siteName);

    // Age / overdue filter (based on shippedDate and status)
    const ageDays =
      ageFilter === 'all'
        ? null
        : Number.isFinite(Number(ageFilter))
        ? Number(ageFilter)
        : null;

    let matchesAge = true;
    if (ageDays !== null) {
      if (rma.status !== 'faulty_in_transit_to_cds' || !rma.shippedDate) {
        // Age filter only applies to Faulty in Transit to CDS with a shipped date
        matchesAge = false;
      } else {
        const shipped = new Date(rma.shippedDate);
        if (Number.isNaN(shipped.getTime())) {
          matchesAge = false;
        } else {
          const diffMs = Date.now() - shipped.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          matchesAge = diffDays >= ageDays;
        }
      }
    }

    const matchesSearch =
      (rma.rmaNumber?.toLowerCase() || '').includes(search) ||
      (rma.callLogNumber?.toLowerCase() || '').includes(search) ||
      (siteName?.toLowerCase() || '').includes(search) ||
      (rma.productName?.toLowerCase() || '').includes(search) ||
      (rma.serialNumber?.toLowerCase() || '').includes(search) ||
      (rma.defectivePartName?.toLowerCase() || '').includes(search) ||
      (rma.defectivePartNumber?.toLowerCase() || '').includes(search);

    const matchesStatus = statusFilter === 'all' || rma.status === statusFilter;
    const matchesType = typeFilter === 'all' || rma.rmaType === typeFilter;

    return matchesSearch && matchesStatus && matchesType && matchesAge;
  });

  // Helper to escape CSV values (handles commas, quotes, newlines)
  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    const str = String(value);
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Helper to format date for CSV (YYYY-MM-DD format, no commas)
  const formatDateForCSV = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      // Format as YYYY-MM-DD for CSV (no commas!)
      return date.toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  // Handle date range changes with validation
  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    // If toDate is set and is before fromDate, clear toDate
    if (value && dateTo && new Date(value) > new Date(dateTo)) {
      setDateTo('');
    }
  };

  const handleDateToChange = (value: string) => {
    // Validate that toDate is not before fromDate
    if (value && dateFrom && new Date(value) < new Date(dateFrom)) {
      alert('To Date must be after or equal to From Date');
      return;
    }
    setDateTo(value);
  };

  const handleClearDateRange = () => {
    setDateFrom('');
    setDateTo('');
  };

  const handleExport = () => {
    const csv = [
      ['RMA #', 'Call Log #', 'Order #', 'Type', 'Raised Date', 'Error Date', 'Site', 'Audi No', 'Product', 'Serial #', 'Defective Part', 'Defective Serial', 'Return Tracking', 'Replacement Part', 'Replacement Serial', 'Out Tracking', 'Status', 'Created By', 'Assigned To'].join(','),
      ...filteredCases.map(rma => [
        escapeCsvValue(rma.rmaNumber || '-'),
        escapeCsvValue(rma.callLogNumber || '-'),
        escapeCsvValue(rma.rmaOrderNumber || '-'),
        escapeCsvValue(rma.rmaType),
        formatDateForCSV(rma.rmaRaisedDate), // Use CSV-safe date format
        formatDateForCSV(rma.customerErrorDate), // Use CSV-safe date format
        escapeCsvValue(getSiteName(rma.site || rma.siteName) || '-'),
        escapeCsvValue(rma.audi?.audiNo || rma.audiNo || '-'),
        escapeCsvValue(rma.productName || '-'),
        escapeCsvValue(rma.serialNumber || '-'),
        escapeCsvValue(rma.defectivePartName || '-'),
        escapeCsvValue(rma.defectivePartSerial || '-'),
        escapeCsvValue(rma.returnTrackingNumber || '-'),
        escapeCsvValue(rma.replacedPartNumber || '-'),
        escapeCsvValue(rma.replacedPartSerial || '-'),
        escapeCsvValue(rma.trackingNumberOut || '-'),
        escapeCsvValue(rma.status),
        escapeCsvValue(getUserName(rma.creator || rma.createdBy)),
        escapeCsvValue(getUserName(rma.assignee || rma.assignedTo) || '-'),
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rma-cases-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RMA cases...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-semibold mb-2">Error Loading RMA Cases</p>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (selectedRMA) {
    const rma = rmaCases.find(r => r.id === selectedRMA);
    if (rma) {
      return (
        <RMADetail
          rma={rma}
          currentUser={currentUser}
          onClose={() => setSelectedRMA(null)}
          onUpdate={async (id, data, userEmail, action, details) => {
            await updateCase(id, data);
          }}
        />
      );
    }
  }

  if (showForm) {
    return (
      <RMAForm
        currentUser={currentUser}
        onClose={() => setShowForm(false)}
        onSubmit={async (data) => {
          const result = await createCase(data);
          if (result.success) {
            setShowForm(false);
          } else {
            alert(result.message || 'Failed to create RMA case');
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
          <h2 className="text-gray-900 mb-1">RMA Cases</h2>
          <p className="text-sm text-gray-600">Return Material Authorization & Part Tracking</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New RMA Case
        </button>
      </div>

      {/* Statistics Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">RMA Statistics</h3>
          {(dateFrom || dateTo) && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Date Range: {dateFrom ? formatDate(dateFrom) : 'Any'} to {dateTo ? formatDate(dateTo) : 'Any'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Total */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Total</p>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.total}</p>
          </div>
          
          {/* Open */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Open</p>
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.open}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.open / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* RMA Raised */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Yet to Deliver</p>
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.rmaRaised}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.rmaRaised / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* In Transit */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">In Transit</p>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.inTransit}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.inTransit / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* Closed */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Closed</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.closed}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.closed / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* Cancelled */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Cancelled</p>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.cancelled}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.cancelled / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* DNR Cases */}
          <div className="bg-white rounded-lg border border-red-300 p-4 hover:shadow-md transition-shadow bg-red-50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-red-700 font-medium">DNR Parts</p>
              <Ban className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-900">{rmaStats.dnr}</p>
            <p className="text-xs text-red-600 mt-1">Do Not Return</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Date Range Filter Row */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Date Range (RMA Raised Date)</label>
            {(dateFrom || dateTo) && (
              <button
                onClick={handleClearDateRange}
                className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Clear date range"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                max={dateTo || undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                min={dateFrom || undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <div className="w-full px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">
                    {(dateFrom || dateTo) && (
                      <>
                        Filtering: {dateFrom ? formatDate(dateFrom) : 'Any'} to {dateTo ? formatDate(dateTo) : 'Any'}
                        {(dateFrom || dateTo) && (
                          <span className="block text-blue-600 mt-1">
                            {yearFilteredCases.length} case{yearFilteredCases.length !== 1 ? 's' : ''} found
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
          {(dateFrom || dateTo) && (
            <p className="text-xs text-gray-500 mt-2">
              Note: Date range filter takes precedence over year filter
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Text search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by RMA #, call log, site, product, serial, or part..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Year filter */}
          <div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              disabled={!!(dateFrom || dateTo)}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                (dateFrom || dateTo) ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              title={(dateFrom || dateTo) ? 'Year filter disabled when date range is active' : ''}
            >
              <option value="all">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="rma_raised_yet_to_deliver">RMA Raised - Yet to Deliver</option>
              <option value="faulty_in_transit_to_cds">Faulty in Transit to CDS</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Type filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="RMA">RMA</option>
              <option value="CI RMA">CI RMA</option>
              <option value="Lamps">Lamps</option>
            </select>
          </div>

          {/* Age / overdue filter (based on shippedDate and status) */}
          <div>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Ages</option>
              <option value="30">30+ days (shipped)</option>
              <option value="60">60+ days (shipped)</option>
              <option value="90">90+ days (shipped)</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">
              Showing {filteredCases.length} of {yearFilteredCases.length} case{yearFilteredCases.length !== 1 ? 's' : ''}
              {(dateFrom || dateTo) && (
                <span className="text-blue-600 font-medium ml-1">
                  (filtered by date range)
                </span>
              )}
            </p>
            {(dateFrom || dateTo) && (
              <p className="text-xs text-gray-500 mt-1">
                Date range: {dateFrom ? formatDate(dateFrom) : 'Any start'} to {dateTo ? formatDate(dateTo) : 'Any end'}
              </p>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">RMA #</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Call Log #</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Site</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Audi No</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Defective Part</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Replacement Part</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCases.map((rma) => (
                <tr key={rma.id} className="hover:bg-gray-50">
                  {/* RMA # */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[110px]">
                    <span className="text-sm font-medium text-gray-900">{rma.rmaNumber || '-'}</span>
                  </td>
                  
                  {/* Call Log # (DTR Link) */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[90px]">
                    {rma.callLogNumber ? (
                      <span className="text-sm text-blue-600">{rma.callLogNumber}</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  
                  {/* Order # */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[110px]">
                    <span className="text-sm text-gray-600">{rma.rmaOrderNumber || '-'}</span>
                  </td>
                  
                  {/* Type */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[80px]">
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize">
                      {rma.rmaType}
                    </span>
                  </td>
                  
                  {/* Dates (Raised + Error) */}
                  <td className="px-4 py-4 min-w-[140px]">
                    <div className="text-sm whitespace-nowrap">
                      <div className="text-gray-900 mb-1">
                        <span className="text-xs text-gray-500">Raised:</span> {formatDate(rma.rmaRaisedDate)}
                      </div>
                      <div className="text-gray-600">
                        <span className="text-xs text-gray-500">Error:</span> {formatDate(rma.customerErrorDate)}
                      </div>
                    </div>
                  </td>
                  
                  {/* Site */}
                  <td className="px-4 py-4 min-w-[200px]">
                    <span className="text-sm text-gray-900 whitespace-nowrap">{getSiteName(rma.site || rma.siteName) || '-'}</span>
                  </td>
                  
                  {/* Audi No */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[90px]">
                    <span className="text-sm text-gray-600">{rma.audi?.audiNo || rma.audiNo || '-'}</span>
                  </td>
                  
                  {/* Product + Site + Defective Part (DTR-style compact block) */}
                  <td className="px-4 py-4 min-w-[220px]">
                    <div className="text-sm space-y-0.5">
                      {/* Product model */}
                      <div className="text-gray-900 whitespace-nowrap">
                        {rma.productName || '-'}
                      </div>
                      {/* Site name */}
                      <div className="text-gray-700 text-xs whitespace-nowrap">
                        {getSiteName(rma.site || rma.siteName) || '-'}
                      </div>
                      {/* Defective part name / number */}
                      <div className="text-gray-500 text-xs whitespace-nowrap">
                        Part: {rma.defectivePartName || rma.defectivePartNumber || '-'}
                      </div>
                      {/* Serial number */}
                      <div className="text-gray-400 text-[11px] whitespace-nowrap">
                        S/N: {rma.serialNumber || '-'}
                      </div>
                    </div>
                  </td>
                  
                  {/* Defective Part (Name, Number, Serial, Return Tracking) */}
                  <td className="px-4 py-4 min-w-[200px]">
                    <div className="text-xs">
                      {rma.defectivePartName || rma.defectivePartNumber ? (
                        <>
                          <div className="text-gray-900 font-medium whitespace-nowrap">
                            {rma.defectivePartName || rma.defectivePartNumber || '-'}
                          </div>
                          {rma.defectivePartNumber && rma.defectivePartName && (
                            <div className="text-gray-600 whitespace-nowrap">P/N: {rma.defectivePartNumber}</div>
                          )}
                          {rma.defectivePartSerial && (
                            <div className="text-gray-600 whitespace-nowrap">S/N: {rma.defectivePartSerial}</div>
                          )}
                          {rma.returnTrackingNumber && (
                            <div className="text-blue-600 whitespace-nowrap">📦 {rma.returnTrackingNumber}</div>
                          )}
                          {rma.isDefectivePartDNR && (
                            <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs mt-1">DNR</span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  
                  {/* Replacement Part (Number, Serial, Out Tracking) */}
                  <td className="px-4 py-4 min-w-[180px]">
                    <div className="text-xs">
                      {rma.replacedPartNumber || rma.replacedPartSerial ? (
                        <>
                          <div className="text-gray-900 font-medium whitespace-nowrap">
                            P/N: {rma.replacedPartNumber || '-'}
                          </div>
                          {rma.replacedPartSerial && (
                            <div className="text-gray-600 whitespace-nowrap">S/N: {rma.replacedPartSerial}</div>
                          )}
                          {rma.trackingNumberOut && (
                            <div className="text-green-600 whitespace-nowrap">📤 {rma.trackingNumberOut}</div>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  
                  {/* Status */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[120px]">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rma.status === 'closed' ? 'bg-green-100 text-green-700' :
                      rma.status === 'faulty_in_transit_to_cds' ? 'bg-purple-100 text-purple-700' :
                      rma.status === 'rma_raised_yet_to_deliver' ? 'bg-yellow-100 text-yellow-700' :
                      rma.status === 'open' ? 'bg-blue-100 text-blue-700' :
                      rma.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rma.status === 'open' ? 'Open' :
                       rma.status === 'rma_raised_yet_to_deliver' ? 'Yet to Deliver' :
                       rma.status === 'faulty_in_transit_to_cds' ? 'In Transit' :
                       rma.status === 'closed' ? 'Closed' :
                       rma.status === 'cancelled' ? 'Cancelled' :
                       rma.status}
                    </span>
                  </td>
                  
                  {/* Team (Created By + Assigned To) */}
                  <td className="px-4 py-4 min-w-[140px]">
                    <div className="text-xs">
                      <div className="text-gray-900 whitespace-nowrap">
                        <span className="text-gray-500">By:</span> {getUserName(rma.creator || rma.createdBy)}
                      </div>
                      {(rma.assignee || rma.assignedTo) && (
                        <div className="text-gray-600 whitespace-nowrap">
                          <span className="text-gray-500">To:</span> {getUserName(rma.assignee || rma.assignedTo)}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Actions */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[70px]">
                    <button
                      onClick={() => setSelectedRMA(rma.id)}
                      className="text-blue-600 hover:text-blue-800"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}