import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProcessedFile {
  content: string;
  fileName: string;
  fileSize: number;
  characterCount: number;
  wordCount: number;
  fileId?: string;
  storagePath?: string;
}

export const useFileProcessor = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (
    file: File, 
    type: 'translation' | 'glossary',
    projectId?: string,
    userId?: string
  ): Promise<ProcessedFile | null> => {
    setIsProcessing(true);
    
    try {
      // Read file content
      const fileContent = await file.text();
      
      let storagePath: string | null = null;
      let fileId: string | null = null;

      // Upload to storage if user is authenticated and has project
      if (userId && projectId) {
        const bucketName = type === 'translation' ? 'translation-files' : 'glossary-files';
        const filePath = `${userId}/${projectId}/${Date.now()}_${file.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
        } else {
          storagePath = uploadData.path;
          
          // Create file upload record
          const { data: fileRecord, error: fileRecordError } = await supabase
            .from('file_uploads')
            .insert({
              project_id: projectId,
              user_id: userId,
              file_type: type,
              file_name: file.name,
              storage_path: filePath,
              file_size: file.size,
            })
            .select()
            .single();

          if (fileRecordError) {
            console.error('File record error:', fileRecordError);
          } else {
            fileId = fileRecord.id;
          }
        }
      }

      // Process file content
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

      const result = {
        ...data,
        fileId,
        storagePath,
      };
      
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
