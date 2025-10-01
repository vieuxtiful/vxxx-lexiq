import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyzedTerm {
  text: string;
  startPosition: number;
  endPosition: number;
  classification: 'valid' | 'review' | 'critical' | 'spelling';
  score: number;
  frequency: number;
  context: string;
  rationale: string;
  suggestions?: string[];
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
    domain: string
  ): Promise<AnalysisResult | null> => {
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
        setTimeout(() => reject(new Error('Analysis timeout - please try with a smaller file')), 120000); // 2 minute timeout
      });

      const analysisPromise = supabase.functions.invoke('analyze-translation', {
        body: {
          translationContent,
          glossaryContent,
          language,
          domain,
        },
      });

      const response = await Promise.race([analysisPromise, timeoutPromise]) as any;

      clearInterval(progressInterval);
      
      console.log('Analysis response:', response);

      // Enhanced error handling - check for non-2xx status codes
      if (response.error) {
        console.error('Supabase function error:', response.error);
        
        // Try to get more detailed error information
        let errorMessage = response.error.message || 'Analysis failed';
        
        // If the error has context with more details, use that
        if (response.error.context?.body) {
          try {
            const errorBody = JSON.parse(response.error.context.body);
            errorMessage = errorBody.error || errorMessage;
          } catch (e) {
            // If we can't parse the body, use the original message
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
