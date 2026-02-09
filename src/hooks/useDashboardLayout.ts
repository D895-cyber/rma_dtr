import { useState, useEffect, useCallback } from 'react';

export const DASHBOARD_WIDGET_IDS = ['dtr-stats', 'rma-stats', 'recent-dtr', 'recent-rma'] as const;
export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

const STORAGE_KEY_PREFIX = 'crm-dashboard-widgets';

export interface DashboardLayout {
  order: DashboardWidgetId[];
  enabled: DashboardWidgetId[];
}

const defaultLayout: DashboardLayout = {
  order: ['dtr-stats', 'rma-stats', 'recent-dtr', 'recent-rma'],
  enabled: ['dtr-stats', 'rma-stats', 'recent-dtr', 'recent-rma'],
};

function loadLayout(userId: string): DashboardLayout {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}-${userId}`);
    if (!raw) return defaultLayout;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    const order = Array.isArray(parsed.order) ? parsed.order.filter((id) => DASHBOARD_WIDGET_IDS.includes(id)) : defaultLayout.order;
    const enabled = Array.isArray(parsed.enabled) ? parsed.enabled.filter((id) => DASHBOARD_WIDGET_IDS.includes(id)) : defaultLayout.enabled;
    return {
      order: order.length ? order : defaultLayout.order,
      enabled: enabled.length ? enabled : defaultLayout.enabled,
    };
  } catch {
    return defaultLayout;
  }
}

function saveLayout(userId: string, layout: DashboardLayout) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}-${userId}`, JSON.stringify(layout));
  } catch (_) {}
}

export function useDashboardLayout(userId: string) {
  const [layout, setLayout] = useState<DashboardLayout>(() => loadLayout(userId || ''));

  useEffect(() => {
    if (!userId) return;
    setLayout(loadLayout(userId));
  }, [userId]);

  const setEnabled = useCallback(
    (widgetId: DashboardWidgetId, enabled: boolean) => {
      setLayout((prev) => {
        const next = enabled
          ? prev.enabled.includes(widgetId)
            ? prev
            : { ...prev, enabled: [...prev.enabled, widgetId] }
          : { ...prev, enabled: prev.enabled.filter((id) => id !== widgetId) };
        saveLayout(userId, next);
        return next;
      });
    },
    [userId]
  );

  const setOrder = useCallback(
    (order: DashboardWidgetId[]) => {
      setLayout((prev) => {
        const next = { ...prev, order };
        saveLayout(userId, next);
        return next;
      });
    },
    [userId]
  );

  const visibleOrder = layout.order.filter((id) => layout.enabled.includes(id));
  return { layout, visibleOrder, setEnabled, setOrder };
}

export const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  'dtr-stats': 'DTR Overview',
  'rma-stats': 'RMA Overview',
  'recent-dtr': 'Recent DTR Cases',
  'recent-rma': 'Recent RMA Cases',
};
