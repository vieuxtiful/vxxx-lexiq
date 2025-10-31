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
    if (issues.length === 0) return 100;

    // Simple scoring: reduce score based on issue count
    const issueRatio = issues.length / Math.max(contentLength / 100, 1);
    const score = Math.max(0, Math.min(100, 100 - (issueRatio * 20)));
    
    return Math.round(score);
  }, []);

  /**
   * Generate panel metrics
   */
  const generatePanelMetrics = useCallback((
    content: string,
    issues: LQASyncIssue[],
    panelName: string
  ): PanelMetrics => {
    const qualityScore = calculateQualityScore(issues, content.length);
    
    const issuesBySeverity = {
      critical: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'critical').length,
      major: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'major').length,
      minor: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'minor').length,
      info: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'info').length,
    };

    const issuesByType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      panelName,
      qualityScore,
      issueCount: issues.length,
      issues,
      content,
      contentLength: content.length,
      lastUpdated: new Date(),
      issuesBySeverity,
      issuesByType,
    };
  }, [calculateQualityScore, mapIssueTypeToSeverity]);

  // Calculate metrics
  const sourceEditorMetrics = useMemo(() => 
    generatePanelMetrics(sourceContent, [], 'Source Editor'),
    [sourceContent, generatePanelMetrics]
  );

  const termValidatorMetrics = useMemo(() => 
    generatePanelMetrics(targetContent, issues, 'Term Validator'),
    [targetContent, issues, generatePanelMetrics]
  );

  const overallScore = useMemo(() => {
    const totalLength = sourceContent.length + targetContent.length;
    return calculateQualityScore(issues, totalLength);
  }, [issues, sourceContent.length, targetContent.length, calculateQualityScore]);

  const issuesBySeverity = useMemo<IssueSeverityBreakdown>(() => ({
    critical: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'critical').length,
    major: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'major').length,
    minor: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'minor').length,
    info: issues.filter(i => mapIssueTypeToSeverity(i.type) === 'info').length,
  }), [issues, mapIssueTypeToSeverity]);

  const issuesByType = useMemo(() => 
    issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    [issues]
  );

  // Analysis functions
  const analyzeConsistency = useCallback(async (issues: LQASyncIssue[]) => {
    setLastAnalyzed(new Date());
  }, []);

  const getIssuesByPanel = useCallback((panel: 'source' | 'target') => {
    // For now, assume all issues are in target panel
    return panel === 'target' ? issues : [];
  }, [issues]);

  const getIssuesBySeverity = useCallback((severity: 'critical' | 'major' | 'minor' | 'info') => {
    return issues.filter(i => mapIssueTypeToSeverity(i.type) === severity);
  }, [issues, mapIssueTypeToSeverity]);

  const refreshAnalysis = useCallback(async () => {
    setLastAnalyzed(new Date());
  }, []);

  // Update last analyzed when issues change
  useEffect(() => {
    if (issues.length > 0) {
      setLastAnalyzed(new Date());
    }
  }, [issues]);

  return {
    overallScore,
    totalIssues: issues.length,
    issuesBySeverity,
    issuesByType,
    sourceEditorMetrics,
    termValidatorMetrics,
    allIssues: issues,
    isAnalyzing,
    lastAnalyzed,
    error,
    statistics: null,
    analyzeConsistency,
    generatePanelMetrics,
    getIssuesByPanel,
    getIssuesBySeverity,
    refreshAnalysis,
  };
};
