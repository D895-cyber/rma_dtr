import React from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { showInstall, promptInstall } = usePWAInstall();

  if (!showInstall) return null;

  return (
    <button
      type="button"
      onClick={promptInstall}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 border-2 border-blue-700 dark:border-blue-500"
      aria-label="Install app"
    >
      <Download className="w-5 h-5 shrink-0" />
      Install app
    </button>
  );
}
