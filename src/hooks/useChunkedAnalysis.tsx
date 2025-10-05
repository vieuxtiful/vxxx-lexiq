import { useState, useRef } from 'react';
import { useAnalysisEngine, AnalysisResult, AnalyzedTerm } from './useAnalysisEngine';
import { chunkText, mergeChunkedAnalysis, calculateStatistics } from '@/utils/textChunker';
import { useToast } from './use-toast';

export const useChunkedAnalysis = () => {
  const { analyzeTranslation } = useAnalysisEngine();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelAnalysis = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast({
        title: "Analysis cancelled",
        description: "The analysis has been stopped.",
      });
    }
  };

  const analyzeWithChunking = async (
    content: string,
    glossary: string,
    language: string,
    domain: string,
    checkGrammar: boolean
  ): Promise<AnalysisResult | null> => {
    // If content is within normal limits, use standard analysis
    if (content.length <= 5000) {
      return analyzeTranslation(content, glossary, language, domain, checkGrammar);
    }

    // Content is large - use chunking
    abortControllerRef.current = new AbortController();
    setIsAnalyzing(true);
    setProgress(0);

    try {
      const chunks = chunkText(content, 4000, 150);
      setTotalChunks(chunks.length);

      toast({
        title: "Processing large file",
        description: `Splitting into ${chunks.length} chunks for analysis...`,
      });

      const chunkResults: AnalyzedTerm[][] = [];
      const MAX_RETRIES = 3;

      for (let i = 0; i < chunks.length; i++) {
        // Check if cancelled
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Analysis cancelled by user');
        }

        setCurrentChunk(i + 1);
        setProgress(((i + 1) / chunks.length) * 100);

        console.log(`Processing chunk ${i + 1}/${chunks.length}`);

        let analysis: AnalysisResult | null = null;
        let lastError: Error | null = null;

        // Retry logic with exponential backoff
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          // Check if cancelled before retry
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Analysis cancelled by user');
          }

          try {
            if (attempt > 0) {
              const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              console.log(`Retry attempt ${attempt + 1}/${MAX_RETRIES} for chunk ${i + 1} after ${backoffMs}ms`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
            }

            analysis = await analyzeTranslation(
              chunks[i].content,
              glossary,
              language,
              domain,
              checkGrammar
            );

            if (analysis) {
              break; // Success - exit retry loop
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            console.error(`Chunk ${i + 1} attempt ${attempt + 1} failed:`, lastError.message);
          }
        }

        if (!analysis) {
          console.error(`All retries failed for chunk ${i + 1}. Last error:`, lastError?.message);
          toast({
            title: "Chunk analysis failed",
            description: `Chunk ${i + 1}/${chunks.length} failed after ${MAX_RETRIES} attempts. Skipping...`,
            variant: "destructive",
          });
          // Continue with empty results for this chunk instead of failing entirely
          chunkResults.push([]);
          continue;
        }

        chunkResults.push(analysis.terms);

        // Delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Filter out empty results and merge
      const validResults = chunkResults.filter(r => r.length > 0);
      
      if (validResults.length === 0) {
        throw new Error('All chunks failed analysis. Please try with smaller file or check your connection.');
      }

      console.log(`Merging ${validResults.length}/${chunks.length} successful chunk results...`);
      const mergedTerms = mergeChunkedAnalysis(validResults, chunks.filter((_, i) => chunkResults[i].length > 0));
      const statistics = calculateStatistics(mergedTerms);

      const result: AnalysisResult = {
        terms: mergedTerms,
        statistics
      };

      setProgress(100);

      const successRate = (validResults.length / chunks.length * 100).toFixed(0);
      toast({
        title: "Analysis complete",
        description: `Analyzed ${statistics.totalTerms} terms from ${validResults.length}/${chunks.length} chunks (${successRate}% success rate)`,
      });

      return result;
    } catch (error) {
      console.error('Chunked analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : 'Unknown error during chunked analysis',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
      setCurrentChunk(0);
      setTotalChunks(0);
      abortControllerRef.current = null;
      setTimeout(() => setProgress(0), 100);
    }
  };

  return { 
    analyzeWithChunking, 
    cancelAnalysis,
    isAnalyzing, 
    progress,
    currentChunk,
    totalChunks
  };
};
