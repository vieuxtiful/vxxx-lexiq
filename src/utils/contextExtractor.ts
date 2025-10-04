/**
 * Enhanced context extraction utilities
 */

/**
 * Extract the full sentence containing a term from the complete text
 */
export function extractSentenceContext(
  fullText: string, 
  startPos: number, 
  endPos: number, 
  maxLength: number = 200
): string {
  if (!fullText || startPos < 0 || endPos > fullText.length) {
    return extractFallbackContext(fullText, startPos, endPos, 50);
  }

  // Sentence boundary characters
  const sentenceEnders = /[.!?。！？\n]/;
  
  // Find sentence start
  let sentenceStart = startPos;
  for (let i = startPos; i >= 0; i--) {
    if (i === 0) {
      sentenceStart = 0;
      break;
    }
    if (sentenceEnders.test(fullText[i])) {
      sentenceStart = i + 1;
      break;
    }
  }

  // Find sentence end
  let sentenceEnd = endPos;
  for (let i = endPos; i < fullText.length; i++) {
    if (sentenceEnders.test(fullText[i])) {
      sentenceEnd = i + 1;
      break;
    }
    if (i === fullText.length - 1) {
      sentenceEnd = fullText.length;
      break;
    }
  }

  let sentence = fullText.substring(sentenceStart, sentenceEnd).trim();
  
  // Clean up: normalize whitespace and remove extra spaces
  sentence = sentence.replace(/\s+/g, ' ').trim();
  
  // If the extracted context is too long, intelligently truncate
  if (sentence.length > maxLength) {
    const term = fullText.substring(startPos, endPos);
    const termIndex = sentence.indexOf(term);
    
    if (termIndex !== -1) {
      const padding = Math.floor((maxLength - term.length) / 2);
      let start = Math.max(0, termIndex - padding);
      let end = Math.min(sentence.length, termIndex + term.length + padding);
      
      // Adjust to word boundaries
      while (start > 0 && !/\s/.test(sentence[start])) start--;
      while (end < sentence.length && !/\s/.test(sentence[end])) end++;
      
      let excerpt = sentence.substring(start, end).trim();
      
      // Add ellipsis if we truncated from the start
      if (start > 0) excerpt = '...' + excerpt;
      // Add ellipsis if we truncated from the end  
      if (end < sentence.length) excerpt = excerpt + '...';
      
      return excerpt;
    }
  }
  
  return sentence;
}

/**
 * Fallback context extraction for edge cases
 */
function extractFallbackContext(
  text: string, 
  startPos: number, 
  endPos: number, 
  windowSize: number = 50
): string {
  const contextStart = Math.max(0, startPos - windowSize);
  const contextEnd = Math.min(text.length, endPos + windowSize);
  
  let context = text.substring(contextStart, contextEnd).trim();
  context = context.replace(/\s+/g, ' ').trim();
  
  // Add ellipsis if we're not at the beginning/end
  if (contextStart > 0) context = '...' + context;
  if (contextEnd < text.length) context = context + '...';
  
  return context;
}

/**
 * Process analysis results to enhance context fields
 */
export function enhanceAnalysisContext(
  analysisResult: any, 
  fullText: string
): any {
  if (!analysisResult?.terms || !fullText) {
    return analysisResult;
  }

  const enhancedTerms = analysisResult.terms.map((term: any) => {
    const startPos = term.startPosition || (Array.isArray(term.pos) ? term.pos[0] : 0);
    const endPos = term.endPosition || (Array.isArray(term.pos) ? term.pos[1] : 0);
    
    // Only enhance if we have valid positions and the current context seems partial
    const currentContext = term.context || term.ctx || '';
    if (startPos >= 0 && endPos > startPos && 
        (currentContext.length < 20 || !currentContext.includes('.'))) {
      
      const fullContext = extractSentenceContext(fullText, startPos, endPos);
      
      return {
        ...term,
        context: fullContext,
        ctx: fullContext, // Also update shorthand field for consistency
        enhancedContext: true // Flag to indicate we enhanced this
      };
    }
    
    return term;
  });

  return {
    ...analysisResult,
    terms: enhancedTerms
  };
}
