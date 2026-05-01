import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Building2, Cpu, ExternalLink, Loader2, Search, X } from 'lucide-react';
import { masterInsightsService, InsightsProjectorAnalytics, InsightsProjectorSummary, InsightsSiteSummary } from '../services/masterInsights.service';

interface MasterInsightsProps {
  currentUser: any;
}

function formatDate(dateIso: string | null | undefined) {
  if (!dateIso) return '—';
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export function MasterInsights({ currentUser }: MasterInsightsProps) {
  const [sites, setSites] = useState<InsightsSiteSummary[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);

  const [siteSearch, setSiteSearch] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const [projectors, setProjectors] = useState<InsightsProjectorSummary[]>([]);
  const [projectorsLoading, setProjectorsLoading] = useState(false);
  const [projectorsError, setProjectorsError] = useState<string | null>(null);

  const [projectorSearch, setProjectorSearch] = useState('');
  const [selectedProjectorId, setSelectedProjectorId] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<InsightsProjectorAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const isStaff = (currentUser?.role || '').toString().toLowerCase() === 'staff';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setSitesLoading(true);
      setSitesError(null);
      try {
        const resp = await masterInsightsService.getSites();
        if (!mounted) return;
        if (resp.success && resp.data?.sites) {
          setSites(resp.data.sites);
        } else {
          setSitesError(resp.message || 'Failed to load sites');
        }
      } catch (e: any) {
        if (!mounted) return;
        setSitesError(e.message || 'Failed to load sites');
      } finally {
        if (mounted) setSitesLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadSiteProjectors = async () => {
      if (!selectedSiteId) {
        setProjectors([]);
        setSelectedProjectorId(null);
        setAnalytics(null);
        return;
      }

      setProjectorsLoading(true);
      setProjectorsError(null);
      setProjectorSearch('');
      setSelectedProjectorId(null);
      setAnalytics(null);
      setAnalyticsError(null);
      try {
        const resp = await masterInsightsService.getSiteProjectors(selectedSiteId);
        if (!mounted) return;
        if (resp.success && resp.data?.projectors) {
          setProjectors(resp.data.projectors);
        } else {
          setProjectorsError(resp.message || 'Failed to load projectors');
        }
      } catch (e: any) {
        if (!mounted) return;
        setProjectorsError(e.message || 'Failed to load projectors');
      } finally {
        if (mounted) setProjectorsLoading(false);
      }
    };
    void loadSiteProjectors();
    return () => {
      mounted = false;
    };
  }, [selectedSiteId]);

  useEffect(() => {
    let mounted = true;
    const loadProjectorAnalytics = async () => {
      if (!selectedProjectorId) {
        setAnalytics(null);
        return;
      }
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      try {
        const resp = await masterInsightsService.getProjectorAnalytics(selectedProjectorId);
        if (!mounted) return;
        if (resp.success && resp.data) {
          setAnalytics(resp.data);
        } else {
          setAnalyticsError(resp.message || 'Failed to load projector analytics');
        }
      } catch (e: any) {
        if (!mounted) return;
        setAnalyticsError(e.message || 'Failed to load projector analytics');
      } finally {
        if (mounted) setAnalyticsLoading(false);
      }
    };
    void loadProjectorAnalytics();
    return () => {
      mounted = false;
    };
  }, [selectedProjectorId]);

  const filteredSites = useMemo(() => {
    const q = siteSearch.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => s.siteName.toLowerCase().includes(q));
  }, [sites, siteSearch]);

  const selectedSite = useMemo(() => sites.find((s) => s.id === selectedSiteId) || null, [sites, selectedSiteId]);

  const filteredProjectors = useMemo(() => {
    const q = projectorSearch.trim().toLowerCase();
    if (!q) return projectors;
    return projectors.filter((p) => {
      if (p.serialNumber.toLowerCase().includes(q)) return true;
      if ((p.projectorModel?.modelNo || '').toLowerCase().includes(q)) return true;
      if (p.audis.some((a) => a.audiNo.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [projectors, projectorSearch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Master Insights</h2>
          <p className="text-sm text-gray-600">
            Sites → Projectors → RMA analytics (part-wise, recent RMAs, suggestions)
          </p>
          {isStaff && (
            <p className="text-xs text-gray-500 mt-1">
              Staff users see PVR sites only.
            </p>
          )}
        </div>
      </div>

      {/* Level 1: Sites */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-600" />
            <h3 className="text-gray-900">Sites</h3>
            {sitesLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={siteSearch}
              onChange={(e) => setSiteSearch(e.target.value)}
              placeholder="Search site..."
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {siteSearch && (
              <button
                type="button"
                onClick={() => setSiteSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear site search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {sitesError && (
          <div className="text-sm text-red-600">{sitesError}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {filteredSites.map((s) => {
            const active = s.id === selectedSiteId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSiteId(s.id)}
                className={[
                  'text-left rounded-xl border p-4 transition-colors',
                  active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{s.siteName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.siteType === 'pvr' ? 'PVR' : 'NON-PVR'}</p>
                  </div>
                  <div className="text-xs text-gray-600 whitespace-nowrap">
                    <span className="font-semibold">{s.projectorCount}</span> PJ
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    RMAs: <span className="font-semibold text-gray-900">{s.rmaCount}</span>
                  </div>
                  <div className="text-xs text-blue-700 font-medium">Open</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Level 2: Projectors */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-gray-600" />
            <h3 className="text-gray-900">Projectors {selectedSite ? <span className="text-gray-500 font-normal">({selectedSite.siteName})</span> : null}</h3>
            {projectorsLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={projectorSearch}
              onChange={(e) => setProjectorSearch(e.target.value)}
              placeholder="Search serial / model / audi..."
              disabled={!selectedSiteId}
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {projectorSearch && (
              <button
                type="button"
                onClick={() => setProjectorSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear projector search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {!selectedSiteId && (
          <div className="text-sm text-gray-600">Select a site to view projectors.</div>
        )}
        {projectorsError && (
          <div className="text-sm text-red-600">{projectorsError}</div>
        )}

        {selectedSiteId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProjectors.map((p) => {
              const active = p.id === selectedProjectorId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProjectorId(p.id)}
                  className={[
                    'text-left rounded-xl border p-4 transition-colors',
                    active ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.serialNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {p.projectorModel?.modelNo || 'Unknown model'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Audis: {p.audis.map((a) => a.audiNo).join(', ') || '—'}
                      </p>
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      RMAs <span className="font-semibold text-gray-900">{p.rmaCount}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      Last RMA: <span className="font-semibold text-gray-900">{formatDate(p.lastRmaRaisedDate)}</span>
                    </div>
                    <div className="text-xs text-purple-700 font-medium">Open</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Level 3: Analytics */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <h3 className="text-gray-900">Projector Analytics</h3>
            {analyticsLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          </div>
        </div>

        {!selectedProjectorId && (
          <div className="text-sm text-gray-600">Select a projector to see analytics.</div>
        )}
        {analyticsError && (
          <div className="text-sm text-red-600">{analyticsError}</div>
        )}

        {analytics && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {analytics.projector.serialNumber}{' '}
                  <span className="text-gray-500 font-normal">
                    ({analytics.projector.projectorModel?.modelNo || 'Unknown model'})
                  </span>
                </p>
                <p className="text-xs text-gray-600">
                  Current Audis:{' '}
                  {analytics.projector.audis.map((a) => `${a.site.siteName} / ${a.audiNo}`).join(', ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide">Total RMAs</p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">{analytics.totals.totalRmaCount}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Part-wise RMA count</p>
                <div className="mt-3 space-y-2">
                  {(analytics.breakdown.byPart || []).slice(0, 10).map((p) => (
                    <div key={p.partName} className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-900 truncate">{p.partName}</p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{p.count}</p>
                    </div>
                  ))}
                  {(analytics.breakdown.byPart || []).length === 0 && (
                    <p className="text-sm text-gray-600">No defective-part data found for this projector.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status breakdown</p>
                <div className="mt-3 space-y-2">
                  {(analytics.breakdown.byStatus || []).map((s) => (
                    <div key={s.status} className="flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-900">{s.status}</p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{s.count}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Suggestions</p>
                <div className="mt-3 space-y-2">
                  {(analytics.suggestions || []).map((s, idx) => (
                    <div key={idx} className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Recent RMAs</p>
              </div>
              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                      <th className="py-2 pr-3">RMA / Call Log</th>
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Defective Part</th>
                      <th className="py-2 pr-3">Site</th>
                      <th className="py-2 pr-3">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.recentRmas.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3 text-gray-900">
                          {r.rmaNumber || r.callLogNumber || '—'}
                        </td>
                        <td className="py-2 pr-3 text-gray-700">{formatDate(r.rmaRaisedDate)}</td>
                        <td className="py-2 pr-3 text-gray-700">{r.status}</td>
                        <td className="py-2 pr-3 text-gray-700">{r.defectivePartName || '—'}</td>
                        <td className="py-2 pr-3 text-gray-700">{r.site?.siteName || '—'}</td>
                        <td className="py-2 pr-3">
                          <a
                            href={`/#rma`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            title="Go to RMA tab (open case from list)"
                            onClick={(e) => {
                              // Keep link behavior but avoid full page reload
                              e.preventDefault();
                              window.location.hash = 'rma';
                            }}
                          >
                            View <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                    {analytics.recentRmas.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-gray-600">
                          No RMAs found for this projector.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {analyticsLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading projector analytics…
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

