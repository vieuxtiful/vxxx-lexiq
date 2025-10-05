import { useState, useEffect, useMemo } from 'react';
import { AnalyzedTerm } from './useAnalysisEngine';

export const useEditedTerms = (originalTerms: AnalyzedTerm[]) => {
  // Deduplicate terms by text and extract full sentence context
  const deduplicatedTerms = useMemo(() => {
    const termMap = new Map<string, AnalyzedTerm>();
    
    // Enhanced function to normalize and stem terms
    const normalizeTermText = (text: string) => {
      // First normalize spacing
      let normalized = text.toLowerCase().trim();
      normalized = normalized.replace(/([.,;:!?])(\S)/g, '$1 $2');
      
      // Simple stemming for common English patterns
      normalized = normalized
        // Remove common plural suffixes
        .replace(/(?<=[bcdfghjklmnpqrstvwxz])s\b/g, '')
        .replace(/ies\b/g, 'y')
        .replace(/(?<=[aeiou])es\b/g, '')
        // Remove common tense suffixes
        .replace(/(?<=[bcdfghjklmnpqrstvwxyz])ed\b/g, '')
        .replace(/(?<=[bcdfghjklmnpqrstvwxyz])ing\b/g, '')
        .replace(/(?<=[aeiou])d\b/g, '');
      
      // Handle common irregular plurals
      const irregularPlurals: Record<string, string> = {
        'people': 'person',
        'children': 'child',
        'men': 'man', 
        'women': 'woman',
        'teeth': 'tooth',
        'feet': 'foot',
        'mice': 'mouse',
        'geese': 'goose'
      };
      
      Object.entries(irregularPlurals).forEach(([plural, singular]) => {
        if (normalized === plural) {
          normalized = singular;
        }
      });
      
      return normalized;
    };
    
    originalTerms.forEach(term => {
      const normalizedText = normalizeTermText(term.text);
      
      if (!termMap.has(normalizedText)) {
        // Extract full sentence for context
        const context = term.context || '';
        const sentenceMatch = context.match(/[^.!?]*[.!?]/);
        const fullSentence = sentenceMatch ? sentenceMatch[0].trim() : context;
        const normalizedContext = fullSentence.replace(/([.,;:!?])(\S)/g, '$1 $2');
        
        termMap.set(normalizedText, {
          ...term,
          context: normalizedContext,
          frequency: 1
        });
      } else {
        // Increment frequency for duplicate terms and merge data
        const existingTerm = termMap.get(normalizedText)!;
        existingTerm.frequency += 1;
        
        // Use the longer context if available
        if (term.context && term.context.length > (existingTerm.context?.length || 0)) {
          const context = term.context || '';
          const sentenceMatch = context.match(/[^.!?]*[.!?]/);
          const fullSentence = sentenceMatch ? sentenceMatch[0].trim() : context;
          existingTerm.context = fullSentence.replace(/([.,;:!?])(\S)/g, '$1 $2');
        }
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
