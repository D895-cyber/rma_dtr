import React from 'react';
import { Circle } from 'lucide-react';

interface CasePresenceProps {
  caseId: string;
  caseType: 'DTR' | 'RMA';
  /** When backend supports viewers, pass list of user names */
  viewers?: string[];
  className?: string;
}

/**
 * Optional "who is viewing" indicator for case detail.
 * When backend supports presence (e.g. POST/GET viewing endpoint), show viewer names here.
 */
export function CasePresence({ viewers = [], className = '' }: CasePresenceProps) {
  if (viewers.length === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 ${className}`}
        title="Live updates"
      >
        <Circle className="w-2 h-2 fill-green-500 text-green-500" aria-hidden />
        Live
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 ${className}`}>
      <Circle className="w-2 h-2 fill-green-500 text-green-500" aria-hidden />
      {viewers.length === 1 ? `${viewers[0]} is viewing` : `${viewers.length} viewing`}
    </span>
  );
}
