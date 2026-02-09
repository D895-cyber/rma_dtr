import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const shortcuts: { keys: string; action: string }[] = [
  { keys: 'Ctrl + K', action: 'Open search' },
  { keys: 'N', action: 'New case (when not in input)' },
  { keys: 'Ctrl + S', action: 'Save' },
  { keys: 'Esc', action: 'Close modal / dialog' },
  { keys: '?', action: 'Show this help' },
];

interface ShortcutHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutHelpDialog({ open, onClose }: ShortcutHelpDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700 p-6"
        role="dialog"
        aria-labelledby="shortcut-title"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="shortcut-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyboard shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ul className="space-y-3">
          {shortcuts.map(({ keys, action }) => (
            <li key={keys} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-sm text-gray-700 dark:text-gray-300">{action}</span>
              <kbd className="px-2 py-1 text-xs font-mono rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Use these shortcuts to work faster. Shortcuts are disabled while typing in a field.
        </p>
      </div>
    </div>
  );
}
