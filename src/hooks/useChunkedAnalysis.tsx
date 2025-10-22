import { useState, useRef, useEffect } from 'react';
import { useAnalysisEngine, AnalysisResult, AnalyzedTerm } from './useAnalysisEngine';
import { chunkText, mergeChunkedAnalysis, calculateStatistics } from '@/utils/textChunker';
import { useToast } from './use-toast';

export const useChunkedAnalysis = () => {
  const { analyzeTranslation } = useAnalysisEngine();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [targetProgress, setTargetProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth progress interpolation - updates every 250ms for fluid animation
  useEffect(() => {
    if (!isAnalyzing) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    progressIntervalRef.current = setInterval(() => {
      setProgress(currentProgress => {
        if (currentProgress >= targetProgress) {
          return currentProgress;
        }
        
        // Increment by 1% every 250ms for smooth fluid effect
        const increment = 1;
        const newProgress = Math.min(currentProgress + increment, targetProgress);
        
        // Log progress updates for debugging
        if (newProgress % 10 === 0 || newProgress === targetProgress) {
          console.log(`🌊 Liquid progress: ${newProgress}% (target: ${targetProgress}%)`);
        }
        
        return newProgress;
      });
    }, 250); // Update every 0.25 seconds

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isAnalyzing, targetProgress]);

  const cancelAnalysis = () => {
    if (abortControllerRef.current) {
      console.log('🛑 User initiated analysis cancellation');
      abortControllerRef.current.abort();
      
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Immediate state reset
      setIsAnalyzing(false);
      setProgress(0);
      setTargetProgress(0);
      setCurrentChunk(0);
      setTotalChunks(0);
      
      toast({
        title: "Analysis cancelled",
        description: "Returning to pre-analysis state.",
      });
    }
  };

  const analyzeWithChunking = async (
    content: string,
    glossary: string,
    language: string,
    domain: string,
    checkGrammar: boolean,
    checkSpelling: boolean = true
  ): Promise<AnalysisResult | null> => {
    // Start progress tracking
    setIsAnalyzing(true);
    setProgress(0);
    setTargetProgress(0);

    // If content is within normal limits, use standard analysis
    if (content.length <= 5000) {
      console.log('📝 Small file - using standard analysis with smooth progress');
      
      // Simulate smooth progress for small files
      setTargetProgress(95); // Start filling to 95%
      
      try {
        const result = await analyzeTranslation(content, glossary, language, domain, checkGrammar, checkSpelling);
        
        // Complete to 100%
        setTargetProgress(100);
        
        // Wait for smooth interpolation to reach 100%
        await new Promise(resolve => {
          const checkProgress = setInterval(() => {
            setProgress(current => {
              if (current >= 100) {
                clearInterval(checkProgress);
                resolve(undefined);
                return current;
              }
              return current;
            });
          }, 100);
        });
        
        // Brief delay to show 100% before cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return result;
      } catch (error) {
        console.error('Standard analysis error:', error);
        return null;
      } finally {
        setIsAnalyzing(false);
        setProgress(0);
        setTargetProgress(0);
      }
    }

    // Content is large - use chunking
    console.log('📦 Large file - using chunked analysis with smooth progress');
    abortControllerRef.current = new AbortController();

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
        // Set target progress - smooth interpolation will handle the animation
        const chunkProgress = ((i + 1) / chunks.length) * 100;
        setTargetProgress(Math.min(chunkProgress, 95)); // Cap at 95% until complete

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
              checkGrammar,
              checkSpelling,
              abortControllerRef.current.signal // Pass abort signal
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

      // Complete to 100%
      setTargetProgress(100);
      
      // Wait for smooth interpolation to reach 100%
      await new Promise(resolve => {
        const checkProgress = setInterval(() => {
          setProgress(current => {
            if (current >= 100) {
              clearInterval(checkProgress);
              resolve(undefined);
              return current;
            }
            return current;
          });
        }, 100);
      });
      
      // Brief delay to show 100% before cleanup
      await new Promise(resolve => setTimeout(resolve, 500));

      const successRate = (validResults.length / chunks.length * 100).toFixed(0);
      toast({
        title: "Analysis complete",
        description: `Analyzed ${statistics.totalTerms} terms from ${validResults.length}/${chunks.length} chunks (${successRate}% success rate)`,
      });

      return result;
    } catch (error) {
      console.error('Chunked analysis error:', error);
      
      // Don't show error toast if it was a user cancellation
      if (error instanceof Error && error.message.includes('cancelled by user')) {
        console.log('Analysis was cancelled by user - no error toast needed');
      } else {
        toast({
          title: "Analysis failed",
          description: error instanceof Error ? error.message : 'Unknown error during chunked analysis',
          variant: "destructive",
        });
      }
      return null;
    } finally {
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      setIsAnalyzing(false);
      setProgress(0);
      setTargetProgress(0);
      setCurrentChunk(0);
      setTotalChunks(0);
      abortControllerRef.current = null;
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
