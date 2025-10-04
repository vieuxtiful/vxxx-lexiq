import { useState } from 'react';
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

  const analyzeWithChunking = async (
    content: string,
    glossary: string,
    language: string,
    domain: string,
    checkGrammar: boolean
  ): Promise<AnalysisResult | null> => {
    // If content is within normal limits, use standard analysis
    if (content.length <= 15000) {
      return analyzeTranslation(content, glossary, language, domain, checkGrammar);
    }

    // Content is large - use chunking
    setIsAnalyzing(true);
    setProgress(0);

    try {
      const chunks = chunkText(content, 12000, 200);
      setTotalChunks(chunks.length);

      toast({
        title: "Processing large file",
        description: `Splitting into ${chunks.length} chunks for analysis...`,
      });

      const chunkResults: AnalyzedTerm[][] = [];

      for (let i = 0; i < chunks.length; i++) {
        setCurrentChunk(i + 1);
        setProgress(((i + 1) / chunks.length) * 100);

        console.log(`Processing chunk ${i + 1}/${chunks.length}`);

        const analysis = await analyzeTranslation(
          chunks[i].content,
          glossary,
          language,
          domain,
          checkGrammar
        );

        if (!analysis) {
          throw new Error(`Analysis failed for chunk ${i + 1}`);
        }

        chunkResults.push(analysis.terms);

        // Small delay between chunks to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Merge all chunk results
      console.log('Merging chunk results...');
      const mergedTerms = mergeChunkedAnalysis(chunkResults, chunks);
      const statistics = calculateStatistics(mergedTerms);

      const result: AnalysisResult = {
        terms: mergedTerms,
        statistics
      };

      setProgress(100);

      toast({
        title: "Large file analysis complete",
        description: `Analyzed ${statistics.totalTerms} terms across ${chunks.length} chunks with ${statistics.qualityScore.toFixed(1)}% quality score`,
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
      setTimeout(() => setProgress(0), 100);
    }
  };

  return { 
    analyzeWithChunking, 
    isAnalyzing, 
    progress,
    currentChunk,
    totalChunks
  };
};
