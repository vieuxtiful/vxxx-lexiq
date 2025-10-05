import { useState, useEffect, useMemo } from 'react';
import { AnalyzedTerm } from './useAnalysisEngine';

export const useEditedTerms = (originalTerms: AnalyzedTerm[]) => {
  // Deduplicate terms by text and extract full sentence context
  const deduplicatedTerms = useMemo(() => {
    const termsList: AnalyzedTerm[] = [];
    
    // Language-agnostic normalization using Unicode NFD
    const normalizeTermText = (text: string): string => {
      // Normalize Unicode to decompose accented characters (NFD)
      let normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Basic normalization: lowercase, trim, normalize punctuation spacing
      normalized = normalized.toLowerCase().trim();
      normalized = normalized.replace(/([.,;:!?])(\S)/g, '$1 $2');
      
      return normalized;
    };
    
    // Calculate similarity between two strings (0-1, where 1 is identical)
    const calculateSimilarity = (str1: string, str2: string): number => {
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      // Simple Levenshtein distance
      const editDistance = (s1: string, s2: string): number => {
        const costs: number[] = [];
        for (let i = 0; i <= s1.length; i++) {
          let lastValue = i;
          for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
              costs[j] = j;
            } else if (j > 0) {
              let newValue = costs[j - 1];
              if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
          if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
      };
      
      const distance = editDistance(longer, shorter);
      return (longer.length - distance) / longer.length;
    };
    
    originalTerms.forEach(term => {
      const normalizedText = normalizeTermText(term.text);
      
      // Extract full sentence for context
      const context = term.context || '';
      const sentenceMatch = context.match(/[^.!?]*[.!?]/);
      const fullSentence = sentenceMatch ? sentenceMatch[0].trim() : context;
      const normalizedContext = fullSentence.replace(/([.,;:!?])(\S)/g, '$1 $2');
      
      // Check for similar existing terms (>90% similarity threshold)
      let foundSimilar = false;
      for (let i = 0; i < termsList.length; i++) {
        const existingNormalized = normalizeTermText(termsList[i].text);
        const similarity = calculateSimilarity(normalizedText, existingNormalized);
        
        if (similarity > 0.9) {
          // Merge with similar term
          termsList[i].frequency = (termsList[i].frequency || 1) + 1;
          
          // Use the longer context if available
          if (normalizedContext.length > (termsList[i].context?.length || 0)) {
            termsList[i].context = normalizedContext;
          }
          
          foundSimilar = true;
          break;
        }
      }
      
      // If no similar term found, add as new
      if (!foundSimilar) {
        termsList.push({
          ...term,
          context: normalizedContext,
          frequency: 1
        });
      }
    });
    
    return termsList;
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
