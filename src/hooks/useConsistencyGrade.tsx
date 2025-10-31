import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLQASync, LQASyncIssue } from './useLQASync';

/**
 * Panel-specific consistency metrics
 */
export interface PanelMetrics {
  panelName: string;
  qualityScore: number;
  issueCount: number;
  issues: LQASyncIssue[];
  content: string;
  contentLength: number;
  lastUpdated: Date;
  issuesBySeverity: {
    critical: number;
    major: number;
    minor: number;
    info: number;
  };
  issuesByType: Record<string, number>;
}

/**
 * Issue severity breakdown
 */
export interface IssueSeverityBreakdown {
  critical: number;
  major: number;
  minor: number;
  info: number;
}

/**
 * Consistency grade hook return type
 */
export interface UseConsistencyGradeReturn {
  // Overall metrics
  overallScore: number;
  totalIssues: number;
  issuesBySeverity: IssueSeverityBreakdown;
  issuesByType: Record<string, number>;
  
  // Per-panel metrics
  sourceEditorMetrics: PanelMetrics;
  termValidatorMetrics: PanelMetrics;
  
  // All issues
  allIssues: LQASyncIssue[];
  
  // Analysis state
  isAnalyzing: boolean;
  lastAnalyzed: Date | null;
  error: string | null;
  
  // LQA statistics (optional)
  statistics?: any;
  
  // Analysis functions
  analyzeConsistency: (issues: LQASyncIssue[]) => Promise<void>;
  generatePanelMetrics: (content: string, issues: LQASyncIssue[], panelName: string) => PanelMetrics;
  getIssuesByPanel: (panel: 'source' | 'target') => LQASyncIssue[];
  getIssuesBySeverity: (severity: 'critical' | 'major' | 'minor' | 'info') => LQASyncIssue[];
  refreshAnalysis: () => Promise<void>;
}

/**
 * Custom hook for managing consistency grade and per-panel metrics
 * 
 * This hook:
 * - Monitors both source and target content
 * - Calculates per-panel quality scores
 * - Aggregates issues by panel, severity, and type
 * - Provides real-time consistency grades
 * - Debounces analysis for performance
 * - Supports both online and offline modes
 */
