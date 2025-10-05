interface CacheItem<T> {
  value: T;
  expiry: number;
  contentHash: string;
  timestamp: number;
}

interface ContentChange {
  added: string[];
  removed: string[];
  modified: string[];
  percentChanged: number;
  changedSegments: Array<{
    start: number;
    end: number;
    content: string;
    type: 'added' | 'modified' | 'removed';
  }>;
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

  set<T>(key: string, value: T, contentHash?: string, ttl: number = this.DEFAULT_TTL): void {
    // LRU eviction: if cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
      contentHash: contentHash || '',
      timestamp: Date.now()
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

  // Calculate changes between two content versions
  calculateContentChanges(newContent: string, oldContent: string): ContentChange {
    if (newContent === oldContent) {
      return { added: [], removed: [], modified: [], percentChanged: 0, changedSegments: [] };
    }

    // Simple line-based diff for initial implementation
    const newLines = newContent.split('\n');
    const oldLines = oldContent.split('\n');
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const changedSegments: ContentChange['changedSegments'] = [];

    // Simple line comparison
    const maxLines = Math.max(newLines.length, oldLines.length);
    let changedLines = 0;

    for (let i = 0; i < maxLines; i++) {
      const newLine = newLines[i] || '';
      const oldLine = oldLines[i] || '';

      if (newLine !== oldLine) {
        changedLines++;
        
        if (!oldLine && newLine) {
          added.push(newLine);
          changedSegments.push({
            start: newContent.indexOf(newLine),
            end: newContent.indexOf(newLine) + newLine.length,
            content: newLine,
            type: 'added'
          });
        } else if (oldLine && !newLine) {
          removed.push(oldLine);
        } else {
          modified.push(newLine);
          changedSegments.push({
            start: newContent.indexOf(newLine),
            end: newContent.indexOf(newLine) + newLine.length,
            content: newLine,
            type: 'modified'
          });
        }
      }
    }

    const percentChanged = (changedLines / maxLines) * 100;

    return { added, removed, modified, percentChanged, changedSegments };
  }

  // Merge analysis results
  mergeAnalysisResults(existingResults: any, newTerms: any[], changes: ContentChange): any {
    // Remove terms from changed/removed segments
    const filteredTerms = existingResults.terms.filter((term: any) => {
      return !changes.changedSegments.some(segment => 
        term.startPosition >= segment.start && term.endPosition <= segment.end
      );
    });

    // Add new terms
    const mergedTerms = [...filteredTerms, ...newTerms];

    // Update statistics
    const statistics = this.calculateMergedStatistics(mergedTerms);

    return {
      terms: mergedTerms,
      statistics
    };
  }

  private calculateMergedStatistics(terms: any[]): any {
    const totalTerms = terms.length;
    const validTerms = terms.filter((t: any) => t.classification === 'valid').length;
    const reviewTerms = terms.filter((t: any) => t.classification === 'review').length;
    const criticalTerms = terms.filter((t: any) => t.classification === 'critical').length;
    const spellingIssues = terms.filter((t: any) => t.classification === 'spelling').length;
    const grammarIssues = terms.filter((t: any) => t.classification === 'grammar').length;

    const qualityScore = totalTerms > 0 ? 
      ((validTerms + (reviewTerms * 0.5)) / totalTerms) * 100 : 0;

    return {
      totalTerms,
      validTerms,
      reviewTerms,
      criticalTerms,
      spellingIssues,
      grammarIssues,
      qualityScore: Math.round(qualityScore * 10) / 10,
      confidenceMin: 0,
      confidenceMax: 100,
      coverage: 100
    };
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
