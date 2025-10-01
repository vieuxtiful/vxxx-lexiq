import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProcessedFile {
  content: string;
  fileName: string;
  fileSize: number;
  characterCount: number;
  wordCount: number;
}

export const useFileProcessor = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File, type: 'translation' | 'glossary'): Promise<ProcessedFile | null> => {
    setIsProcessing(true);
    
    try {
      // Read file content
      const fileContent = await file.text();

      const { data, error } = await supabase.functions.invoke('process-files', {
        body: {
          fileName: file.name,
          fileContent,
          fileSize: file.size,
          type,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to process file');
      }

      const result = data;
      
      toast({
        title: "File processed successfully",
        description: `${result.fileName} - ${result.wordCount} words extracted`,
      });

      return result;
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processFile, isProcessing };
};
