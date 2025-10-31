/**
 * Type definitions for the enhanced Consistency Check system
 * Integrates with backend API for robust LQA functionality
 */

export type ConsistencyCheckType =
  | 'segment_alignment'
  | 'glossary_compliance'
  | 'capitalization'
  | 'punctuation'
  | 'number_format'
  | 'whitespace'
  | 'tag_placeholder'
  | 'grammar'
  | 'spelling'
  | 'custom_rule';

export type IssueSeverity = 'critical' | 'major' | 'minor' | 'info';

export interface GlossaryTerm {
  id: string;
  source: string;
  target: string;
  domain?: string;
  caseSensitive?: boolean;
  forbidden?: boolean;
}

export interface CustomRule {
  id: string;
  name: string;
  type: 'regex' | 'forbidden' | 'required';
  pattern: string;
  replacement?: string;
  description: string;
  severity: IssueSeverity;
  enabled: boolean;
}

export interface ConsistencyIssue {
  id: string;
  type: ConsistencyCheckType;
  severity: IssueSeverity;
  sourceText?: string;
  targetText: string;
  startPosition: number;
  endPosition: number;
  context: string;
  message: string;
  rationale: string;
  suggestions: string[];
  confidence: number;
  autoFixable: boolean;
  ruleId?: string;
}

export interface ConsistencyStatistics {
  totalIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  infoIssues: number;
  issuesByType: Record<ConsistencyCheckType, number>;
  qualityScore: number;
  averageConfidence: number;
}

export interface ConsistencyCheckRequest {
  sourceText: string;
  translationText: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaryTerms?: GlossaryTerm[];
  customRules?: CustomRule[];
  checkTypes?: ConsistencyCheckType[];
  enableCache?: boolean;
}

export interface ConsistencyCheckResponse {
  issues: ConsistencyIssue[];
  statistics: ConsistencyStatistics;
  cacheKey?: string;
  processingTime?: number;
}

export interface ConsistencyCheckCache {
  contentHash: string;
  timestamp: number;
  response: ConsistencyCheckResponse;
}

export interface ConsistencyEngineConfig {
  mode: 'online' | 'offline' | 'hybrid';
  enableBatching: boolean;
  batchSize: number;
  cacheEnabled: boolean;
  cacheTTL: number; // milliseconds
  retryAttempts: number;
  timeout: number; // milliseconds
}
