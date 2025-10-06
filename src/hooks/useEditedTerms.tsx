import { useState, useEffect, useMemo } from 'react';
import { AnalyzedTerm } from './useAnalysisEngine';
import { normalizeText, areTermsSimilar, getDeduplicationThreshold } from '@/utils/languageAwareStemmer';

export const useEditedTerms = (originalTerms: AnalyzedTerm[], language: string = 'en') => {
  // Deduplicate terms using language-aware morphological analysis
  const deduplicatedTerms = useMemo(() => {
    const termsList: AnalyzedTerm[] = [];
    const threshold = getDeduplicationThreshold(language);
    
    console.log(`🌐 Deduplicating terms for language: ${language} (threshold: ${threshold})`);
    
    originalTerms.forEach(term => {
      // Extract full sentence for context
      const context = term.context || '';
      const sentenceMatch = context.match(/[^.!?]*[.!?]/);
      const fullSentence = sentenceMatch ? sentenceMatch[0].trim() : context;
      const normalizedContext = fullSentence.replace(/([.,;:!?])(\S)/g, '$1 $2');
      
      // Check for similar existing terms using language-aware comparison
      let foundSimilar = false;
      for (let i = 0; i < termsList.length; i++) {
        if (areTermsSimilar(term.text, termsList[i].text, language, threshold)) {
          // Merge with similar term
          termsList[i].frequency = (termsList[i].frequency || 1) + 1;
          
          // Use the longer context if available
          if (normalizedContext.length > (termsList[i].context?.length || 0)) {
            termsList[i].context = normalizedContext;
          }
          
          console.log(`✅ Merged "${term.text}" with "${termsList[i].text}"`);
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
    
    console.log(`📊 Deduplicated ${originalTerms.length} terms to ${termsList.length} unique terms`);
    return termsList;
  }, [originalTerms, language]);

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
