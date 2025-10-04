/**
 * Text chunking utilities for handling large translation files
 */

import { AnalyzedTerm, AnalysisStatistics } from '@/hooks/useAnalysisEngine';

export interface TextChunk {
  content: string;
  chunkIndex: number;
  totalChunks: number;
  startPosition: number;
  endPosition: number;
  overlapStart: number;
  overlapEnd: number;
}

/**
 * Split text into chunks with overlap to prevent missing terms at boundaries
 */
export const chunkText = (
  text: string,
  maxChunkSize: number = 6000,
  overlapSize: number = 200
): TextChunk[] => {
  if (text.length <= maxChunkSize) {
    return [{
      content: text,
      chunkIndex: 0,
      totalChunks: 1,
      startPosition: 0,
      endPosition: text.length,
      overlapStart: 0,
      overlapEnd: 0
    }];
  }

  const chunks: TextChunk[] = [];
  let position = 0;
  let chunkIndex = 0;

  while (position < text.length) {
    const chunkEnd = Math.min(position + maxChunkSize, text.length);
    let actualEnd = chunkEnd;

    // Try to break on sentence boundary if not at the end
    if (chunkEnd < text.length) {
      // Look for sentence endings within last 500 chars of chunk
      const searchStart = Math.max(chunkEnd - 500, position);
      const searchText = text.substring(searchStart, chunkEnd);
      
      // Find last sentence boundary (., !, ?, or newline followed by space or end)
      const sentenceEndings = ['. ', '.\n', '! ', '!\n', '? ', '?\n'];
      let lastBoundary = -1;
      
      for (const ending of sentenceEndings) {
        const idx = searchText.lastIndexOf(ending);
        if (idx > lastBoundary) {
          lastBoundary = idx;
        }
      }

      if (lastBoundary > 0) {
        actualEnd = searchStart + lastBoundary + 1; // +1 to include the period
      }
    }

    const overlapStart = chunkIndex > 0 ? overlapSize : 0;
    const overlapEnd = actualEnd < text.length ? overlapSize : 0;

    const chunkContent = text.substring(
      Math.max(0, position - overlapStart),
      Math.min(text.length, actualEnd + overlapEnd)
    );

    chunks.push({
      content: chunkContent,
      chunkIndex,
      totalChunks: 0, // Will be updated after all chunks are created
      startPosition: position,
      endPosition: actualEnd,
      overlapStart,
      overlapEnd
    });

    position = actualEnd;
    chunkIndex++;
  }

  // Update totalChunks for all chunks
  chunks.forEach(chunk => {
    chunk.totalChunks = chunks.length;
  });

  return chunks;
};

/**
 * Merge analysis results from multiple chunks, handling overlaps
 */
export const mergeChunkedAnalysis = (
  chunkResults: AnalyzedTerm[][],
  chunks: TextChunk[]
): AnalyzedTerm[] => {
  if (chunkResults.length === 0) return [];
  if (chunkResults.length === 1) return chunkResults[0];

  const mergedTerms: AnalyzedTerm[] = [];
  const seenTerms = new Map<string, AnalyzedTerm>(); // Key: text + adjusted position

  chunkResults.forEach((terms, chunkIdx) => {
    const chunk = chunks[chunkIdx];
    
    terms.forEach(term => {
      // Adjust positions based on chunk offset
      const adjustedStart = chunk.startPosition + term.startPosition - chunk.overlapStart;
      const adjustedEnd = chunk.startPosition + term.endPosition - chunk.overlapStart;

      // Check if this term is in the overlap region
      const isInStartOverlap = term.startPosition < chunk.overlapStart;
      const isInEndOverlap = chunk.overlapEnd > 0 && 
        term.startPosition > (chunk.content.length - chunk.overlapEnd);

      // Skip terms in start overlap (they were already processed in previous chunk)
      if (isInStartOverlap && chunkIdx > 0) {
        return;
      }

      // Skip duplicates in end overlap
      const termKey = `${term.text}:${adjustedStart}`;
      if (seenTerms.has(termKey)) {
        return;
      }

      // Create adjusted term
      const adjustedTerm: AnalyzedTerm = {
        ...term,
        startPosition: adjustedStart,
        endPosition: adjustedEnd
      };

      seenTerms.set(termKey, adjustedTerm);
      mergedTerms.push(adjustedTerm);
    });
  });

  // Sort by position
  return mergedTerms.sort((a, b) => a.startPosition - b.startPosition);
};

/**
 * Recalculate statistics for merged terms
 */
export const calculateStatistics = (terms: AnalyzedTerm[]): AnalysisStatistics => {
  const validTerms = terms.filter(t => t.classification === 'valid').length;
  const reviewTerms = terms.filter(t => t.classification === 'review').length;
  const criticalTerms = terms.filter(t => t.classification === 'critical').length;
  
  const totalScore = terms.reduce((sum, term) => sum + term.score, 0);
  const qualityScore = terms.length > 0 ? (totalScore / terms.length) : 0;
  
  const scores = terms.map(t => t.score);
  const confidenceMin = scores.length > 0 ? Math.min(...scores) : 0;
  const confidenceMax = scores.length > 0 ? Math.max(...scores) : 0;
  
  const uniqueTerms = new Set(terms.map(t => t.text.toLowerCase())).size;
  const coverage = terms.length > 0 ? (uniqueTerms / terms.length) * 100 : 0;

  return {
    totalTerms: terms.length,
    validTerms,
    reviewTerms,
    criticalTerms,
    qualityScore,
    confidenceMin,
    confidenceMax,
    coverage
  };
};
