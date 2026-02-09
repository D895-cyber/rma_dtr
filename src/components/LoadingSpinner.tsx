/**
 * Loading Spinner Component
 * Used as Suspense fallback for lazy-loaded components
 */

import React from 'react';

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

export const FullPageLoader = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
    </div>
  </div>
);







