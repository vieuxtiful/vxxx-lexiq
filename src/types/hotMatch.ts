/**
 * Hot Match System - Type Definitions
 * Provides recommendations for interchangeable terms with crowd-sourced percentages
 */

export interface HotMatchData {
  baseTerm: string;
  detectedTerm: string;
  interchangeableTerms: string[];
  percentages: { [term: string]: number };
  domain: string;
  language: string;
  confidence: number;
  context: string;
  baseTermHash: string;
}

export interface HotMatchSelection {
  userId: string;
  baseTermHash: string;
  selectedTerm: string;
  rejectedTerms: string[];
  domain: string;
  language: string;
  projectId?: string;
  sessionId?: string;
  timestamp: string;
}

export interface HotMatchPercentage {
  term: string;
  percentage: number;
  totalSelections: number;
  lastUpdated: string;
}

export interface HotMatchDetectionRequest {
  terms: any[];
  domain: string;
  language: string;
  content: string;
  projectId?: string;
}

export interface HotMatchDetectionResponse {
  hotMatches: HotMatchData[];
  totalDetected: number;
}

export interface HotMatchRecordRequest {
  baseTerm: string;
  selectedTerm: string;
  rejectedTerms: string[];
  domain: string;
  language: string;
  userId: string;
  projectId?: string;
  sessionId?: string;
}

export interface InterchangeablePattern {
  baseTerm: string;
  alternatives: string[];
  domain: string;
  confidence: number;
}

export interface HotMatchBadgeProps {
  percentage: number;
  term: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export interface HotMatchDialogProps {
  hotMatchData: HotMatchData;
  onTermSelect: (selectedTerm: string, rejectedTerms: string[]) => void;
  onSkip: () => void;
  isVisible: boolean;
}

export interface HotMatchTooltipProps {
  term: string;
  hotMatchData?: HotMatchData;
  children: React.ReactNode;
}