export const useConsistencyGrade = (
  sourceContent: string,
  targetContent: string,
  sourceLanguage: string,
  targetLanguage: string,
  enabled: boolean = true
): UseConsistencyGradeReturn => {
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use LQA sync for consistency analysis
  const { issues, isAnalyzing } = useLQASync(
    sourceContent,
    targetContent,
    enabled,
    sourceLanguage,
    targetLanguage
  );

  /**
   * Map LQA issue type to severity level
   */
  const mapIssueTypeToSeverity = useCallback((type: string): 'critical' | 'major' | 'minor' | 'info' => {
    switch (type) {
      case 'grammar': return 'major';
      case 'spelling': return 'major';
      case 'consistency': return 'critical';
      case 'omission': return 'critical';
      default: return 'minor';
    }
  }, []);

  /**
   * Calculate quality score based on issues
   */
  const calculateQualityScore = useCallback((
    issues: LQASyncIssue[],
    contentLength: number
  ): number => {
    if (contentLength === 0) return 100;

    const criticalWeight = 10;
    const majorWeight = 5;
    const minorWeight = 2;
    const infoWeight = 1;

    const criticalCount = issues.filter(i => mapIssueTypeToSeverity(i.type) === 'critical').length;
    const majorCount = issues.filter(i => mapIssueTypeToSeverity(i.type) === 'major').length;
    const minorCount = issues.filter(i => mapIssueTypeToSeverity(i.type) === 'minor').length;
    const infoCount = issues.filter(i => mapIssueTypeToSeverity(i.type) === 'info').length;

    const totalWeight = (
      criticalCount * criticalWeight +
      majorCount * majorWeight +
      minorCount * minorWeight +
      infoCount * infoWeight
    );

    // Normalize by content length (issues per 100 characters)
    const normalizedIssues = (totalWeight / Math.max(contentLength, 1)) * 100;

    // Convert to percentage score (100 = perfect, 0 = very poor)
    const score = Math.max(0, Math.min(100, 100 - normalizedIssues));

    return Math.round(score);
  }, [mapIssueTypeToSeverity]);

  /**
   * Determine which panel an issue belongs to
   * Based on issue context and position
   */
  const getIssuePanel = useCallback((
    issue: LQASyncIssue,
    sourceLength: number,
    targetLength: number
  ): 'source' | 'target' => {
    // If issue has sourceText, it's likely a comparison issue
    // Check position to determine panel
    if (issue.sourceText) {
      // If position is in first half, likely source
      if (issue.startPosition < sourceLength / 2) {
        return 'source';
      }
    }
    
    // Default to target panel (most consistency issues are in target)
    return 'target';
  }, []);

  /**
   * Calculate source editor metrics
   */
  const sourceEditorMetrics = useMemo<PanelMetrics>(() => {
    const sourceIssues = allIssues.filter(issue => 
      getIssuePanel(issue, sourceContent.length, targetContent.length) === 'source'
    );

    const issuesBySeverity = {
      critical: sourceIssues.filter(i => i.severity === 'critical').length,
      major: sourceIssues.filter(i => i.severity === 'major').length,
      minor: sourceIssues.filter(i => i.severity === 'minor').length,
      info: sourceIssues.filter(i => i.severity === 'info').length,
    };

    const issuesByType = sourceIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      panelName: 'Source Editor',
      qualityScore: calculateQualityScore(sourceIssues, sourceContent.length),
      issueCount: sourceIssues.length,
      issues: sourceIssues,
      content: sourceContent,
      contentLength: sourceContent.length,
      lastUpdated: new Date(),
      issuesBySeverity,
      issuesByType
    };
  }, [allIssues, sourceContent, targetContent, getIssuePanel, calculateQualityScore]);

  /**
   * Calculate term validator (target) metrics
   */
  const termValidatorMetrics = useMemo<PanelMetrics>(() => {
    const targetIssues = allIssues.filter(issue => 
      getIssuePanel(issue, sourceContent.length, targetContent.length) === 'target'
    );

    const issuesBySeverity = {
      critical: targetIssues.filter(i => i.severity === 'critical').length,
      major: targetIssues.filter(i => i.severity === 'major').length,
      minor: targetIssues.filter(i => i.severity === 'minor').length,
      info: targetIssues.filter(i => i.severity === 'info').length,
    };

    const issuesByType = targetIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      panelName: 'Term Validator',
      qualityScore: calculateQualityScore(targetIssues, targetContent.length),
      issueCount: targetIssues.length,
      issues: targetIssues,
      content: targetContent,
      contentLength: targetContent.length,
      lastUpdated: new Date(),
      issuesBySeverity,
      issuesByType
    };
  }, [allIssues, sourceContent, targetContent, getIssuePanel, calculateQualityScore]);

  /**
   * Calculate overall quality score
   * Weighted average of both panels
   */
  const overallScore = useMemo(() => {
    if (statistics) {
      return Math.round(statistics.qualityScore);
    }

    // Fallback: weighted average based on content length
    const totalLength = sourceContent.length + targetContent.length;
    if (totalLength === 0) return 100;

    const sourceWeight = sourceContent.length / totalLength;
    const targetWeight = targetContent.length / totalLength;

    const weighted = 
      (sourceEditorMetrics.qualityScore * sourceWeight) +
      (termValidatorMetrics.qualityScore * targetWeight);

    return Math.round(weighted);
  }, [statistics, sourceContent, targetContent, sourceEditorMetrics, termValidatorMetrics]);

  /**
   * Aggregate issues by severity
   */
  const issuesBySeverity = useMemo<IssueSeverityBreakdown>(() => ({
    critical: allIssues.filter(i => i.severity === 'critical').length,
    major: allIssues.filter(i => i.severity === 'major').length,
    minor: allIssues.filter(i => i.severity === 'minor').length,
    info: allIssues.filter(i => i.severity === 'info').length,
  }), [allIssues]);

  /**
   * Aggregate issues by type
   */
  const issuesByType = useMemo(() => {
    return allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [allIssues]);

  /**
   * Get issues by panel
   */
  const getIssuesByPanel = useCallback((panel: 'source' | 'target') => {
    return panel === 'source' 
      ? sourceEditorMetrics.issues 
      : termValidatorMetrics.issues;
  }, [sourceEditorMetrics, termValidatorMetrics]);

  /**
   * Get issues by severity
   */
  const getIssuesBySeverity = useCallback((
    severity: 'critical' | 'major' | 'minor' | 'info'
  ) => {
    return allIssues.filter(issue => issue.severity === severity);
  }, [allIssues]);

  /**
   * Manually trigger analysis
   */
  const refreshAnalysis = useCallback(async () => {
    try {
      setError(null);
      await triggerAnalysis();
      setLastAnalyzed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      console.error('Consistency analysis error:', err);
    }
  }, [triggerAnalysis]);

  /**
   * Update last analyzed timestamp when analysis completes
   */
  useEffect(() => {
    if (!isAnalyzing && allIssues.length >= 0) {
      setLastAnalyzed(new Date());
    }
  }, [isAnalyzing, allIssues]);

  /**
   * Log metrics for debugging
   */
  useEffect(() => {
    if (enabled && !isAnalyzing) {
      console.log('📊 Consistency Grade Metrics:', {
        overallScore,
        totalIssues: allIssues.length,
        sourceScore: sourceEditorMetrics.qualityScore,
        targetScore: termValidatorMetrics.qualityScore,
        issuesBySeverity,
        issuesByType
      });
    }
  }, [enabled, isAnalyzing, overallScore, allIssues, sourceEditorMetrics, termValidatorMetrics, issuesBySeverity, issuesByType]);

  return {
    overallScore,
    totalIssues: allIssues.length,
    issuesBySeverity,
    issuesByType,
    sourceEditorMetrics,
    termValidatorMetrics,
    allIssues,
    isAnalyzing,
    lastAnalyzed,
    error,
    statistics,
    refreshAnalysis,
    getIssuesByPanel,
    getIssuesBySeverity
  };
};
