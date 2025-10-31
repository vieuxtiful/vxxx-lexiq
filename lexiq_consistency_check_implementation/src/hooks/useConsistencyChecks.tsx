import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  ConsistencyCheckRequest,
  ConsistencyCheckResponse,
  ConsistencyIssue,
  ConsistencyStatistics,
  ConsistencyEngineConfig,
  GlossaryTerm,
  CustomRule,
  ConsistencyCheckType
} from '@/types/consistencyCheck';

/**
 * Enhanced hook for consistency checks with backend integration
 * Supports both online (backend API) and offline (browser-based) modes
 */
export const useConsistencyChecks = (
  sourceContent: string,
  targetContent: string,
  sourceLanguage: string,
  targetLanguage: string,
  config?: Partial<ConsistencyEngineConfig>
) => {
  const [issues, setIssues] = useState<ConsistencyIssue[]>([]);
  const [statistics, setStatistics] = useState<ConsistencyStatistics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheKey, setCacheKey] = useState<string | null>(null);

  // Default configuration
  const defaultConfig: ConsistencyEngineConfig = {
    mode: 'online',
    enableBatching: true,
    batchSize: 10,
    cacheEnabled: true,
    cacheTTL: 300000, // 5 minutes
    retryAttempts: 3,
    timeout: 30000 // 30 seconds
  };

  const engineConfig = { ...defaultConfig, ...config };

  /**
   * Perform consistency check via backend API
   */
  const checkConsistencyOnline = useCallback(async (
    request: ConsistencyCheckRequest
  ): Promise<ConsistencyCheckResponse> => {
    console.log('🌐 Performing online consistency check via backend API');

    const { data, error } = await supabase.functions.invoke('consistency-check', {
      body: request
    });

    if (error) {
      throw new Error(`Backend API error: ${error.message}`);
    }

    return data as ConsistencyCheckResponse;
  }, []);

  /**
   * Perform consistency check in browser (offline mode)
   */
  const checkConsistencyOffline = useCallback(async (
    request: ConsistencyCheckRequest
  ): Promise<ConsistencyCheckResponse> => {
    console.log('💻 Performing offline consistency check in browser');

    // Basic browser-based checks
    const issues: ConsistencyIssue[] = [];

    // Whitespace check
    if (request.translationText.startsWith(' ') || request.translationText.endsWith(' ')) {
      issues.push({
        id: 'whitespace-1',
        type: 'whitespace',
        severity: 'minor',
        targetText: request.translationText.trim(),
        startPosition: 0,
        endPosition: request.translationText.length,
        context: request.translationText.substring(0, 50),
        message: 'Leading or trailing whitespace detected',
        rationale: 'Text should not have unnecessary whitespace at the beginning or end',
        suggestions: [request.translationText.trim()],
        confidence: 1.0,
        autoFixable: true
      });
    }

    // Multiple spaces check
    const multiSpaceMatches = request.translationText.matchAll(/  +/g);
    for (const match of multiSpaceMatches) {
      issues.push({
        id: `whitespace-multi-${match.index}`,
        type: 'whitespace',
        severity: 'minor',
        targetText: match[0],
        startPosition: match.index || 0,
        endPosition: (match.index || 0) + match[0].length,
        context: request.translationText.substring(
          Math.max(0, (match.index || 0) - 20),
          Math.min(request.translationText.length, (match.index || 0) + match[0].length + 20)
        ),
        message: 'Multiple consecutive spaces detected',
        rationale: 'Multiple spaces should typically be reduced to a single space',
        suggestions: [' '],
        confidence: 0.95,
        autoFixable: true
      });
    }

    // Number consistency check
    const sourceNumbers = request.sourceText.match(/\d+(?:[.,]\d+)*/g) || [];
    const targetNumbers = request.translationText.match(/\d+(?:[.,]\d+)*/g) || [];
    
    if (sourceNumbers.length !== targetNumbers.length) {
      issues.push({
        id: 'number-count-mismatch',
        type: 'number_format',
        severity: 'major',
        targetText: request.translationText.substring(0, 100),
        startPosition: 0,
        endPosition: request.translationText.length,
        context: request.translationText.substring(0, 100),
        message: `Number count mismatch: ${sourceNumbers.length} in source vs ${targetNumbers.length} in target`,
        rationale: 'The number of numeric values differs between source and target',
        suggestions: ['Verify all numbers are correctly translated'],
        confidence: 0.9,
        autoFixable: false,
        sourceText: sourceNumbers.join(', ')
      });
    }

    // Calculate statistics
    const statistics: ConsistencyStatistics = {
      totalIssues: issues.length,
      criticalIssues: issues.filter(i => i.severity === 'critical').length,
      majorIssues: issues.filter(i => i.severity === 'major').length,
      minorIssues: issues.filter(i => i.severity === 'minor').length,
      infoIssues: issues.filter(i => i.severity === 'info').length,
      issuesByType: issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
      }, {} as Record<ConsistencyCheckType, number>),
      qualityScore: Math.max(0, 100 - (issues.length * 5)),
      averageConfidence: issues.length > 0
        ? issues.reduce((sum, i) => sum + i.confidence, 0) / issues.length
        : 1.0
    };

    return {
      issues,
      statistics,
      processingTime: 0
    };
  }, []);

  /**
   * Main consistency check function with retry logic
   */
  const performConsistencyCheck = useCallback(async (
    request: ConsistencyCheckRequest,
    attempt: number = 1
  ): Promise<ConsistencyCheckResponse> => {
    try {
      if (engineConfig.mode === 'online') {
        return await checkConsistencyOnline(request);
      } else if (engineConfig.mode === 'offline') {
        return await checkConsistencyOffline(request);
      } else {
        // Hybrid mode: try online first, fallback to offline
        try {
          return await checkConsistencyOnline(request);
        } catch (onlineError) {
          console.warn('Online check failed, falling back to offline mode:', onlineError);
          return await checkConsistencyOffline(request);
        }
      }
    } catch (error) {
      if (attempt < engineConfig.retryAttempts) {
        console.warn(`Consistency check attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return performConsistencyCheck(request, attempt + 1);
      }
      throw error;
    }
  }, [engineConfig, checkConsistencyOnline, checkConsistencyOffline]);

  /**
   * Effect to trigger consistency checks when content changes
   */
  useEffect(() => {
    if (!sourceContent.trim() || !targetContent.trim()) {
      console.log('🔍 Consistency check skipped: empty content');
      setIssues([]);
      setStatistics(null);
      return;
    }

    console.log('⏳ Consistency check scheduled (2s delay):', {
      sourceLength: sourceContent.length,
      targetLength: targetContent.length,
      mode: engineConfig.mode
    });

    const analyzeConsistency = async () => {
      console.log('🔄 Starting consistency check...');
      setIsAnalyzing(true);
      setError(null);

      try {
        const request: ConsistencyCheckRequest = {
          sourceText: sourceContent,
          translationText: targetContent,
          sourceLanguage,
          targetLanguage,
          enableCache: engineConfig.cacheEnabled
        };

        const response = await performConsistencyCheck(request);

        console.log('✅ Consistency check complete:', {
          issueCount: response.issues.length,
          qualityScore: response.statistics.qualityScore
        });

        setIssues(response.issues);
        setStatistics(response.statistics);
        setCacheKey(response.cacheKey || null);
      } catch (err) {
        console.error('❌ Consistency check failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIssues([]);
        setStatistics(null);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounceTimer = setTimeout(analyzeConsistency, 2000);
    return () => clearTimeout(debounceTimer);
  }, [
    sourceContent,
    targetContent,
    sourceLanguage,
    targetLanguage,
    engineConfig.mode,
    engineConfig.cacheEnabled,
    performConsistencyCheck
  ]);

  /**
   * Manual trigger for consistency check
   */
  const triggerCheck = useCallback(async (
    glossaryTerms?: GlossaryTerm[],
    customRules?: CustomRule[],
    checkTypes?: ConsistencyCheckType[]
  ) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const request: ConsistencyCheckRequest = {
        sourceText: sourceContent,
        translationText: targetContent,
        sourceLanguage,
        targetLanguage,
        glossaryTerms,
        customRules,
        checkTypes,
        enableCache: engineConfig.cacheEnabled
      };

      const response = await performConsistencyCheck(request);

      setIssues(response.issues);
      setStatistics(response.statistics);
      setCacheKey(response.cacheKey || null);

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    sourceContent,
    targetContent,
    sourceLanguage,
    targetLanguage,
    engineConfig.cacheEnabled,
    performConsistencyCheck
  ]);

  return {
    issues,
    statistics,
    isAnalyzing,
    error,
    cacheKey,
    triggerCheck,
    config: engineConfig
  };
};
