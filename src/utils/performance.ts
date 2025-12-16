/**
 * Performance Monitoring Utilities
 * Measure and log application performance metrics
 */

export const measurePageLoad = () => {
  if (typeof window !== 'undefined' && window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domComplete - perfData.domLoading;
        
        console.log('⚡ Performance Metrics:');
        console.log('  📊 Page Load Time:', pageLoadTime + 'ms');
        console.log('  🔌 API Connect Time:', connectTime + 'ms');
        console.log('  🎨 Render Time:', renderTime + 'ms');
        
        // Log to analytics if needed
        logPerformanceMetrics({
          pageLoadTime,
          connectTime,
          renderTime,
        });
      }, 0);
    });
  }
};

interface PerformanceMetrics {
  pageLoadTime: number;
  connectTime: number;
  renderTime: number;
}

const logPerformanceMetrics = (metrics: PerformanceMetrics) => {
  // Send to analytics service if needed
  if (import.meta.env.PROD) {
    // Example: Send to your analytics service
    console.log('Production metrics:', metrics);
  }
};

/**
 * Measure component render time
 */
export const measureComponentRender = (componentName: string) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const duration = end - start;
    console.log(`⏱️ ${componentName} rendered in ${duration.toFixed(2)}ms`);
  };
};

/**
 * Measure API call duration
 */
export const measureAPICall = async <T>(
  apiName: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  
  try {
    const result = await apiCall();
    const end = performance.now();
    const duration = end - start;
    console.log(`📡 API call "${apiName}" took ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    const duration = end - start;
    console.error(`❌ API call "${apiName}" failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};



