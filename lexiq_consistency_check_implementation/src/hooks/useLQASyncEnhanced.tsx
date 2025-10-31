import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConsistencyChecks } from './useConsistencyChecks';
import type {
  ConsistencyIssue,
  ConsistencyStatistics,
  GlossaryTerm,
  CustomRule,
  ConsistencyCheckType
} from '@/types/consistencyCheck';

/**
 * Enhanced LQA Sync interface that combines original LQA issues
 * with consistency check issues
 */
export interface EnhancedLQASyncIssue {
  id: string;
  type: 'grammar' | 'spelling' | 'consistency' | 'omission' | ConsistencyCheckType;
  sourceText?: string;
  targetText: string;
  suggestion: string;
  confidence: number;
  rationale: string;
  startPosition: number;
  endPosition: number;
  severity?: 'critical' | 'major' | 'minor' | 'info';
  autoFixable?: boolean;
  context?: string;
}

export interface EnhancedLQAStatistics {
  totalIssues: number;
  grammarIssues: number;
  spellingIssues: number;
  consistencyIssues: number;
  qualityScore: number;
  averageConfidence: number;
  consistencyStatistics?: ConsistencyStatistics;
}

export interface UseLQASyncEnhancedOptions {
  enableConsistencyChecks?: boolean;
  consistencyCheckMode?: 'online' | 'offline' | 'hybrid';
  glossaryTerms?: GlossaryTerm[];
  customRules?: CustomRule[];
  checkTypes?: ConsistencyCheckType[];
}

/**
 * Enhanced useLQASync hook that integrates consistency checks with LexiQ analysis
 * 
 * This hook provides:
 * 1. Original LQA functionality (grammar, spelling via analyze-translation)
 * 2. Comprehensive consistency checks (via backend or browser)
 * 3. Unified issue reporting
 * 4. Combined statistics
 * 5. Configurable check types
 */
