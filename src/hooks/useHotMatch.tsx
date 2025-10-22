import { useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { 
  HotMatchData, 
  HotMatchDetectionRequest, 
  HotMatchRecordRequest,
  HotMatchDetectionResponse 
} from '@/types/hotMatch';

export const useHotMatch = () => {
  const { toast } = useToast();
  const [isDetecting, setIsDetecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const detectHotMatches = useCallback(async (
    request: HotMatchDetectionRequest
  ): Promise<HotMatchData[]> => {
    setIsDetecting(true);
    
    try {
      const response = await fetch('/api/v2/hot-matches/detect', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Hot match detection failed: ${response.statusText}`);
      }

      const data: HotMatchDetectionResponse = await response.json();
      
      console.log(`🔥 Hot Match Detection: Found ${data.totalDetected} potential matches`);
      
      return data.hotMatches || [];
    } catch (error) {
      console.error('Hot match detection error:', error);
      toast({
        title: "Hot Match Detection Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
      return [];
    } finally {
      setIsDetecting(false);
    }
  }, [toast]);

  const recordSelection = useCallback(async (
    request: HotMatchRecordRequest
  ): Promise<boolean> => {
    setIsRecording(true);
    
    try {
      const response = await fetch('/api/v2/hot-matches/record-selection', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Failed to record selection: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('🔥 Hot Match Selection Recorded:', {
        baseTerm: request.baseTerm,
        selectedTerm: request.selectedTerm,
        domain: request.domain
      });

      toast({
        title: "Preference Recorded",
        description: `Your term preference for "${request.baseTerm}" has been saved to LexiQ Cloud.`,
      });

      return data.status === 'success';
    } catch (error) {
      console.error('Failed to record hot match selection:', error);
      toast({
        title: "Recording Failed",
        description: error instanceof Error ? error.message : 'Could not save your preference',
        variant: "destructive",
      });
      return false;
    } finally {
      setIsRecording(false);
    }
  }, [toast]);

  const getHotMatchPercentage = useCallback(async (
    baseTermHash: string,
    term: string
  ): Promise<number> => {
    try {
      const response = await fetch(`/api/v2/hot-matches/percentage?hash=${baseTermHash}&term=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return data.percentage || 0;
    } catch (error) {
      console.error('Failed to get hot match percentage:', error);
      return 0;
    }
  }, []);

  return {
    detectHotMatches,
    recordSelection,
    getHotMatchPercentage,
    isDetecting,
    isRecording,
  };
};
