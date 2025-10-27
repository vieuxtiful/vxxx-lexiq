/**
 * useRecommendations Hook - Manages term recommendations and validation
 */
import { useState, useCallback } from 'react';
import { lexiqApi, ValidationResult, Recommendation } from '@/lib/lexiqApiClient';
import { useToast } from '@/hooks/use-toast';

export interface RecommendationState {
  term: string;
  recommendations: Recommendation[];
  validation: Partial<ValidationResult> | null;
  isLoading: boolean;
  error: string | null;
}

export const useRecommendations = () => {
  const { toast } = useToast();
  const [recommendationStates, setRecommendationStates] = useState<
    Record<string, RecommendationState>
  >({});

  const fetchRecommendations = useCallback(
    async (
      term: string,
      domain: string,
      language: string,
      context: string,
      classification: string
    ) => {
      const key = `${term}_${domain}_${language}`;

      setRecommendationStates((prev) => ({
        ...prev,
        [key]: {
          term,
          recommendations: [],
          validation: null,
          isLoading: true,
          error: null,
        },
      }));

      try {
        const result = await lexiqApi.getRecommendations(
          term,
          domain,
          language,
          context,
          classification
        );

        setRecommendationStates((prev) => ({
          ...prev,
          [key]: {
            term,
            recommendations: result.recommendations,
            validation: result.validation,
            isLoading: false,
            error: null,
          },
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recommendations';
        
        setRecommendationStates((prev) => ({
          ...prev,
          [key]: {
            term,
            recommendations: [],
            validation: null,
            isLoading: false,
            error: errorMessage,
          },
        }));

        toast({
          title: 'Recommendation Error',
          description: errorMessage,
          variant: 'destructive',
        });

        return null;
      }
    },
    [toast]
  );

  const validateTerm = useCallback(
    async (term: string, domain: string, language: string, context: string = '') => {
      try {
        const result = await lexiqApi.validateTerm(term, domain, language, context);
        return result;
      } catch (error) {
        toast({
          title: 'Validation Error',
          description: error instanceof Error ? error.message : 'Failed to validate term',
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast]
  );

  const acceptRecommendation = useCallback(
    async (
      termId: string,
      recommendedTerm: string,
      onSuccess?: (updatedTerm: any) => void
    ) => {
      try {
        const updatedTerm = await lexiqApi.updateTerm(termId, {
          term: recommendedTerm,
          classification: 'valid',
        });

        toast({
          title: 'Recommendation Accepted',
          description: `Term updated to "${recommendedTerm}"`,
        });

        if (onSuccess) {
          onSuccess(updatedTerm);
        }

        return updatedTerm;
      } catch (error) {
        toast({
          title: 'Update Failed',
          description: error instanceof Error ? error.message : 'Failed to accept recommendation',
          variant: 'destructive',
        });
        return null;
      }
    },
    [toast]
  );

  const getRecommendationState = useCallback(
    (term: string, domain: string, language: string): RecommendationState | null => {
      const key = `${term}_${domain}_${language}`;
      return recommendationStates[key] || null;
    },
    [recommendationStates]
  );

  const clearRecommendations = useCallback((term?: string, domain?: string, language?: string) => {
    if (term && domain && language) {
      const key = `${term}_${domain}_${language}`;
      setRecommendationStates((prev) => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    } else {
      setRecommendationStates({});
    }
  }, []);

  return {
    fetchRecommendations,
    validateTerm,
    acceptRecommendation,
    getRecommendationState,
    clearRecommendations,
    recommendationStates,
  };
};
