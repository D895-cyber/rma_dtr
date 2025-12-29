/**
 * API Cache Utility
 * Implements in-memory caching for API requests to reduce load times
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

class APICache {
  private cache: Map<string, CacheItem<any>> = new Map();

  /**
   * Store data in cache
   * @param key - Unique cache key
   * @param data - Data to cache
   * @param expiresIn - Cache duration in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  /**
   * Retrieve data from cache
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    const isExpired = Date.now() - item.timestamp > item.expiresIn;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param keyPattern - Pattern to match cache keys
   */
  invalidate(keyPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const apiCache = new APICache();

/**
 * Cached fetch wrapper
 * @param url - API endpoint
 * @param options - Fetch options
 * @param cacheTime - Cache duration (default: 5 minutes)
 * @returns Promise with response data
 */
export const cachedFetch = async <T>(
  url: string,
  options?: RequestInit,
  cacheTime: number = 5 * 60 * 1000
): Promise<T> => {
  // Only cache GET requests
  if (options?.method && options.method !== 'GET') {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  }

  const cacheKey = `${url}-${JSON.stringify(options?.headers || {})}`;
  
  // Check cache first
  const cached = apiCache.get<T>(cacheKey);
  if (cached) {
    console.log('✅ Cache hit:', url);
    return cached;
  }
  
  console.log('📡 Fetching from API:', url);
  
  // Fetch from API
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data = await response.json();
  
  // Store in cache
  apiCache.set(cacheKey, data, cacheTime);
  
  return data;
};







