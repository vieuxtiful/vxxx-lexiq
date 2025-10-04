interface CacheItem<T> {
  value: T;
  expiry: number;
}

class AnalysisCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize = 100;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (item && Date.now() < item.expiry) {
      return item.value as T;
    }
    this.cache.delete(key);
    return null;
  }

  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    // LRU eviction: if cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    // Clean expired entries
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now >= item.expiry) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }

  // Generate cache key from analysis parameters
  generateKey(content: string, language: string, domain: string, checkGrammar: boolean = false): string {
    const hash = AnalysisCache.simpleHash(content);
    return `analysis:${hash}:${language}:${domain}:${checkGrammar}`;
  }

  // Simple hash function for cache keys
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export const analysisCache = new AnalysisCache();
