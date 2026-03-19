import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { notificationService } from '../services/notification.service';

const POLL_INTERVAL_MS = 30000; // 30 seconds

/**
 * Polls for new notifications and shows a toast when something new arrives ("Case X was updated").
 * Makes the app feel alive and reduces duplicate edits by surfacing recent activity.
 */
export function LiveActivity() {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstRef = useRef(true);

  useEffect(() => {
    const poll = async () => {
      const res = await notificationService.getNotifications();
      if (!res.success || !res.data?.notifications) return;
      const list = res.data.notifications as Array<{ id: string; title: string; message?: string }>;
      for (const n of list) {
        if (isFirstRef.current) {
          seenIdsRef.current.add(n.id);
        } else if (!seenIdsRef.current.has(n.id)) {
          seenIdsRef.current.add(n.id);
          toast(n.title, { description: n.message });
        }
      }
      isFirstRef.current = false;
    };

    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  return null;
}
