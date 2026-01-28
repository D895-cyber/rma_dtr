import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Filter, X } from 'lucide-react';
import { analyticsService, RmaAgingResponse, RmaAgingGroup } from '../services/analytics.service';

interface RMAAgingAnalyticsProps {
  currentUser: any;
}

export function RMAAgingAnalytics({ currentUser }: RMAAgingAnalyticsProps) {
  const [data, setData] = useState<RmaAgingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<null | 'serial' | 'part' | 'site'>(null);
  const serialWrapRef = useRef<HTMLDivElement | null>(null);
  const partWrapRef = useRef<HTMLDivElement | null>(null);
  const siteWrapRef = useRef<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    thresholdDays: 30,
    minRepeats: 2,
    showOnlyShortest: false,
    selectedSerialNumbers: [] as string[],
    selectedPartNames: [] as string[],
    selectedSiteNames: [] as string[],
  });
  const [filterOptions, setFilterOptions] = useState({
    serialNumbers: [] as string[],
    partNames: [] as string[],
    siteNames: [] as string[],
  });
  const [searchInputs, setSearchInputs] = useState({
    serialNumber: '',
    partName: '',
    siteName: '',
  });

  // Close dropdown on click outside / escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const wrap =
        activeDropdown === 'serial'
          ? serialWrapRef.current
          : activeDropdown === 'part'
            ? partWrapRef.current
            : activeDropdown === 'site'
              ? siteWrapRef.current
              : null;

      if (wrap && !wrap.contains(target)) {
        setActiveDropdown(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeDropdown]);

  const filteredSerialOptions = useMemo(() => {
    const q = searchInputs.serialNumber.trim().toLowerCase();
    if (!q) return [];
    return filterOptions.serialNumbers
      .filter(sn => sn.toLowerCase().includes(q))
      .slice(0, 10);
  }, [filterOptions.serialNumbers, searchInputs.serialNumber]);

  const filteredPartOptions = useMemo(() => {
    const q = searchInputs.partName.trim().toLowerCase();
    if (!q) return [];
    return filterOptions.partNames
      .filter(pn => pn.toLowerCase().includes(q))
      .slice(0, 10);
  }, [filterOptions.partNames, searchInputs.partName]);

  const filteredSiteOptions = useMemo(() => {
    const q = searchInputs.siteName.trim().toLowerCase();
    if (!q) return [];
    return filterOptions.siteNames
      .filter(sn => sn.toLowerCase().includes(q))
      .slice(0, 10);
  }, [filterOptions.siteNames, searchInputs.siteName]);

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await analyticsService.getRmaAgingFilterOptions({
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
        });
        if (res.success && res.data) {
          setFilterOptions(res.data);
        }
      } catch (err) {
        console.error('Failed to load filter options', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [filters.fromDate, filters.toDate]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await analyticsService.getRmaAging({
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          thresholdDays: filters.thresholdDays,
          minRepeats: filters.minRepeats,
          showOnlyShortest: filters.showOnlyShortest,
          serialNumbers: filters.selectedSerialNumbers.length > 0 ? filters.selectedSerialNumbers : undefined,
          partNames: filters.selectedPartNames.length > 0 ? filters.selectedPartNames : undefined,
          siteNames: filters.selectedSiteNames.length > 0 ? filters.selectedSiteNames : undefined,
        });
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load RMA aging analytics', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    filters.fromDate, 
    filters.toDate, 
    filters.thresholdDays, 
    filters.minRepeats, 
    filters.showOnlyShortest,
    filters.selectedSerialNumbers,
    filters.selectedPartNames,
    filters.selectedSiteNames,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">RMA Aging Analytics</h2>
          <p className="text-sm text-gray-600">
            Find cases where the same part has repeated RMAs on the same projector within a short period.
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p>Logged in as</p>
          <p className="font-medium text-gray-700">{currentUser?.email}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
          {(filters.fromDate || filters.toDate) && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, fromDate: '', toDate: '' }))}
              className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-3 h-3" />
              Clear dates
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => {
                const from = e.target.value;
                setFilters(prev => ({
                  ...prev,
                  fromDate: from,
                  toDate: prev.toDate && from && new Date(prev.toDate) < new Date(from) ? '' : prev.toDate,
                }));
              }}
              max={filters.toDate || undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => {
                const to = e.target.value;
                if (to && filters.fromDate && new Date(to) < new Date(filters.fromDate)) {
                  alert('To Date must be after or equal to From Date');
                  return;
                }
                setFilters(prev => ({ ...prev, toDate: to }));
              }}
              min={filters.fromDate || undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Threshold Days</label>
            <input
              type="number"
              min={1}
              max={365}
              value={filters.thresholdDays}
              onChange={(e) =>
                setFilters(prev => ({ ...prev, thresholdDays: parseInt(e.target.value, 10) || 30 }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Max days between consecutive RMAs</p>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Min Repeats</label>
            <input
              type="number"
              min={2}
              max={100}
              value={filters.minRepeats}
              onChange={(e) =>
                setFilters(prev => ({ ...prev, minRepeats: parseInt(e.target.value, 10) || 2 }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum cases per projector+part</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showOnlyShortest}
              onChange={(e) =>
                setFilters(prev => ({ ...prev, showOnlyShortest: e.target.checked }))
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Show only shortest gap per projector-part
            </span>
            <span className="text-xs text-gray-500 ml-2">
              (If unchecked, shows all repeat pairs)
            </span>
          </label>
        </div>

        {/* Search Filters */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Search Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Serial Number Filter */}
            <div className="relative" ref={serialWrapRef}>
              <label className="block text-xs text-gray-600 mb-1">Serial Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInputs.serialNumber}
                  onChange={(e) => {
                    setSearchInputs(prev => ({ ...prev, serialNumber: e.target.value }));
                    setActiveDropdown('serial');
                  }}
                  onFocus={() => setActiveDropdown('serial')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchInputs.serialNumber.trim()) {
                      const value = searchInputs.serialNumber.trim();
                      if (!filters.selectedSerialNumbers.includes(value)) {
                        setFilters(prev => ({
                          ...prev,
                          selectedSerialNumbers: [...prev.selectedSerialNumbers, value],
                        }));
                        setSearchInputs(prev => ({ ...prev, serialNumber: '' }));
                        setActiveDropdown(null);
                      }
                    }
                  }}
                  placeholder="Type to search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {activeDropdown === 'serial' && searchInputs.serialNumber && (
                  <div className="mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredSerialOptions.length > 0 ? (
                      filteredSerialOptions.map((sn) => (
                        <div
                          key={sn}
                          onClick={() => {
                            if (!filters.selectedSerialNumbers.includes(sn)) {
                              setFilters(prev => ({
                                ...prev,
                                selectedSerialNumbers: [...prev.selectedSerialNumbers, sn],
                              }));
                            }
                            setSearchInputs(prev => ({ ...prev, serialNumber: '' }));
                            setActiveDropdown(null);
                          }}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-700 transition-colors"
                        >
                          {sn}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
                    )}
                  </div>
                )}
              </div>
              {filters.selectedSerialNumbers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.selectedSerialNumbers.map((sn) => (
                    <span
                      key={sn}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium border border-blue-200"
                    >
                      {sn}
                      <button
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            selectedSerialNumbers: prev.selectedSerialNumbers.filter(s => s !== sn),
                          }));
                        }}
                        className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${sn}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Part Name Filter */}
            <div className="relative" ref={partWrapRef}>
              <label className="block text-xs text-gray-600 mb-1">Part Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInputs.partName}
                  onChange={(e) => {
                    setSearchInputs(prev => ({ ...prev, partName: e.target.value }));
                    setActiveDropdown('part');
                  }}
                  onFocus={() => setActiveDropdown('part')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchInputs.partName.trim()) {
                      const value = searchInputs.partName.trim();
                      if (!filters.selectedPartNames.includes(value)) {
                        setFilters(prev => ({
                          ...prev,
                          selectedPartNames: [...prev.selectedPartNames, value],
                        }));
                        setSearchInputs(prev => ({ ...prev, partName: '' }));
                        setActiveDropdown(null);
                      }
                    }
                  }}
                  placeholder="Type to search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {activeDropdown === 'part' && searchInputs.partName && (
                  <div className="mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredPartOptions.length > 0 ? (
                      filteredPartOptions.map((pn) => (
                        <div
                          key={pn}
                          onClick={() => {
                            if (!filters.selectedPartNames.includes(pn)) {
                              setFilters(prev => ({
                                ...prev,
                                selectedPartNames: [...prev.selectedPartNames, pn],
                              }));
                            }
                            setSearchInputs(prev => ({ ...prev, partName: '' }));
                            setActiveDropdown(null);
                          }}
                          className="px-3 py-2 hover:bg-green-50 cursor-pointer text-sm text-gray-700 transition-colors"
                        >
                          {pn}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
                    )}
                  </div>
                )}
              </div>
              {filters.selectedPartNames.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.selectedPartNames.map((pn) => (
                    <span
                      key={pn}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium border border-green-200"
                    >
                      {pn}
                      <button
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            selectedPartNames: prev.selectedPartNames.filter(p => p !== pn),
                          }));
                        }}
                        className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${pn}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Site Name Filter */}
            <div className="relative" ref={siteWrapRef}>
              <label className="block text-xs text-gray-600 mb-1">Site Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchInputs.siteName}
                  onChange={(e) => {
                    setSearchInputs(prev => ({ ...prev, siteName: e.target.value }));
                    setActiveDropdown('site');
                  }}
                  onFocus={() => setActiveDropdown('site')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchInputs.siteName.trim()) {
                      const value = searchInputs.siteName.trim();
                      if (!filters.selectedSiteNames.includes(value)) {
                        setFilters(prev => ({
                          ...prev,
                          selectedSiteNames: [...prev.selectedSiteNames, value],
                        }));
                        setSearchInputs(prev => ({ ...prev, siteName: '' }));
                        setActiveDropdown(null);
                      }
                    }
                  }}
                  placeholder="Type to search..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                {activeDropdown === 'site' && searchInputs.siteName && (
                  <div className="mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {filteredSiteOptions.length > 0 ? (
                      filteredSiteOptions.map((sn) => (
                        <div
                          key={sn}
                          onClick={() => {
                            if (!filters.selectedSiteNames.includes(sn)) {
                              setFilters(prev => ({
                                ...prev,
                                selectedSiteNames: [...prev.selectedSiteNames, sn],
                              }));
                            }
                            setSearchInputs(prev => ({ ...prev, siteName: '' }));
                            setActiveDropdown(null);
                          }}
                          className="px-3 py-2 hover:bg-purple-50 cursor-pointer text-sm text-gray-700 transition-colors"
                        >
                          {sn}
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">No matches found</div>
                    )}
                  </div>
                )}
              </div>
              {filters.selectedSiteNames.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.selectedSiteNames.map((sn) => (
                    <span
                      key={sn}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-xs font-medium border border-purple-200"
                    >
                      {sn}
                      <button
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            selectedSiteNames: prev.selectedSiteNames.filter(s => s !== sn),
                          }));
                        }}
                        className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${sn}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {(filters.selectedSerialNumbers.length > 0 || filters.selectedPartNames.length > 0 || filters.selectedSiteNames.length > 0) && (
            <button
              onClick={() => {
                setFilters(prev => ({
                  ...prev,
                  selectedSerialNumbers: [],
                  selectedPartNames: [],
                  selectedSiteNames: [],
                }));
                setSearchInputs({
                  serialNumber: '',
                  partName: '',
                  siteName: '',
                });
              }}
              className="mt-3 text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-600 font-medium mb-1">Total RMA Cases</p>
            <p className="text-2xl font-bold text-blue-900">{data.summary.totalRmaCases}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-xs text-yellow-600 font-medium mb-1">Groups with Repeats</p>
            <p className="text-2xl font-bold text-yellow-900">{data.summary.groupsWithRepeats}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs text-red-600 font-medium mb-1">Total Repeat Pairs</p>
            <p className="text-2xl font-bold text-red-900">{data.summary.totalRepeatPairs}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 font-medium mb-1">Threshold</p>
            <p className="text-2xl font-bold text-gray-900">{data.summary.thresholdDays} days</p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading RMA aging data...</p>
          </div>
        </div>
      ) : !data || data.groups.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">No repeated RMAs found for the current filters.</p>
          <p className="text-sm mt-1">Try widening the date range or increasing the threshold days.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.groups.map((group: RmaAgingGroup) => (
            <div
              key={`${group.projectorSerial}-${group.normalizedPartName}`}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      Projector: {group.projectorSerial}
                    </h3>
                    {group.projectorModel && (
                      <span className="text-xs text-gray-500">({group.projectorModel})</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm text-gray-700">
                    <div>
                      <span className="text-gray-500">Site: </span>
                      <span className="font-medium">{group.siteName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Part: </span>
                      <span className="font-medium">
                        {group.normalizedPartName || group.partName || group.partNumber || 'Unknown'}
                      </span>
                      {group.partNumber && group.partNumber !== group.normalizedPartName && (
                        <span className="text-gray-400 ml-1">({group.partNumber})</span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-500">Total Cases: </span>
                      <span className="font-medium text-blue-600">{group.totalCases}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Repeat Pairs: </span>
                      <span className="font-medium text-red-600">{group.repeatPairs.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase text-[10px] md:text-xs">
                        First RMA
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase text-[10px] md:text-xs">
                        First Date
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase text-[10px] md:text-xs">
                        Second RMA
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 uppercase text-[10px] md:text-xs">
                        Second Date
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600 uppercase text-[10px] md:text-xs">
                        Days Between
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.repeatPairs.map((pair, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {pair.firstRmaNumber ? (
                            <span className="font-medium text-gray-900">
                              {pair.firstRmaNumber}
                            </span>
                          ) : pair.firstCallLogNumber ? (
                            <span className="font-medium text-gray-700">
                              {pair.firstCallLogNumber}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs italic" title={`Case ID: ${pair.firstCaseId}`}>
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                          {new Date(pair.firstDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {pair.secondRmaNumber ? (
                            <span className="font-medium text-gray-900">
                              {pair.secondRmaNumber}
                            </span>
                          ) : pair.secondCallLogNumber ? (
                            <span className="font-medium text-gray-700">
                              {pair.secondCallLogNumber}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-xs italic" title={`Case ID: ${pair.secondCaseId}`}>
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                          {new Date(pair.secondDate).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right">
                          <span
                            className={`font-semibold ${
                              pair.daysBetween <= 7
                                ? 'text-red-600'
                                : pair.daysBetween <= 14
                                ? 'text-orange-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            {pair.daysBetween} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

