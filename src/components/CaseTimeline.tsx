import React, { useState, useEffect } from 'react';
import { Clock, User, FileText, Loader2 } from 'lucide-react';
import { dtrService } from '../services/dtr.service';
import { rmaService } from '../services/rma.service';

export interface TimelineEntry {
  id: string;
  action: string;
  description: string | null;
  performedAt: string;
  userName: string;
}

interface CaseTimelineProps {
  caseType: 'DTR' | 'RMA';
  caseId: string;
  /** If provided, used instead of fetching (e.g. from case.auditLog) */
  initialEntries?: TimelineEntry[];
  className?: string;
}

function normalizeEntry(raw: any): TimelineEntry {
  const performedAt = raw.performedAt || raw.timestamp;
  const user = raw.user;
  const userName = user?.name || user?.email || raw.userName || 'Unknown';
  return {
    id: raw.id,
    action: raw.action || 'Activity',
    description: raw.description ?? raw.details ?? null,
    performedAt: typeof performedAt === 'string' ? performedAt : new Date(performedAt).toISOString(),
    userName,
  };
}

export function CaseTimeline({ caseType, caseId, initialEntries, className = '' }: CaseTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>(initialEntries ?? []);
  const [loading, setLoading] = useState(!initialEntries?.length);

  useEffect(() => {
    if (initialEntries?.length) {
      setEntries(initialEntries);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchLog = caseType === 'DTR' ? dtrService.getAuditLog : rmaService.getAuditLog;
    fetchLog(caseId).then((res) => {
      if (cancelled) return;
      const list = (res.data as any)?.auditLogs ?? [];
      setEntries(list.map(normalizeEntry));
    }).catch(() => {
      if (!cancelled) setEntries([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [caseType, caseId, initialEntries?.length]);

  const sorted = [...entries].sort(
    (a, b) => new Date(a.performedAt).getTime() - new Date(b.performedAt).getTime()
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className={`py-6 text-center text-sm text-gray-500 dark:text-gray-400 ${className}`}>
        <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      <h3 className="text-gray-900 dark:text-white font-medium mb-4 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Timeline
      </h3>
      <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700">
        {sorted.map((entry, i) => (
          <div key={entry.id} className="relative pb-6 last:pb-0">
            <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400 border-2 border-white dark:border-gray-800" />
            <div className="pl-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.action}</p>
              {entry.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{entry.description}</p>
              )}
              <p className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500 dark:text-gray-500">
                <User className="w-3.5 h-3.5" />
                {entry.userName}
                <span className="text-gray-400 dark:text-gray-600">
                  · {new Date(entry.performedAt).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
