import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Package, Building2, Loader2 } from 'lucide-react';
import { dtrService } from '../services/dtr.service';
import { rmaService } from '../services/rma.service';
import { masterDataService } from '../services/masterData.service';

type ResultType = 'DTR' | 'RMA' | 'Site';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  caseNumber?: string;
}

interface SmartSearchPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: ResultType, id: string) => void;
}

export function SmartSearchPalette({ open, onClose, onSelect }: SmartSearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [dtrRes, rmaRes, sitesRes] = await Promise.all([
        dtrService.getAllDTRCases({ search: term, limit: 5 }),
        rmaService.getAllRMACases({ search: term, limit: 5 }),
        masterDataService.getAllSites().catch(() => ({ success: false, data: { sites: [] } })),
      ]);

      const items: SearchResult[] = [];

      if (dtrRes.success && dtrRes.data?.cases) {
        const cases = dtrRes.data.cases as any[];
        cases.forEach((c) => {
          const siteName = typeof c.site === 'object' && c.site?.siteName ? c.site.siteName : c.site || '';
          items.push({
            id: c.id,
            type: 'DTR',
            title: c.caseNumber || c.id,
            subtitle: [siteName, c.natureOfProblem].filter(Boolean).join(' · ') || undefined,
            caseNumber: c.caseNumber,
          });
        });
      }

      if (rmaRes.success && rmaRes.data?.cases) {
        const cases = rmaRes.data.cases as any[];
        cases.forEach((c) => {
          const siteName = c.site?.siteName || c.siteName || '';
          items.push({
            id: c.id,
            type: 'RMA',
            title: c.rmaNumber || c.callLogNumber || c.id,
            subtitle: [siteName, c.defectivePartName || c.productName].filter(Boolean).join(' · ') || undefined,
            caseNumber: c.rmaNumber || c.callLogNumber,
          });
        });
      }

      const siteList = sitesRes?.data?.sites ?? [];
      const siteMatches = siteList.filter(
        (s: { siteName?: string }) => s.siteName?.toLowerCase().includes(term.toLowerCase())
      ).slice(0, 3);
      siteMatches.forEach((s: { id: string; siteName: string }) => {
        items.push({
          id: s.id,
          type: 'Site',
          title: s.siteName,
          subtitle: 'Site',
        });
      });

      setResults(items);
      setSelectedIndex(0);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : results.length - 1));
        return;
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        const r = results[selectedIndex];
        onSelect(r.type, r.id);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selectedIndex, onClose, onSelect]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const row = el.querySelector(`[data-index="${selectedIndex}"]`);
    row?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  const getIcon = (type: ResultType) => {
    switch (type) {
      case 'DTR':
        return <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'RMA':
        return <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'Site':
        return <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-xl rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        role="dialog"
        aria-label="Search cases and sites"
      >
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by case number, site, serial, part, description..."
            className="flex-1 bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            aria-label="Search"
          />
          <kbd className="hidden sm:inline text-xs text-gray-400 border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : query.trim().length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No results
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                type="button"
                data-index={i}
                onClick={() => {
                  onSelect(r.type, r.id);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {getIcon(r.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  {r.subtitle && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.subtitle}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {r.type}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
