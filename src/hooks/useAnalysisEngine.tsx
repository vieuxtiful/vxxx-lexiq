import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { analysisCache } from '@/lib/analysisCache';
import { enhanceAnalysisContext } from '@/utils/contextExtractor';

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
  spellingIssues: number;
  grammarIssues: number;
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
  const [currentFullText, setCurrentFullText] = useState(''); // Track the analyzed text

  const analyzeTranslation = async (
    translationContent: string,
    glossaryContent: string,
    language: string,
    domain: string,
    checkGrammar: boolean = false,
    checkSpelling: boolean = true,
    signal?: AbortSignal
  ): Promise<AnalysisResult> => {
    // Check cache first
    const cacheKey = analysisCache.generateKey(translationContent, language, domain, checkGrammar, checkSpelling);
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
    setCurrentFullText(translationContent); // Store the full text for context enhancement

    try {
      // Check if already cancelled
      if (signal?.aborted) {
        throw new Error('Analysis cancelled by user');
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      console.log('Starting analysis with Lovable AI...');

      // Add timeout wrapper for the API call
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout after 2 minutes. Please try with a smaller text (500-1000 words) or simplify your glossary.')), 120000);
      });

      // Add abort handling
      const abortPromise = signal ? new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Analysis cancelled by user')), { once: true });
      }) : Promise.race([]);

      const analysisPromise = supabase.functions.invoke('analyze-translation', {
        body: {
          translationContent,
          glossaryContent,
          language,
          domain,
          checkGrammar,
          checkSpelling,
        },
      });

      const response = await Promise.race([
        analysisPromise, 
        timeoutPromise,
        ...(signal ? [abortPromise] : [])
      ]) as any;

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
        // Check if this is a text limit error (400 status)
        if (error.message?.includes('too large') || error.message?.includes('50,000 characters')) {
          throw new Error('Text exceeds the 50,000 character limit. Please split your content into smaller sections.');
        }
        throw new Error(error.message || 'Analysis failed');
      }

      if (!data) {
        throw new Error('No data received from analysis');
      }

      // Check if data contains an error field
      if (data.error) {
        // Enhanced error messages for specific scenarios
        if (data.error.includes('too large') || data.error.includes('50,000 characters')) {
          throw new Error('Text exceeds the 50,000 character limit. Please split your content into smaller sections.');
        }
        if (data.error.includes('truncated')) {
          throw new Error('Analysis response was too large and got truncated. Please use smaller files or analyze in sections (500-1000 words recommended).');
        }
        throw new Error(data.error);
      }

      const result = data as AnalysisResult;

      // ENHANCE CONTEXT: Process the results to improve context fields
      const enhancedResult = enhanceAnalysisContext(result, translationContent);

      // Cache the enhanced result with content hash
      analysisCache.set(cacheKey, enhancedResult, translationContent);

      // Set progress to 100 and keep it visible briefly
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Analysis complete",
        description: `Analyzed ${enhancedResult.statistics.totalTerms} terms with ${enhancedResult.statistics.qualityScore.toFixed(1)}% quality score`,
      });

      return enhancedResult;
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

  // Add a function to re-process context if needed
  const enhanceExistingAnalysisContext = (analysisResult: AnalysisResult, fullText: string): AnalysisResult => {
    return enhanceAnalysisContext(analysisResult, fullText);
  };

  return { 
    analyzeTranslation, 
    isAnalyzing, 
    progress,
    enhanceExistingAnalysisContext,
    currentFullText 
  };
};
