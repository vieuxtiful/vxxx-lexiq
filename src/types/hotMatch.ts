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
  semanticType?: string; // Semantic classification (e.g., 'Healthcare', 'Legal', 'IT')
  contextSentence?: string; // Sentence-level context from Milvus embeddings
  projectType?: string; // Project domain type for alignment verification
  matchStatus?: boolean; // Domain alignment confirmation (Milvus domain == ProjectType)
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
  projectType?: string; // Current project type for domain verification
  showSemanticColors?: boolean; // Enable semantic color coding
}

// Semantic color mapping for domain-specific visual distinction
export interface SemanticColorConfig {
  cmyk: string; // CMYK color values for print
  hex: string; // Hexadecimal color for web
  name: string; // Display name
}

export const SEMANTIC_COLOR_INDEX: Record<string, SemanticColorConfig> = {
  Healthcare: { cmyk: '0,0,0,0', hex: '#e91e63', name: 'Healthcare' },
  Medical: { cmyk: '0,0,0,0', hex: '#e91e63', name: 'Medical' },
  Legal: { cmyk: '0,0,0,40', hex: '#9c27b0', name: 'Legal' },
  Scientific: { cmyk: '0,0,40,0', hex: '#00bcd4', name: 'Scientific' },
  'Scientific Research': { cmyk: '0,0,40,0', hex: '#00bcd4', name: 'Scientific Research' },
  IT: { cmyk: '60,0,0,0', hex: '#3f51b5', name: 'IT' },
  Technology: { cmyk: '60,0,0,0', hex: '#3f51b5', name: 'Technology' },
  Finance: { cmyk: '0,60,60,0', hex: '#4caf50', name: 'Finance' },
  Marketing: { cmyk: '0,80,80,0', hex: '#ff9800', name: 'Marketing' },
  General: { cmyk: '0,0,0,20', hex: '#9e9e9e', name: 'General' },
};
