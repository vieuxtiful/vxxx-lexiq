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

    // Use a more robust diffing approach - paragraph and sentence based
    const newParagraphs = newContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const oldParagraphs = oldContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const changedSegments: ContentChange['changedSegments'] = [];

    // Compare paragraphs first (more accurate for structured content)
    const maxParagraphs = Math.max(newParagraphs.length, oldParagraphs.length);
    let changedParagraphs = 0;

    for (let i = 0; i < maxParagraphs; i++) {
      const newPara = newParagraphs[i] || '';
      const oldPara = oldParagraphs[i] || '';

      if (newPara !== oldPara) {
        changedParagraphs++;
        
        if (!oldPara && newPara) {
          // New paragraph added
          added.push(newPara);
          const start = newContent.indexOf(newPara);
          if (start !== -1) {
            changedSegments.push({
              start,
              end: start + newPara.length,
              content: newPara,
              type: 'added'
            });
          }
        } else if (oldPara && !newPara) {
          // Paragraph removed
          removed.push(oldPara);
        } else {
          // Paragraph modified - do sentence-level diff within paragraph
          modified.push(newPara);
          const start = newContent.indexOf(newPara);
          if (start !== -1) {
            changedSegments.push({
              start,
              end: start + newPara.length,
              content: newPara,
              type: 'modified'
            });
          }
          
          // Additional: Check for sentence-level changes within modified paragraphs
          const newSentences = newPara.split(/[.!?]+/).filter(s => s.trim().length > 0);
          const oldSentences = oldPara.split(/[.!?]+/).filter(s => s.trim().length > 0);
          
          const maxSentences = Math.max(newSentences.length, oldSentences.length);
          for (let j = 0; j < maxSentences; j++) {
            const newSentence = newSentences[j] || '';
            const oldSentence = oldSentences[j] || '';
            
            if (newSentence.trim() !== oldSentence.trim()) {
              // Sentence changed - add as individual segment for more granular analysis
              const sentenceStart = newContent.indexOf(newSentence);
              if (sentenceStart !== -1) {
                changedSegments.push({
                  start: sentenceStart,
                  end: sentenceStart + newSentence.length,
                  content: newSentence,
                  type: 'modified'
                });
              }
            }
          }
        }
      }
    }

    // Calculate percentage changed based on character difference for more accuracy
    const totalChars = Math.max(newContent.length, oldContent.length);
    const charDiff = this.calculateCharacterDifference(newContent, oldContent);
    const percentChanged = totalChars > 0 ? (charDiff / totalChars) * 100 : 0;

    console.log(`📊 Change detection: ${changedParagraphs}/${maxParagraphs} paragraphs changed, ${percentChanged.toFixed(1)}% character difference`);

    return { added, removed, modified, percentChanged, changedSegments };
  }

  // Helper method for character-level difference calculation
  private calculateCharacterDifference(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Simple Levenshtein-like difference calculation
    let diff = Math.abs(len1 - len2);
    const minLen = Math.min(len1, len2);
    
    for (let i = 0; i < minLen; i++) {
      if (str1[i] !== str2[i]) {
        diff++;
      }
    }
    
    return diff;
  }

  // Merge analysis results
  mergeAnalysisResults(existingResults: any, newTerms: any[], changes: ContentChange): any {
    if (!existingResults || !existingResults.terms) {
      console.warn('⚠️ No existing results to merge with');
      return { terms: newTerms, statistics: this.calculateMergedStatistics(newTerms) };
    }

    console.log(`🔄 Merging: ${existingResults.terms.length} existing terms + ${newTerms.length} new terms`);

    // Remove terms from changed/removed segments with fuzzy matching
    const filteredTerms = existingResults.terms.filter((term: any) => {
      // Check if term is in a changed segment
      const inChangedSegment = changes.changedSegments.some(segment => {
        // Use fuzzy position matching - allow small offsets for minor edits
        const termMid = (term.startPosition + term.endPosition) / 2;
        return termMid >= segment.start && termMid <= segment.end;
      });
      
      if (inChangedSegment) {
        console.log(`🗑️ Removing term from changed segment: "${term.text}"`);
      }
      
      return !inChangedSegment;
    });

    console.log(`📊 After filtering: ${filteredTerms.length} terms remain from original`);

    // Add new terms
    const mergedTerms = [...filteredTerms, ...newTerms];

    // Update statistics
    const statistics = this.calculateMergedStatistics(mergedTerms);

    console.log(`✅ Final merged: ${mergedTerms.length} total terms`);

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
