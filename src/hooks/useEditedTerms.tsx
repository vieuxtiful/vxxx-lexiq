import { useState, useEffect, useMemo } from 'react';
import { AnalyzedTerm } from './useAnalysisEngine';

export const useEditedTerms = (originalTerms: AnalyzedTerm[]) => {
  // Deduplicate terms by text and extract full sentence context
  const deduplicatedTerms = useMemo(() => {
    const termMap = new Map<string, AnalyzedTerm>();
    
    // Helper function to normalize spacing after punctuation
    const normalizeSpacing = (text: string) => {
      return text.replace(/([.,;:!?])(\S)/g, '$1 $2');
    };
    
    originalTerms.forEach(term => {
      const normalizedText = term.text.toLowerCase().trim();
      
      if (!termMap.has(normalizedText)) {
        // Extract full sentence for context
        const context = term.context || '';
        const sentenceMatch = context.match(/[^.!?]*[.!?]/);
        const fullSentence = sentenceMatch ? sentenceMatch[0].trim() : context;
        const normalizedContext = normalizeSpacing(fullSentence);
        
        termMap.set(normalizedText, {
          ...term,
          context: normalizedContext,
          frequency: 1
        });
      } else {
        // Increment frequency for duplicate terms
        const existingTerm = termMap.get(normalizedText)!;
        existingTerm.frequency += 1;
      }
    });
    
    return Array.from(termMap.values());
  }, [originalTerms]);

  // Load edited terms from session storage or use deduplicated terms
  const [editedTerms, setEditedTerms] = useState<AnalyzedTerm[]>(() => {
    const saved = sessionStorage.getItem('lexiq-edited-terms');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to load edited terms:', error);
        return deduplicatedTerms;
      }
    }
    return deduplicatedTerms;
  });

  // Update edited terms when deduplicated terms change
  useEffect(() => {
    // Only update if there are no edits in session storage
    const saved = sessionStorage.getItem('lexiq-edited-terms');
    if (!saved) {
      setEditedTerms(deduplicatedTerms);
    }
  }, [deduplicatedTerms]);

  // Save to session storage whenever edited terms change
  useEffect(() => {
    if (editedTerms.length > 0) {
      sessionStorage.setItem('lexiq-edited-terms', JSON.stringify(editedTerms));
    }
  }, [editedTerms]);

  // Save function to persist changes
  const saveEditedTerms = () => {
    sessionStorage.setItem('lexiq-edited-terms', JSON.stringify(editedTerms));
  };

  // Clear function to reset edited terms
  const clearEditedTerms = () => {
    sessionStorage.removeItem('lexiq-edited-terms');
    setEditedTerms(deduplicatedTerms);
  };

  return {
    editedTerms,
    setEditedTerms,
    saveEditedTerms,
    clearEditedTerms,
  };
};