export const useLQASyncEnhanced = (
  sourceContent: string,
  targetContent: string,
  enabled: boolean,
  sourceLanguage: string,
  targetLanguage: string,
  options: UseLQASyncEnhancedOptions = {}
) => {
  const [lqaIssues, setLqaIssues] = useState<EnhancedLQASyncIssue[]>([]);
  const [isAnalyzingLQA, setIsAnalyzingLQA] = useState(false);
  const [statistics, setStatistics] = useState<EnhancedLQAStatistics>({
    totalIssues: 0,
    grammarIssues: 0,
    spellingIssues: 0,
    consistencyIssues: 0,
    qualityScore: 100,
    averageConfidence: 1.0
  });

  const {
    enableConsistencyChecks = true,
    consistencyCheckMode = 'hybrid',
    glossaryTerms,
    customRules,
    checkTypes
  } = options;

  // Use consistency checks hook
  const {
    issues: consistencyIssues,
    statistics: consistencyStats,
    isAnalyzing: isAnalyzingConsistency
  } = useConsistencyChecks(
    sourceContent,
    targetContent,
    sourceLanguage,
    targetLanguage,
    {
      mode: consistencyCheckMode,
      enableBatching: true,
      cacheEnabled: true
    }
  );

  /**
   * Perform LQA analysis via analyze-translation edge function
   */
  const analyzeLQA = useCallback(async (
    source: string,
    target: string,
    sourceLang: string,
    targetLang: string
  ): Promise<EnhancedLQASyncIssue[]> => {
    try {
      console.log('🔄 Starting LQA analysis via analyze-translation...');

      const { data, error } = await supabase.functions.invoke('analyze-translation', {
        body: {
          translationContent: target,
          glossaryContent: source,
          language: targetLang,
          domain: 'general',
          checkGrammar: true,
          checkSpelling: true,
          sourceTextOnly: false
        }
      });

      if (error) {
        console.error('LQA analysis error:', error);
        return [];
      }

      if (!data?.analysis?.terms) {
        return [];
      }

      // Transform analysis results to enhanced LQA issues
      const issues: EnhancedLQASyncIssue[] = data.analysis.terms
        .filter((term: any) => 
          term.classification === 'grammar' || 
          term.classification === 'spelling'
        )
        .map((term: any) => ({
          id: `lqa-${term.text}-${term.startPosition}`,
          type: term.classification as 'grammar' | 'spelling',
          sourceText: source.substring(0, 100),
          targetText: term.text,
          suggestion: term.suggestions?.[0] || '',
          confidence: (term.score || 0) / 100,
          rationale: term.rationale || '',
          startPosition: term.startPosition || 0,
          endPosition: term.endPosition || 0,
          severity: (term.score || 0) < 50 ? 'major' : 'minor',
          autoFixable: Boolean(term.suggestions?.length),
          context: term.context || ''
        }));

      console.log(`✅ LQA analysis complete: ${issues.length} issues found`);
      return issues;
    } catch (error) {
      console.error('LQA analysis exception:', error);
      return [];
    }
  }, []);

  /**
   * Convert consistency issues to enhanced LQA format
   */
  const convertConsistencyIssues = useCallback((
    issues: ConsistencyIssue[]
  ): EnhancedLQASyncIssue[] => {
    return issues.map(issue => ({
      id: issue.id,
      type: issue.type as any,
      sourceText: issue.sourceText,
      targetText: issue.targetText,
      suggestion: issue.suggestions[0] || '',
      confidence: issue.confidence,
      rationale: issue.rationale,
      startPosition: issue.startPosition,
      endPosition: issue.endPosition,
      severity: issue.severity,
      autoFixable: issue.autoFixable,
      context: issue.context
    }));
  }, []);

  /**
   * Merge LQA and consistency issues
   */
  const mergeIssues = useCallback((
    lqaIssues: EnhancedLQASyncIssue[],
    consistencyIssues: EnhancedLQASyncIssue[]
  ): EnhancedLQASyncIssue[] => {
    // Combine and deduplicate issues
    const allIssues = [...lqaIssues, ...consistencyIssues];
    
    // Remove duplicates based on position and type
    const uniqueIssues = allIssues.filter((issue, index, self) =>
      index === self.findIndex(i =>
        i.startPosition === issue.startPosition &&
        i.endPosition === issue.endPosition &&
        i.type === issue.type
      )
    );

    // Sort by position
    return uniqueIssues.sort((a, b) => a.startPosition - b.startPosition);
  }, []);

  /**
   * Calculate combined statistics
   */
  const calculateStatistics = useCallback((
    issues: EnhancedLQASyncIssue[],
    consistencyStats: ConsistencyStatistics | null
  ): EnhancedLQAStatistics => {
    const grammarIssues = issues.filter(i => i.type === 'grammar').length;
    const spellingIssues = issues.filter(i => i.type === 'spelling').length;
    const consistencyIssues = issues.filter(i => 
      i.type !== 'grammar' && i.type !== 'spelling'
    ).length;

    const totalIssues = issues.length;
    const averageConfidence = totalIssues > 0
      ? issues.reduce((sum, i) => sum + i.confidence, 0) / totalIssues
      : 1.0;

    // Calculate quality score (0-100)
    const criticalWeight = 10;
    const majorWeight = 5;
    const minorWeight = 2;
    const infoWeight = 1;

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const majorCount = issues.filter(i => i.severity === 'major').length;
    const minorCount = issues.filter(i => i.severity === 'minor').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    const weightedIssues = 
      (criticalCount * criticalWeight) +
      (majorCount * majorWeight) +
      (minorCount * minorWeight) +
      (infoCount * infoWeight);

    const qualityScore = Math.max(0, Math.min(100, 100 - weightedIssues));

    return {
      totalIssues,
      grammarIssues,
      spellingIssues,
      consistencyIssues,
      qualityScore,
      averageConfidence,
      consistencyStatistics: consistencyStats || undefined
    };
  }, []);

  /**
   * Main effect to perform analysis when content changes
   */
  useEffect(() => {
    if (!enabled || !sourceContent.trim() || !targetContent.trim()) {
      console.log('🔍 Enhanced LQA Sync skipped:', {
        enabled,
        hasSource: !!sourceContent.trim(),
        hasTarget: !!targetContent.trim()
      });
      setLqaIssues([]);
      setStatistics({
        totalIssues: 0,
        grammarIssues: 0,
        spellingIssues: 0,
        consistencyIssues: 0,
        qualityScore: 100,
        averageConfidence: 1.0
      });
      return;
    }

    console.log('⏳ Enhanced LQA Sync scheduled (2s delay):', {
      sourceLength: sourceContent.length,
      targetLength: targetContent.length,
      sourceLanguage,
      targetLanguage,
      consistencyChecksEnabled: enableConsistencyChecks
    });

    const performAnalysis = async () => {
      console.log('🔄 Enhanced LQA Sync starting...');
      setIsAnalyzingLQA(true);

      try {
        // 1. Perform LQA analysis
        const lqaResults = await analyzeLQA(
          sourceContent,
          targetContent,
          sourceLanguage,
          targetLanguage
        );

        // 2. Get consistency issues (already being analyzed by hook)
        const consistencyResults = enableConsistencyChecks
          ? convertConsistencyIssues(consistencyIssues)
          : [];

        // 3. Merge results
        const mergedIssues = mergeIssues(lqaResults, consistencyResults);

        // 4. Calculate statistics
        const stats = calculateStatistics(mergedIssues, consistencyStats);

        console.log('✅ Enhanced LQA Sync complete:', {
          lqaIssues: lqaResults.length,
          consistencyIssues: consistencyResults.length,
          totalIssues: mergedIssues.length,
          qualityScore: stats.qualityScore
        });

        setLqaIssues(mergedIssues);
        setStatistics(stats);
      } catch (error) {
        console.error('❌ Enhanced LQA Sync failed:', error);
        setLqaIssues([]);
      } finally {
        setIsAnalyzingLQA(false);
      }
    };

    const debounceTimer = setTimeout(performAnalysis, 2000);
    return () => clearTimeout(debounceTimer);
  }, [
    sourceContent,
    targetContent,
    enabled,
    sourceLanguage,
    targetLanguage,
    enableConsistencyChecks,
    consistencyIssues,
    consistencyStats,
    analyzeLQA,
    convertConsistencyIssues,
    mergeIssues,
    calculateStatistics
  ]);

  /**
   * Manual trigger with custom parameters
   */
  const triggerAnalysis = useCallback(async (
    customGlossaryTerms?: GlossaryTerm[],
    customRules?: CustomRule[]
  ) => {
    setIsAnalyzingLQA(true);

    try {
      const lqaResults = await analyzeLQA(
        sourceContent,
        targetContent,
        sourceLanguage,
        targetLanguage
      );

      const consistencyResults = enableConsistencyChecks
        ? convertConsistencyIssues(consistencyIssues)
        : [];

      const mergedIssues = mergeIssues(lqaResults, consistencyResults);
      const stats = calculateStatistics(mergedIssues, consistencyStats);

      setLqaIssues(mergedIssues);
      setStatistics(stats);

      return { issues: mergedIssues, statistics: stats };
    } catch (error) {
      console.error('Manual analysis failed:', error);
      throw error;
    } finally {
      setIsAnalyzingLQA(false);
    }
  }, [
    sourceContent,
    targetContent,
    sourceLanguage,
    targetLanguage,
    enableConsistencyChecks,
    consistencyIssues,
    consistencyStats,
    analyzeLQA,
    convertConsistencyIssues,
    mergeIssues,
    calculateStatistics
  ]);

  return {
    issues: lqaIssues,
    statistics,
    isAnalyzing: isAnalyzingLQA || isAnalyzingConsistency,
    triggerAnalysis
  };
};
