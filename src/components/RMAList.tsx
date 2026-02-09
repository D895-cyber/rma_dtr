import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, Download, Eye, Package, AlertCircle, Clock, CheckCircle, XCircle, Ban, TrendingUp, Calendar, X, CheckSquare, Square, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useRMACases } from '../hooks/useAPI';
import { rmaService } from '../services/rma.service';
import { RMAForm } from './RMAForm';
import { RMADetail } from './RMADetail';
import { ProtectedComponent } from './ProtectedComponent';

interface RMAListProps {
  currentUser: any;
  openCaseId?: string | null;
  onOpenCaseHandled?: () => void;
}

export function RMAList({ currentUser, openCaseId, onOpenCaseHandled }: RMAListProps) {
  const { createCase, updateCase } = useRMACases();
  const [showForm, setShowForm] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all'); // 'all' | '30' | '60' | '90'
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [dnrFilter, setDnrFilter] = useState<boolean>(false); // Filter for DNR (Do Not Return) cases
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [allRMACases, setAllRMACases] = useState<any[]>([]);
  const [loadingAllCases, setLoadingAllCases] = useState(true);
  
  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState<string>('');
  const [exportDateTo, setExportDateTo] = useState<string>('');
  
  // Debounce search term - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Available fields for export with their keys and labels
  const exportFields = [
    { key: 'rmaNumber', label: 'RMA #' },
    { key: 'callLogNumber', label: 'Call Log #' },
    { key: 'rmaOrderNumber', label: 'Order #' },
    { key: 'rmaType', label: 'Type' },
    { key: 'rmaRaisedDate', label: 'Raised Date' },
    { key: 'customerErrorDate', label: 'Error Date' },
    { key: 'site', label: 'Site' },
    { key: 'audiNo', label: 'Audi No' },
    { key: 'productName', label: 'Product' },
    { key: 'productPartNumber', label: 'Product Part Number' },
    { key: 'serialNumber', label: 'Serial #' },
    { key: 'defectivePartName', label: 'Defective Part Name' },
    { key: 'defectivePartNumber', label: 'Defective Part Number' },
    { key: 'defectivePartSerial', label: 'Defective Part Serial' },
    { key: 'returnTrackingNumber', label: 'Return Tracking' },
    { key: 'returnShippedThrough', label: 'Return Carrier' },
    { key: 'returnShippedDate', label: 'Return Shipped Date' },
    { key: 'replacedPartNumber', label: 'Replacement Part Number' },
    { key: 'replacedPartSerial', label: 'Replacement Part Serial' },
    { key: 'trackingNumberOut', label: 'Out Tracking' },
    { key: 'shippingCarrier', label: 'Shipping Carrier' },
    { key: 'shippedDate', label: 'Shipped Date' },
    { key: 'status', label: 'Status' },
    { key: 'createdBy', label: 'Created By' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'defectDetails', label: 'Defect Details' },
    { key: 'isDefectivePartDNR', label: 'DNR (Do Not Return)' },
    { key: 'defectivePartDNRReason', label: 'DNR Reason' },
    { key: 'notes', label: 'Notes' },
  ];
  
  // State for selected export fields (default: all selected)
  const [selectedExportFields, setSelectedExportFields] = useState<Set<string>>(
    new Set(exportFields.map(f => f.key))
  );

  // Function to load all RMA cases
  const fetchAllCases = async () => {
    setLoadingAllCases(true);
    try {
      const allCases: any[] = [];
      let page = 1;
      let totalCases = 0;
      
      // First, get the total count
      const firstResponse = await rmaService.getAllRMACases({ page: 1, limit: 100 });
      if (firstResponse.success && firstResponse.data) {
        allCases.push(...firstResponse.data.cases);
        totalCases = firstResponse.data.total;
        
        // Continue fetching remaining pages
        while (allCases.length < totalCases && firstResponse.data.cases.length > 0) {
          page++;
          const response = await rmaService.getAllRMACases({ page, limit: 100 });
          if (response.success && response.data && response.data.cases.length > 0) {
            allCases.push(...response.data.cases);
          } else {
            break;
          }
        }
      }
      
      console.log(`RMAList: Loaded ${allCases.length} RMA cases (total: ${totalCases})`);
      setAllRMACases(allCases);
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error loading all RMA cases:', error);
    } finally {
      setLoadingAllCases(false);
    }
  };

  // Load ALL RMA cases once on mount (no pagination)
  useEffect(() => {
    fetchAllCases();
  }, []); // Only run once on mount

  // Open case from global search when list has loaded
  useEffect(() => {
    if (!openCaseId || !allRMACases.length) return;
    const found = allRMACases.some((r) => r.id === openCaseId);
    if (found) {
      setSelectedRMA(openCaseId);
      onOpenCaseHandled?.();
    }
  }, [openCaseId, allRMACases, onOpenCaseHandled]);

  // Debug: Log when dialog state changes
  useEffect(() => {
    console.log('showExportDialog state changed:', showExportDialog);
  }, [showExportDialog]);

  useEffect(() => {
    console.log('showExportDialog state changed:', showExportDialog);
  }, [showExportDialog]);

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

  // Available years (from ALL cases)
  const availableYears: number[] = Array.from(
    new Set(
      allRMACases
        .map(r => getYearFromDate(r.rmaRaisedDate))
        .filter((y): y is number => y !== null)
    )
  );
  availableYears.sort((a, b) => b - a);

  // Check if any filters are active (search, status, type, date range, year, age, dnr)
  const hasActiveFilters = debouncedSearchTerm || 
    statusFilter !== 'all' || 
    typeFilter !== 'all' || 
    dateFrom || 
    dateTo || 
    yearFilter !== 'all' || 
    ageFilter !== 'all' ||
    dnrFilter;

  // Apply backend filters (status, type, search, dnr) - these are applied server-side when loading
  // But since we load all cases, we need to apply them client-side too
  // Only show results if there's a search term or active filters
  const backendFilteredCases = hasActiveFilters ? allRMACases.filter(r => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        // Pending includes both "Yet to Deliver" and "In Transit"
        if (r.status !== 'rma_raised_yet_to_deliver' && r.status !== 'faulty_in_transit_to_cds') {
          return false;
        }
      } else if (r.status !== statusFilter) {
        return false;
      }
    }
    if (typeFilter !== 'all' && r.rmaType !== typeFilter) return false;
    // DNR filter - if active, only show cases where isDefectivePartDNR is true
    if (dnrFilter && !r.isDefectivePartDNR) return false;
    if (debouncedSearchTerm) {
      const search = debouncedSearchTerm.toLowerCase();
      const siteName = getSiteName(r.site || r.siteName);
      const matchesSearch =
        (r.rmaNumber?.toLowerCase() || '').includes(search) ||
        (r.callLogNumber?.toLowerCase() || '').includes(search) ||
        (r.rmaOrderNumber?.toLowerCase() || '').includes(search) ||
        (siteName?.toLowerCase() || '').includes(search) ||
        (r.productName?.toLowerCase() || '').includes(search) ||
        (r.serialNumber?.toLowerCase() || '').includes(search) ||
        (r.defectivePartName?.toLowerCase() || '').includes(search) ||
        (r.defectivePartNumber?.toLowerCase() || '').includes(search) ||
        (r.defectivePartSerial?.toLowerCase() || '').includes(search) ||
        (r.replacedPartNumber?.toLowerCase() || '').includes(search) ||
        (r.replacedPartSerial?.toLowerCase() || '').includes(search);
      if (!matchesSearch) return false;
    }
    return true;
  }) : [];

  // Apply date range filter first (takes precedence over year filter)
  const dateRangeFilteredCases = (dateFrom || dateTo)
    ? backendFilteredCases.filter(r => isDateInRange(r.rmaRaisedDate, dateFrom, dateTo))
    : backendFilteredCases;

  // Apply year filter (only if date range is not active)
  const yearFilteredCases = (dateFrom || dateTo)
    ? dateRangeFilteredCases // Date range takes precedence
    : (yearFilter === 'all'
        ? dateRangeFilteredCases
        : dateRangeFilteredCases.filter(r => getYearFromDate(r.rmaRaisedDate) === Number(yearFilter)));

  // For statistics: show ALL cases when no filters are applied, otherwise show filtered cases
  const casesForStats = !hasActiveFilters ? allRMACases : yearFilteredCases;

  // Calculate statistics
  const rmaStats = useMemo(() => {
    const rmaRaised = casesForStats.filter(r => r.status === 'rma_raised_yet_to_deliver').length;
    const inTransit = casesForStats.filter(r => r.status === 'faulty_in_transit_to_cds').length;
    const stats = {
      total: casesForStats.length,
      open: casesForStats.filter(r => r.status === 'open').length,
      rmaRaised,
      inTransit,
      pending: rmaRaised + inTransit, // Combined count of Yet to Deliver and In Transit
      closed: casesForStats.filter(r => r.status === 'closed').length,
      cancelled: casesForStats.filter(r => r.status === 'cancelled').length,
      dnr: casesForStats.filter(r => r.isDefectivePartDNR === true).length,
    };
    
    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('RMA Statistics:', {
        allRMACases: allRMACases.length,
        casesForStats: casesForStats.length,
        hasActiveFilters,
        stats
      });
    }
    
    return stats;
  }, [casesForStats, allRMACases.length, hasActiveFilters]);

  // Apply age filter (client-side only, as it's not a backend filter)
  // Note: status, type, and search are already applied in backendFilteredCases
  const filteredCases = yearFilteredCases.filter((rma) => {
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

    return matchesAge;
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

  // Toggle export field selection
  const toggleExportField = (fieldKey: string) => {
    const newSelected = new Set(selectedExportFields);
    if (newSelected.has(fieldKey)) {
      newSelected.delete(fieldKey);
    } else {
      newSelected.add(fieldKey);
    }
    setSelectedExportFields(newSelected);
  };

  // Select all / deselect all export fields
  const toggleAllExportFields = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedExportFields(new Set(exportFields.map(f => f.key)));
    } else {
      setSelectedExportFields(new Set());
    }
  };

  // Get field value for export
  const getFieldValue = (rma: any, fieldKey: string): string => {
    switch (fieldKey) {
      case 'rmaNumber':
        return rma.rmaNumber || '-';
      case 'callLogNumber':
        return rma.callLogNumber || '-';
      case 'rmaOrderNumber':
        return rma.rmaOrderNumber || '-';
      case 'rmaType':
        return rma.rmaType || '-';
      case 'rmaRaisedDate':
        return formatDateForCSV(rma.rmaRaisedDate);
      case 'customerErrorDate':
        return formatDateForCSV(rma.customerErrorDate);
      case 'site':
        return getSiteName(rma.site || rma.siteName) || '-';
      case 'audiNo':
        return rma.audi?.audiNo || rma.audiNo || '-';
      case 'productName':
        return rma.productName || '-';
      case 'productPartNumber':
        return rma.productPartNumber || '-';
      case 'serialNumber':
        return rma.serialNumber || '-';
      case 'defectivePartName':
        return rma.defectivePartName || '-';
      case 'defectivePartNumber':
        return rma.defectivePartNumber || '-';
      case 'defectivePartSerial':
        return rma.defectivePartSerial || '-';
      case 'returnTrackingNumber':
        return rma.returnTrackingNumber || '-';
      case 'returnShippedThrough':
        return rma.returnShippedThrough || '-';
      case 'returnShippedDate':
        return formatDateForCSV(rma.returnShippedDate);
      case 'replacedPartNumber':
        return rma.replacedPartNumber || '-';
      case 'replacedPartSerial':
        return rma.replacedPartSerial || '-';
      case 'trackingNumberOut':
        return rma.trackingNumberOut || '-';
      case 'shippingCarrier':
        return rma.shippingCarrier || '-';
      case 'shippedDate':
        return formatDateForCSV(rma.shippedDate);
      case 'status':
        return rma.status || '-';
      case 'createdBy':
        return getUserName(rma.creator || rma.createdBy);
      case 'assignedTo':
        return getUserName(rma.assignee || rma.assignedTo) || '-';
      case 'symptoms':
        return rma.symptoms || '-';
      case 'defectDetails':
        return rma.defectDetails || '-';
      case 'isDefectivePartDNR':
        return rma.isDefectivePartDNR ? 'Yes' : 'No';
      case 'defectivePartDNRReason':
        return rma.defectivePartDNRReason || '-';
      case 'notes':
        return rma.notes || '-';
      default:
        return '-';
    }
  };

  // Handle export with selected fields and date range
  const handleExport = () => {
    try {
      // Check if at least one field is selected
      if (selectedExportFields.size === 0) {
        alert('Please select at least one field to export.');
        return;
      }

      // Filter cases by export date range if set
      let casesToExport = allRMACases;
      if (exportDateFrom || exportDateTo) {
        casesToExport = allRMACases.filter(r => isDateInRange(r.rmaRaisedDate, exportDateFrom, exportDateTo));
      }

      if (casesToExport.length === 0) {
        alert('No cases found matching the selected criteria.');
        return;
      }

      // Get selected fields in order
      const selectedFields = exportFields.filter(f => selectedExportFields.has(f.key));
      
      // Build CSV header
      const headers = selectedFields.map(f => f.label);
      
      // Build CSV rows
      const rows = casesToExport.map(rma => {
        return selectedFields.map(f => escapeCsvValue(getFieldValue(rma, f.key)));
      });

      // Combine header and rows
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Generate filename with date range if applicable
      let filename = `rma-cases-${new Date().toISOString().split('T')[0]}`;
      if (exportDateFrom || exportDateTo) {
        const fromStr = exportDateFrom ? exportDateFrom.replace(/-/g, '') : 'all';
        const toStr = exportDateTo ? exportDateTo.replace(/-/g, '') : 'all';
        filename += `-${fromStr}-to-${toStr}`;
      }
      filename += '.csv';
      
      // Create and download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Close dialog after export
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export CSV. Please check the console for details.');
    }
  };

  // Handle export date range changes
  const handleExportDateFromChange = (value: string) => {
    setExportDateFrom(value);
    if (value && exportDateTo && new Date(value) > new Date(exportDateTo)) {
      setExportDateTo('');
    }
  };

  const handleExportDateToChange = (value: string) => {
    if (value && exportDateFrom && new Date(value) < new Date(exportDateFrom)) {
      alert('To Date must be after or equal to From Date');
      return;
    }
    setExportDateTo(value);
  };

  // Get overdue RMA cases (30+ days in transit)
  const getOverdueRMAs = (minDays: number = 30) => {
    return allRMACases.filter(rma => {
      // Must be in "faulty_in_transit_to_cds" status
      if (rma.status !== 'faulty_in_transit_to_cds') return false;
      
      // Must have a shipped date
      if (!rma.shippedDate) return false;
      
      // Calculate days since shipped
      const shipped = new Date(rma.shippedDate);
      if (Number.isNaN(shipped.getTime())) return false;
      
      const diffMs = Date.now() - shipped.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      return diffDays >= minDays;
    });
  };

  // Export overdue RMAs to Excel
  const handleExportOverdueToExcel = () => {
    try {
      const overdueCases = getOverdueRMAs(30);
      
      if (overdueCases.length === 0) {
        alert('No overdue RMA cases found (30+ days in transit).');
        return;
      }

      // Prepare data for Excel with all details
      const excelData = overdueCases.map(rma => {
        const shipped = rma.shippedDate ? new Date(rma.shippedDate) : null;
        const daysOverdue = shipped && !Number.isNaN(shipped.getTime())
          ? Math.floor((Date.now() - shipped.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          'RMA Number': rma.rmaNumber || '-',
          'Call Log Number': rma.callLogNumber || '-',
          'RMA Order Number': rma.rmaOrderNumber || '-',
          'RMA Type': rma.rmaType || '-',
          'RMA Raised Date': rma.rmaRaisedDate ? formatDateForCSV(rma.rmaRaisedDate) : '-',
          'Customer Error Date': rma.customerErrorDate ? formatDateForCSV(rma.customerErrorDate) : '-',
          'Site Name': getSiteName(rma.site || rma.siteName) || '-',
          'Audi Number': rma.audi?.audiNo || rma.audiNo || '-',
          'Product Name': rma.productName || '-',
          'Product Part Number': rma.productPartNumber || '-',
          'Serial Number': rma.serialNumber || '-',
          'Defect Details': rma.defectDetails || '-',
          'Symptoms': rma.symptoms || '-',
          'Defective Part Name': rma.defectivePartName || '-',
          'Defective Part Number': rma.defectivePartNumber || '-',
          'Defective Part Serial': rma.defectivePartSerial || '-',
          'Is DNR': rma.isDefectivePartDNR ? 'Yes' : 'No',
          'DNR Reason': rma.defectivePartDNRReason || '-',
          'Replacement Part Number': rma.replacedPartNumber || '-',
          'Replacement Part Serial': rma.replacedPartSerial || '-',
          'Shipping Carrier': rma.shippingCarrier || '-',
          'Tracking Number (Outbound)': rma.trackingNumberOut || '-',
          'Shipped Date': rma.shippedDate ? formatDateForCSV(rma.shippedDate) : '-',
          'Days Overdue': daysOverdue,
          'Return Shipped Through': rma.returnShippedThrough || '-',
          'Return Tracking Number': rma.returnTrackingNumber || '-',
          'Return Shipped Date': rma.returnShippedDate ? formatDateForCSV(rma.returnShippedDate) : '-',
          'Status': rma.status || '-',
          'Created By': getUserName(rma.creator || rma.createdBy),
          'Assigned To': getUserName(rma.assignee || rma.assignedTo) || '-',
          'Notes': rma.notes || '-',
        };
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // RMA Number
        { wch: 15 }, // Call Log Number
        { wch: 15 }, // RMA Order Number
        { wch: 12 }, // RMA Type
        { wch: 12 }, // RMA Raised Date
        { wch: 12 }, // Customer Error Date
        { wch: 25 }, // Site Name
        { wch: 12 }, // Audi Number
        { wch: 20 }, // Product Name
        { wch: 18 }, // Product Part Number
        { wch: 15 }, // Serial Number
        { wch: 30 }, // Defect Details
        { wch: 30 }, // Symptoms
        { wch: 20 }, // Defective Part Name
        { wch: 18 }, // Defective Part Number
        { wch: 18 }, // Defective Part Serial
        { wch: 8 },  // Is DNR
        { wch: 30 }, // DNR Reason
        { wch: 20 }, // Replacement Part Number
        { wch: 18 }, // Replacement Part Serial
        { wch: 15 }, // Shipping Carrier
        { wch: 20 }, // Tracking Number (Outbound)
        { wch: 12 }, // Shipped Date
        { wch: 12 }, // Days Overdue
        { wch: 18 }, // Return Shipped Through
        { wch: 20 }, // Return Tracking Number
        { wch: 12 }, // Return Shipped Date
        { wch: 15 }, // Status
        { wch: 15 }, // Created By
        { wch: 15 }, // Assigned To
        { wch: 30 }, // Notes
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Overdue RMAs');

      // Generate filename with current date
      const filename = `overdue-rma-cases-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      alert(`Exported ${overdueCases.length} overdue RMA case(s) to Excel successfully!`);
    } catch (error) {
      console.error('Export overdue RMAs error:', error);
      alert('Failed to export overdue RMAs to Excel. Please check the console for details.');
    }
  };

  // Only show full page loader on initial load
  if (loadingAllCases && isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading RMA cases...</p>
        </div>
      </div>
    );
  }

  if (selectedRMA) {
    const rma = allRMACases.find(r => r.id === selectedRMA);
    if (rma) {
      return (
        <RMADetail
          rma={rma}
          currentUser={currentUser}
          onClose={() => setSelectedRMA(null)}
          onUpdate={async (id, data, userEmail, action, details) => {
            await updateCase(id, data);
            // Reload all cases after update
            await fetchAllCases();
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
            // Reload all cases after create
            await fetchAllCases();
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
        <ProtectedComponent permission="rma:create">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New RMA Case
          </button>
        </ProtectedComponent>
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {/* Total */}
          <div 
            onClick={() => {
              setStatusFilter('all');
              setDnrFilter(false);
              setSearchTerm('');
              setTypeFilter('all');
              setAgeFilter('all');
              setYearFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
            title="Click to show all cases"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Total</p>
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.total}</p>
          </div>
          
          {/* Open */}
          <div 
            onClick={() => {
              setStatusFilter('open');
              setDnrFilter(false);
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-orange-400"
            title="Click to filter by Open cases"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Open</p>
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.open}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.open / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* Pending - Combined Yet to Deliver and In Transit */}
          <div 
            onClick={() => {
              setStatusFilter('pending');
              setDnrFilter(false);
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-400"
            title="Click to filter by Pending cases (Yet to Deliver + In Transit)"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Pending</p>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.pending}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.pending / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* RMA Raised */}
          <div 
            onClick={() => {
              setStatusFilter('rma_raised_yet_to_deliver');
              setDnrFilter(false);
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-yellow-400"
            title="Click to filter by Yet to Deliver cases"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Yet to Deliver</p>
              <Clock className="w-4 h-4 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.rmaRaised}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.rmaRaised / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* In Transit */}
          <div 
            onClick={() => {
              setStatusFilter('faulty_in_transit_to_cds');
              setDnrFilter(false);
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-purple-400"
            title="Click to filter by In Transit cases"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">In Transit</p>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.inTransit}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.inTransit / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* Closed */}
          <div 
            onClick={() => {
              setStatusFilter('closed');
              setDnrFilter(false);
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-green-400"
            title="Click to filter by Closed cases"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Closed</p>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.closed}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.closed / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* Cancelled */}
          <div 
            onClick={() => {
              setStatusFilter('cancelled');
              setDnrFilter(false);
            }}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-red-400"
            title="Click to filter by Cancelled cases"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Cancelled</p>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{rmaStats.cancelled}</p>
            <p className="text-xs text-gray-500 mt-1">{rmaStats.total > 0 ? Math.round((rmaStats.cancelled / rmaStats.total) * 100) : 0}%</p>
          </div>
          
          {/* DNR Cases */}
          <div 
            onClick={() => {
              setDnrFilter(!dnrFilter);
              setStatusFilter('all'); // Clear status filter when filtering by DNR
            }}
            className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer bg-red-50 ${
              dnrFilter ? 'border-red-500 border-2' : 'border-red-300'
            } hover:border-red-500`}
            title="Click to filter by DNR (Do Not Return) cases"
          >
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
                placeholder="Search by RMA #, call log, site, product, serial, defective/replacement part S/N..."
                className={`w-full pl-10 ${loadingAllCases && !isInitialLoad ? 'pr-10' : 'pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {loadingAllCases && !isInitialLoad && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}
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
              <option value="pending">Pending (Yet to Deliver + In Transit)</option>
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
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">
              Showing {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
              {filteredCases.length !== allRMACases.length && (
                <span className="text-blue-600 font-medium ml-1">
                  (filtered from {allRMACases.length} total)
                </span>
              )}
            </p>
            {(dateFrom || dateTo || yearFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || searchTerm || dnrFilter) && (
              <p className="text-xs text-gray-500 mt-1">
                Filters: {[
                  dateFrom || dateTo ? `Date: ${dateFrom ? formatDate(dateFrom) : 'Any'} to ${dateTo ? formatDate(dateTo) : 'Any'}` : null,
                  yearFilter !== 'all' ? `Year: ${yearFilter}` : null,
                  statusFilter !== 'all' ? `Status: ${statusFilter === 'pending' ? 'Pending (Yet to Deliver + In Transit)' : statusFilter}` : null,
                  typeFilter !== 'all' ? `Type: ${typeFilter}` : null,
                  dnrFilter ? 'DNR (Do Not Return)' : null,
                  searchTerm ? `Search: "${searchTerm}"` : null
                ].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportOverdueToExcel}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm text-red-700 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors border border-red-200 w-full sm:w-auto"
              title="Export overdue RMAs (30+ days in transit) to Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Overdue (Excel)
            </button>
            <button
              onClick={() => {
                console.log('Export button clicked, setting showExportDialog to true');
                setShowExportDialog(true);
                console.log('Dialog state should be true now');
              }}
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
        <div className="overflow-x-auto max-h-[calc(100vh-14rem)]">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">RMA #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Call Log #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Order #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Site</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Audi No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Defective Part</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Replacement Part</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Team</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {!hasActiveFilters ? (
                <tr>
                  <td colSpan={13} className="px-6 py-20">
                    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto">
                      {/* Icon Container */}
                      <div className="relative mb-8">
                        <div className="relative inline-flex items-center justify-center">
                          {/* Subtle background glow */}
                          <div className="absolute inset-0 bg-blue-200 rounded-full blur-3xl opacity-30"></div>
                          {/* Main icon circle */}
                          <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-6 shadow-xl">
                            <Search className="w-10 h-10 text-white" strokeWidth={2} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Title and Description */}
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          Start Your Search
                        </h3>
                        <p className="text-base text-gray-600 leading-relaxed max-w-lg mx-auto">
                          Enter a search term or apply filters to view RMA cases. You can search by RMA number, call log, site name, product, serial number, or part details.
                        </p>
                      </div>
                      
                      {/* Filter Pills with Icons */}
                      <div className="flex flex-wrap gap-3 justify-center">
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                          <span className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm">
                            <Search className="w-3.5 h-3.5" />
                            Search
                          </span>
                        </div>
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                          <span className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200 shadow-sm">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Status
                          </span>
                        </div>
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-green-600 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                          <span className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200 shadow-sm">
                            <Package className="w-3.5 h-3.5" />
                            Type
                          </span>
                        </div>
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                          <span className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border border-orange-200 shadow-sm">
                            <Calendar className="w-3.5 h-3.5" />
                            Date Range
                          </span>
                        </div>
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                          <span className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-pink-50 to-pink-100 text-pink-700 border border-pink-200 shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            Year
                          </span>
                        </div>
                        <div className="group relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                          <span className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border border-yellow-200 shadow-sm">
                            <TrendingUp className="w-3.5 h-3.5" />
                            Age
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-20">
                    <div className="flex flex-col items-center justify-center max-w-xl mx-auto">
                      {/* Icon Container */}
                      <div className="relative mb-8">
                        <div className="relative inline-flex items-center justify-center">
                          {/* Subtle background glow */}
                          <div className="absolute inset-0 bg-gray-300 rounded-full blur-3xl opacity-30"></div>
                          {/* Main icon circle */}
                          <div className="relative bg-gradient-to-br from-gray-400 to-slate-500 rounded-full p-6 shadow-xl">
                            <Package className="w-10 h-10 text-white" strokeWidth={2} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Title and Description */}
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No results found</h3>
                        <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto mb-6">
                          No RMA cases match your current search criteria. Clear filters or create a new case.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={() => {
                              setSearchTerm('');
                              setStatusFilter('all');
                              setTypeFilter('all');
                              setDateFrom('');
                              setDateTo('');
                              setYearFilter('all');
                              setAgeFilter('all');
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                          >
                            <X className="w-4 h-4" />
                            Clear filters
                          </button>
                          <ProtectedComponent permission="rma:create">
                            <button
                              onClick={() => setShowForm(true)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                            >
                              <Plus className="w-4 h-4" />
                              New RMA case
                            </button>
                          </ProtectedComponent>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((rma) => (
                <tr key={rma.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {/* RMA # */}
                  <td className="px-4 py-4 whitespace-nowrap min-w-[110px]">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{rma.rmaNumber || '-'}</span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Dialog - Using Portal to ensure it renders on top */}
      {showExportDialog && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 9999
          }}
          onClick={(e) => {
            // Close dialog when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowExportDialog(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Export CSV</h3>
                <p className="text-sm text-gray-600 mt-1">Select fields and date range for export</p>
              </div>
              <button
                onClick={() => setShowExportDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Date Range Section */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">Filter by Date Range (RMA Raised Date)</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From Date (Optional)</label>
                    <input
                      type="date"
                      value={exportDateFrom}
                      onChange={(e) => handleExportDateFromChange(e.target.value)}
                      max={exportDateTo || undefined}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To Date (Optional)</label>
                    <input
                      type="date"
                      value={exportDateTo}
                      onChange={(e) => handleExportDateToChange(e.target.value)}
                      min={exportDateFrom || undefined}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {exportDateFrom || exportDateTo ? (
                  <p className="text-xs text-blue-600 mt-2">
                    Exporting cases from {exportDateFrom ? formatDate(exportDateFrom) : 'any start'} to {exportDateTo ? formatDate(exportDateTo) : 'any end'}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">Leave blank to export all cases</p>
                )}
              </div>

              {/* Field Selection Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700">Select Fields to Export</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAllExportFields(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => toggleAllExportFields(false)}
                      className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {exportFields.map((field) => {
                    const isSelected = selectedExportFields.has(field.key);
                    return (
                      <label
                        key={field.key}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      >
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleExportField(field.key)}
                          className="sr-only"
                        />
                        <span className="text-sm text-gray-700">{field.label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {selectedExportFields.size} of {exportFields.length} fields selected
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowExportDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={selectedExportFields.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}