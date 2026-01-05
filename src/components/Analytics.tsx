import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Calendar, Download, Filter, X } from 'lucide-react';
import { useDTRCases, useRMACases, useUsersAPI } from '../hooks/useAPI';
import { dtrService } from '../services/dtr.service';
import { rmaService } from '../services/rma.service';

interface AnalyticsProps {
  currentUser: any;
}

export function Analytics({ currentUser }: AnalyticsProps) {
  const { users } = useUsersAPI();
  const [allDTRCases, setAllDTRCases] = useState<any[]>([]);
  const [allRMACases, setAllRMACases] = useState<any[]>([]);
  const [loadingAllCases, setLoadingAllCases] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedEngineer, setSelectedEngineer] = useState('all');
  const [timeView, setTimeView] = useState<'monthly' | 'quarterly'>('monthly');
  
  // Load ALL cases for analytics by fetching all pages
  useEffect(() => {
    const fetchAllCases = async () => {
      setLoadingAllCases(true);
      
      // Add a timeout to prevent infinite loading (5 minutes max)
      const timeoutId = setTimeout(() => {
        console.warn('Analytics loading timeout - setting loading to false');
        setLoadingAllCases(false);
      }, 5 * 60 * 1000);
      
      try {
        // Fetch all DTR cases
        const dtrCases: any[] = [];
        let dtrPage = 1;
        let dtrTotal = 0;
        
        try {
          // First, get the total count
          const firstDTRResponse = await dtrService.getAllDTRCases({ page: 1, limit: 100 });
          console.log('DTR Response:', firstDTRResponse);
          
          if (firstDTRResponse && firstDTRResponse.success && firstDTRResponse.data) {
            const cases = firstDTRResponse.data.cases || [];
            dtrCases.push(...cases);
            dtrTotal = firstDTRResponse.data.total || cases.length;
            
            // Continue fetching remaining pages
            if (dtrTotal > cases.length) {
              while (dtrCases.length < dtrTotal) {
                dtrPage++;
                try {
                  const response = await dtrService.getAllDTRCases({ page: dtrPage, limit: 100 });
                  if (response && response.success && response.data && response.data.cases && response.data.cases.length > 0) {
                    dtrCases.push(...response.data.cases);
                  } else {
                    break;
                  }
                } catch (pageError) {
                  console.error(`Error loading DTR page ${dtrPage}:`, pageError);
                  break;
                }
              }
            }
          } else {
            console.warn('DTR response was not successful or missing data:', firstDTRResponse);
          }
        } catch (dtrError) {
          console.error('Error loading DTR cases:', dtrError);
        }
        
        // Fetch all RMA cases
        const rmaCases: any[] = [];
        let rmaPage = 1;
        let rmaTotal = 0;
        
        try {
          // First, get the total count
          const firstRMAResponse = await rmaService.getAllRMACases({ page: 1, limit: 100 });
          console.log('RMA Response:', firstRMAResponse);
          
          if (firstRMAResponse && firstRMAResponse.success && firstRMAResponse.data) {
            const cases = firstRMAResponse.data.cases || [];
            rmaCases.push(...cases);
            rmaTotal = firstRMAResponse.data.total || cases.length;
            
            // Continue fetching remaining pages
            if (rmaTotal > cases.length) {
              while (rmaCases.length < rmaTotal) {
                rmaPage++;
                try {
                  const response = await rmaService.getAllRMACases({ page: rmaPage, limit: 100 });
                  if (response && response.success && response.data && response.data.cases && response.data.cases.length > 0) {
                    rmaCases.push(...response.data.cases);
                  } else {
                    break;
                  }
                } catch (pageError) {
                  console.error(`Error loading RMA page ${rmaPage}:`, pageError);
                  break;
                }
              }
            }
          } else {
            console.warn('RMA response was not successful or missing data:', firstRMAResponse);
          }
        } catch (rmaError) {
          console.error('Error loading RMA cases:', rmaError);
        }
        
        console.log(`Analytics: Loaded ${dtrCases.length} DTR cases (total: ${dtrTotal})`);
        console.log(`Analytics: Loaded ${rmaCases.length} RMA cases (total: ${rmaTotal})`);
        
        setAllDTRCases(dtrCases);
        setAllRMACases(rmaCases);
      } catch (error) {
        console.error('Error loading all cases for analytics:', error);
        // Set empty arrays on error so the page can still render
        setAllDTRCases([]);
        setAllRMACases([]);
      } finally {
        clearTimeout(timeoutId);
        setLoadingAllCases(false);
      }
    };
    
    fetchAllCases();
  }, []); // Only run once on mount

  // Helper function to safely get site name
  const getSiteName = (site: any): string => {
    if (!site) return 'Unknown';
    if (typeof site === 'string') return site;
    return site.siteName || 'Unknown';
  };

  // Helper function to get RMA site name (handles both object and string)
  const getRMASiteName = (rma: any): string => {
    if (rma.siteName) return rma.siteName; // Direct field
    if (rma.site) return getSiteName(rma.site); // Nested object
    return 'Unknown';
  };

  // Helper function to check if date is within range
  const isDateInRange = (date: string | null | undefined, from: string, to: string): boolean => {
    if (!date) return false;
    if (!from && !to) return true; // No date filter
    const dateObj = new Date(date);
    if (from && dateObj < new Date(from)) return false;
    if (to && dateObj > new Date(to + 'T23:59:59')) return false;
    return true;
  };

  // Apply filters to data (must be called before conditional return)
  const filteredData = useMemo(() => {
    let filteredDTR = [...allDTRCases];
    let filteredRMA = [...allRMACases];

    // Date filter - use errorDate for DTR, rmaRaisedDate (with fallbacks) for RMA
    if (dateRange.from || dateRange.to) {
      filteredDTR = filteredDTR.filter(dtr => 
        isDateInRange(dtr.errorDate || dtr.createdDate, dateRange.from, dateRange.to)
      );
      filteredRMA = filteredRMA.filter(rma => {
        // Try multiple date fields for RMA filtering
        const rmaDate = rma.rmaRaisedDate || rma.createdAt || rma.customerErrorDate;
        return isDateInRange(rmaDate, dateRange.from, dateRange.to);
      });
    }

    // Site filter
    if (selectedSite !== 'all') {
      filteredDTR = filteredDTR.filter(dtr => getSiteName(dtr.site) === selectedSite);
      filteredRMA = filteredRMA.filter(rma => getRMASiteName(rma) === selectedSite);
    }

    // Engineer filter
    if (selectedEngineer !== 'all') {
      filteredDTR = filteredDTR.filter(dtr => dtr.assignedTo === selectedEngineer || dtr.createdBy === selectedEngineer);
      filteredRMA = filteredRMA.filter(rma => rma.assignedTo === selectedEngineer || rma.createdBy === selectedEngineer);
    }

    return { filteredDTR, filteredRMA };
  }, [allDTRCases, allRMACases, dateRange, selectedSite, selectedEngineer]);

  const { filteredDTR: dtrCases, filteredRMA: rmaCases } = filteredData;

  // Get unique sites for filter dropdown
  const uniqueSites = useMemo(() => {
    const sites = new Set<string>();
    allDTRCases.forEach(dtr => sites.add(getSiteName(dtr.site)));
    allRMACases.forEach(rma => sites.add(getRMASiteName(rma)));
    return Array.from(sites).sort();
  }, [allDTRCases, allRMACases]);

  // Helper function to get engineer name from ID
  const getEngineerName = (engineerId: string): string => {
    if (!engineerId) return 'Unknown';
    const user = users.find(u => u.id === engineerId);
    if (user) return user.name || user.email || engineerId;
    // If not found in users, check if it's already an email
    if (typeof engineerId === 'string' && engineerId.includes('@')) return engineerId;
    return engineerId; // Fallback to ID if no match
  };

  // Get unique engineers for filter dropdown (with names)
  const uniqueEngineers = useMemo(() => {
    const engineerIds = new Set<string>();
    allDTRCases.forEach(dtr => {
      if (dtr.assignedTo) engineerIds.add(dtr.assignedTo);
      if (dtr.createdBy) engineerIds.add(dtr.createdBy);
    });
    allRMACases.forEach(rma => {
      if (rma.assignedTo) engineerIds.add(rma.assignedTo);
      if (rma.createdBy) engineerIds.add(rma.createdBy);
    });
    
    // Convert to array with names, sort by name
    return Array.from(engineerIds)
      .map(id => ({
        id,
        name: getEngineerName(id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allDTRCases, allRMACases, users]);

  // Calculate days between dates (validates dates and ensures correct order)
  const daysBetween = (date1: string | null | undefined, date2: string | null | undefined): number | null => {
    if (!date1 || !date2) return null;
    
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      
      // Check if dates are valid
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        return null;
      }
      
      // Calculate difference in days
      const diffMs = d2.getTime() - d1.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      // Return null if date2 is before date1 (invalid order)
      if (diffDays < 0) {
        return null;
      }
      
      return diffDays;
    } catch {
      return null;
    }
  };

  // Get current date
  const today = new Date().toISOString().split('T')[0];

  // Generate time series data (monthly or quarterly)
  const generateTimeSeriesData = (cases: any[], dateField: string, view: 'monthly' | 'quarterly', fallbackField?: string) => {
    const dataMap = new Map<string, number>();

    cases.forEach(caseItem => {
      // Try primary date field first, then fallback
      let date = caseItem[dateField];
      if (!date && fallbackField) {
        date = caseItem[fallbackField];
      }
      
      // If still no date, skip this case
      if (!date) return;

      try {
        const dateObj = new Date(date);
        
        // Check if date is valid
        if (isNaN(dateObj.getTime())) return;

        let key: string;

        if (view === 'monthly') {
          key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        } else {
          const quarter = Math.floor(dateObj.getMonth() / 3) + 1;
          key = `${dateObj.getFullYear()}-Q${quarter}`;
        }

        dataMap.set(key, (dataMap.get(key) || 0) + 1);
      } catch (error) {
        // Skip invalid dates
        console.warn('Invalid date in time series:', date, error);
        return;
      }
    });

    // Convert to array and sort
    const data = Array.from(dataMap.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return data;
  };

  // Time series data
  const dtrTimeSeries = useMemo(() => 
    generateTimeSeriesData(dtrCases, 'errorDate', timeView, 'createdDate'),
    [dtrCases, timeView]
  );

  const rmaTimeSeries = useMemo(() => {
    // Try multiple date fields: rmaRaisedDate -> createdAt -> customerErrorDate
    let series = generateTimeSeriesData(rmaCases, 'rmaRaisedDate', timeView, 'createdAt');
    
    // If still no data, try customerErrorDate
    if (series.length === 0 && rmaCases.length > 0) {
      series = generateTimeSeriesData(rmaCases, 'customerErrorDate', timeView);
    }
    
    // Debug: log RMA cases to see what dates are available (only in dev)
    if (series.length === 0 && rmaCases.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('RMA Time Series Debug - Total RMA cases:', rmaCases.length);
      console.log('RMA Cases sample:', rmaCases.slice(0, 5).map(r => ({
        id: r.id,
        rmaRaisedDate: r.rmaRaisedDate,
        createdAt: r.createdAt,
        customerErrorDate: r.customerErrorDate,
        hasRmaRaisedDate: !!r.rmaRaisedDate,
        hasCreatedAt: !!r.createdAt,
        hasCustomerErrorDate: !!r.customerErrorDate,
      })));
    }
    
    return series;
  }, [rmaCases, timeView]);

  // Combined time series for comparison
  const combinedTimeSeries = useMemo(() => {
    const periods = new Set<string>();
    dtrTimeSeries.forEach(d => periods.add(d.period));
    rmaTimeSeries.forEach(r => periods.add(r.period));

    return Array.from(periods)
      .sort()
      .map(period => ({
        period,
        dtr: dtrTimeSeries.find(d => d.period === period)?.count || 0,
        rma: rmaTimeSeries.find(r => r.period === period)?.count || 0,
      }));
  }, [dtrTimeSeries, rmaTimeSeries]);

  // Preset date ranges
  const setPresetRange = (preset: '7d' | '30d' | '90d' | 'ytd' | 'all') => {
    const today = new Date();
    const from = new Date();

    switch (preset) {
      case '7d':
        from.setDate(today.getDate() - 7);
        break;
      case '30d':
        from.setDate(today.getDate() - 30);
        break;
      case '90d':
        from.setDate(today.getDate() - 90);
        break;
      case 'ytd':
        from.setMonth(0, 1); // January 1st
        break;
      case 'all':
        setDateRange({ from: '', to: '' });
        return;
    }

    setDateRange({
      from: from.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
    });
  };

  // Overdue Analysis
  const overdueReplacementShipping = rmaCases.filter(rma => {
    if (rma.status === 'closed' || rma.status === 'cancelled') return false;
    if (rma.shippedDate) return false;
    const daysSinceRaised = daysBetween(rma.rmaRaisedDate, today);
    return daysSinceRaised !== null && daysSinceRaised > 30;
  });

  const overdueDefectiveReturn = rmaCases.filter(rma => {
    if (rma.status === 'closed' || rma.status === 'cancelled') return false;
    if (!rma.shippedDate) return false;
    if (rma.returnShippedDate) return false;
    const daysSinceShipped = daysBetween(rma.shippedDate, today);
    return daysSinceShipped !== null && daysSinceShipped > 30;
  });

  // DTR vs RMA counts
  const totalDTR = dtrCases.length;
  const totalRMA = rmaCases.length;

  // Status breakdown
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

  // RMA Type breakdown
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
    if (dtr.unitModel) {
      acc[dtr.unitModel] = (acc[dtr.unitModel] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const modelwiseData = Object.entries(modelStats)
    .map(([model, count]) => ({ model: model.substring(0, 20), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Turnaround time for closed RMAs
  const closedRMAsWithValidDates = rmaCases.filter(r => {
    if (r.status !== 'closed' || !r.shippedDate || !r.rmaRaisedDate) return false;
    const days = daysBetween(r.rmaRaisedDate, r.shippedDate);
    return days !== null && days >= 0;
  });
  
  const avgShippingTime = closedRMAsWithValidDates.length > 0
    ? Math.round(
        closedRMAsWithValidDates.reduce((sum, rma) => {
          const days = daysBetween(rma.rmaRaisedDate, rma.shippedDate!);
          return sum + (days || 0);
        }, 0) / closedRMAsWithValidDates.length
      )
    : null;

  // Average return time
  const closedRMAsWithValidReturnDates = rmaCases.filter(r => {
    if (r.status !== 'closed' || !r.shippedDate || !r.returnShippedDate) return false;
    const days = daysBetween(r.shippedDate, r.returnShippedDate);
    return days !== null && days >= 0;
  });
  
  const avgReturnTime = closedRMAsWithValidReturnDates.length > 0
    ? (() => {
        const totalDays = closedRMAsWithValidReturnDates.reduce((sum, rma) => {
          const days = daysBetween(rma.shippedDate!, rma.returnShippedDate!);
          return sum + (days || 0);
        }, 0);
        const avg = Math.round(totalDays / closedRMAsWithValidReturnDates.length);
        // If average is 0 and we have cases, it means all were same-day returns
        // Return 0 to show "0 days" (same day returns)
        return avg;
      })()
    : null;

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
      ['Filters Applied:'],
      [`Date Range: ${dateRange.from || 'All'} to ${dateRange.to || 'All'}`],
      [`Site: ${selectedSite === 'all' ? 'All Sites' : selectedSite}`],
      [`Engineer: ${selectedEngineer === 'all' ? 'All Engineers' : selectedEngineer}`],
      [],
      ['DTR Statistics'],
      ['Total DTR Cases', totalDTR],
      ['Open Cases', dtrCases.filter(d => d.callStatus === 'open').length],
      ['In Progress', dtrCases.filter(d => d.callStatus === 'in_progress').length],
      ['Closed Cases', dtrCases.filter(d => d.callStatus === 'closed').length],
      ['Escalated to RMA', dtrCases.filter(d => d.callStatus === 'escalated').length],
      [],
      ['RMA Statistics'],
      ['Total RMA Cases', totalRMA],
      ['Open RMAs', rmaCases.filter(r => r.status === 'open').length],
      ['Closed RMAs', rmaCases.filter(r => r.status === 'closed').length],
      ['Average Shipping Time (days)', avgShippingTime !== null ? avgShippingTime : 'No data'],
      ['Average Return Time (days)', avgReturnTime !== null ? avgReturnTime : 'No data'],
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

  const hasActiveFilters = dateRange.from || dateRange.to || selectedSite !== 'all' || selectedEngineer !== 'all';

  // Show loading state while fetching all cases (after all hooks)
  if (loadingAllCases) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading all cases for analytics...</p>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <h3 className="text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setDateRange({ from: '', to: '' });
                  setSelectedSite('all');
                  setSelectedEngineer('all');
                }}
                className="ml-4 flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {/* Preset Date Ranges */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setPresetRange('7d')}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setPresetRange('30d')}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setPresetRange('90d')}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Last 90 Days
          </button>
          <button
            onClick={() => setPresetRange('ytd')}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Year to Date
          </button>
          <button
            onClick={() => setPresetRange('all')}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            All Time
          </button>
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
              {uniqueSites.map(site => (
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
              {uniqueEngineers.map(engineer => (
                <option key={engineer.id} value={engineer.id}>{engineer.name}</option>
              ))}
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
                      {rma.rmaNumber ? `${rma.rmaNumber} - ` : ''}{getRMASiteName(rma)} ({daysBetween(rma.rmaRaisedDate, today)} days)
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
                      {rma.rmaNumber ? `${rma.rmaNumber} - ` : ''}{getRMASiteName(rma)} ({daysBetween(rma.shippedDate!, today)} days)
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
          <p className="text-2xl font-bold text-blue-600">{totalDTR}</p>
          <p className="text-xs text-gray-500 mt-2">
            {hasActiveFilters ? 'Filtered results' : 'All time'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Total RMA Cases</p>
          <p className="text-2xl font-bold text-purple-600">{totalRMA}</p>
          <p className="text-xs text-gray-500 mt-2">
            {hasActiveFilters ? 'Filtered results' : 'All time'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Shipping Time</p>
          {avgShippingTime !== null ? (
            <>
              <p className="text-2xl font-bold text-green-600">{avgShippingTime} days</p>
              <p className="text-xs text-gray-500 mt-2">RMA raised to shipped</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-400">No data</p>
              <p className="text-xs text-gray-500 mt-2">Insufficient valid date data</p>
            </>
          )}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm text-gray-600 mb-2">Avg Return Time</p>
          {avgReturnTime !== null ? (
            <>
              <p className="text-2xl font-bold text-orange-600">{avgReturnTime} days</p>
              <p className="text-xs text-gray-500 mt-2">Shipped to returned</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-400">No data</p>
              <p className="text-xs text-gray-500 mt-2">Insufficient valid date data</p>
            </>
          )}
        </div>
      </div>

      {/* Time Series Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Case Volume Trends</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeView('monthly')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                timeView === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTimeView('quarterly')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                timeView === 'quarterly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quarterly
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={combinedTimeSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="period" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              interval={timeView === 'monthly' ? 2 : 0}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="dtr" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="DTR Cases"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="rma" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="RMA Cases"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
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
