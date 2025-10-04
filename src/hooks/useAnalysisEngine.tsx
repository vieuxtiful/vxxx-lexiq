import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analysisCache } from '@/lib/analysisCache';

export interface AnalyzedTerm {
  text: string;
  startPosition: number;
  endPosition: number;
  classification: 'valid' | 'review' | 'critical' | 'spelling' | 'grammar';
  score: number;
  frequency: number;
  context: string;
  rationale: string;
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

export interface AnalysisStatistics {
  totalTerms: number;
  validTerms: number;
  reviewTerms: number;
  criticalTerms: number;
  qualityScore: number;
  confidenceMin: number;
  confidenceMax: number;
  coverage: number;
}

export interface AnalysisResult {
  terms: AnalyzedTerm[];
  statistics: AnalysisStatistics;
}

export const useAnalysisEngine = () => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const analyzeTranslation = async (
    translationContent: string,
    glossaryContent: string,
    language: string,
    domain: string,
    checkGrammar: boolean = false
  ): Promise<AnalysisResult | null> => {
    // Check cache first
    const cacheKey = analysisCache.generateKey(translationContent, language, domain, checkGrammar);
    const cachedResult = analysisCache.get<AnalysisResult>(cacheKey);
    
    if (cachedResult) {
      console.log('Returning cached analysis result');
      toast({
        title: "Analysis complete (cached)",
        description: `Analyzed ${cachedResult.statistics.totalTerms} terms with ${cachedResult.statistics.qualityScore.toFixed(1)}% quality score`,
      });
      return cachedResult;
    }

    setIsAnalyzing(true);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      console.log('Starting analysis with Lovable AI...');

      // Add timeout wrapper for the API call
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout after 2 minutes. Please try with a smaller text (500-1000 words) or simplify your glossary.')), 120000);
      });

      const analysisPromise = supabase.functions.invoke('analyze-translation', {
        body: {
          translationContent,
          glossaryContent,
          language,
          domain,
          checkGrammar,
        },
      });

      const response = await Promise.race([analysisPromise, timeoutPromise]) as any;

      clearInterval(progressInterval);
      
      console.log('Analysis response:', response);

      // Enhanced error handling - check for non-2xx status codes
      if (response.error) {
        console.error('Supabase function error:', response.error);
        
        // Try to extract detailed error from FunctionInvokeError
        let errorMessage = response.error.message || 'Analysis failed';
        
        // Check for FunctionInvokeError context which contains the actual response
        if (response.error.context) {
          try {
            // The context contains the full error response
            const context = response.error.context;
            
            // Try to parse the response body if it exists
            if (typeof context.body === 'string') {
              const errorBody = JSON.parse(context.body);
              errorMessage = errorBody.error || errorMessage;
            } else if (context.body?.error) {
              errorMessage = context.body.error;
            }
          } catch (e) {
            console.error('Failed to parse error context:', e);
          }
        }
        
        throw new Error(errorMessage);
      }

      const { data, error } = response;

      if (error) {
        console.error('Response error:', error);
        throw new Error(error.message || 'Analysis failed');
      }

      if (!data) {
        throw new Error('No data received from analysis');
      }

      // Check if data contains an error field
      if (data.error) {
        throw new Error(data.error);
      }

      const result = data as AnalysisResult;

      // Cache the result
      analysisCache.set(cacheKey, result);

      // Set progress to 100 and keep it visible briefly
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Analysis complete",
        description: `Analyzed ${result.statistics.totalTerms} terms with ${result.statistics.qualityScore.toFixed(1)}% quality score`,
      });

      return result;
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
      // Delay resetting progress to allow the UI to show 100%
      setTimeout(() => setProgress(0), 100);
    }
  };

  return { analyzeTranslation, isAnalyzing, progress };
};
