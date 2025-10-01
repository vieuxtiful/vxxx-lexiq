// Transform analysis data from backend format to frontend format
import { AnalyzedTerm } from '@/hooks/useAnalysisEngine';

export interface FlaggedTerm {
  text: string;
  start: number;
  end: number;
  score: number;
  hits: number;
  rationale: string;
  classification: 'valid' | 'review' | 'critical' | 'spelling' | 'grammar';
  suggestions?: string[];
  semantic_type?: {
    semantic_type: string;
    confidence: number;
    ui_information?: {
      category: string;
      color_code: string;
      description: string;
      display_name: string;
    };
  };
  grammar_issues?: Array<{
    rule: string;
    severity: string;
    suggestion: string;
  }>;
  ui_metadata?: {
    semantic_type_info?: any;
    confidence_level: string;
    has_grammar_issues: boolean;
    grammar_severity: string;
  };
}

export const transformAnalyzedTermsToFlagged = (terms: AnalyzedTerm[]): FlaggedTerm[] => {
  return terms.map(term => ({
    text: term.text,
    start: term.startPosition,
    end: term.endPosition,
    score: term.score,
    hits: term.frequency,
    rationale: term.rationale,
    classification: term.classification,
    suggestions: term.suggestions,
    semantic_type: term.semantic_type,
    grammar_issues: term.grammar_issues,
    ui_metadata: term.ui_metadata,
  }));
};
