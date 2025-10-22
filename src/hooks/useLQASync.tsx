import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LQASyncIssue {
  type: 'grammar' | 'spelling' | 'consistency' | 'omission';
  sourceText: string;
  targetText: string;
  suggestion: string;
  confidence: number;
  rationale: string;
  startPosition: number;
  endPosition: number;
}

export const useLQASync = (
  sourceContent: string, 
  targetContent: string, 
  enabled: boolean,
  sourceLanguage: string,
  targetLanguage: string
) => {
  const [issues, setIssues] = useState<LQASyncIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!enabled || !sourceContent.trim() || !targetContent.trim()) {
      console.log('🔍 LQA Sync skipped:', { 
        enabled, 
        hasSource: !!sourceContent.trim(), 
        hasTarget: !!targetContent.trim() 
      });
      setIssues([]);
      return;
    }

    console.log('⏳ LQA Sync scheduled (2s delay):', {
      sourceLength: sourceContent.length,
      targetLength: targetContent.length,
      sourceLanguage,
      targetLanguage
    });

    const analyzeSync = async () => {
      console.log('🔄 LQA Sync starting analysis...');
      setIsAnalyzing(true);
      try {
        const syncIssues = await analyzeLQASync(
          sourceContent, 
          targetContent,
          sourceLanguage,
          targetLanguage
        );
        console.log('✅ LQA Sync complete:', { issueCount: syncIssues.length, issues: syncIssues });
        setIssues(syncIssues);
      } catch (error) {
        console.error('❌ LQA sync analysis failed:', error);
        setIssues([]);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounceTimer = setTimeout(analyzeSync, 2000);
    return () => clearTimeout(debounceTimer);
  }, [sourceContent, targetContent, enabled, sourceLanguage, targetLanguage]);

  return { issues, isAnalyzing };
};

// Actual LQA cross-pane analysis using current LexiQ engine
const analyzeLQASync = async (
  source: string, 
  target: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<LQASyncIssue[]> => {
  try {
    // Call the analyze-translation edge function for cross-pane LQA analysis
    const { data, error } = await supabase.functions.invoke('analyze-translation', {
      body: {
        translationContent: target,
        glossaryContent: source, // Use source as reference context
        language: targetLanguage,
        domain: 'general',
        checkGrammar: true,
        checkSpelling: true,
        sourceTextOnly: false // Enable cross-pane comparison
      }
    });

    if (error) {
      console.error('LQA sync analysis error:', error);
      return [];
    }

    if (!data?.analysis?.terms) {
      return [];
    }

    // Transform analysis results to LQA sync issues
    const lqaIssues: LQASyncIssue[] = data.analysis.terms
      .filter((term: any) => term.classification === 'grammar' || term.classification === 'spelling')
      .map((term: any) => ({
        type: term.classification as 'grammar' | 'spelling',
        sourceText: source.substring(0, 100), // Context
        targetText: term.text,
        suggestion: term.suggestions?.[0] || '',
        confidence: term.score || 0,
        rationale: term.rationale || '',
        startPosition: term.startPosition || 0,
        endPosition: term.endPosition || 0
      }));

    return lqaIssues;
  } catch (error) {
    console.error('LQA sync analysis exception:', error);
    return [];
  }
};
