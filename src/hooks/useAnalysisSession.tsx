import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AnalysisResult } from './useAnalysisEngine';
import type { Database } from '@/integrations/supabase/types';

type DbAnalysisSession = Database['public']['Tables']['analysis_sessions']['Row'];

export interface AnalysisSession {
  id: string;
  project_id: string;
  user_id: string;
  translation_file_id?: string | null;
  glossary_file_id?: string | null;
  language: string;
  domain: string;
  analyzed_terms: any;
  statistics: any;
  translation_content?: string; // Full translation text for auto-restore
  source_content?: string | null; // NEW: Source text for bilingual projects
  source_word_count?: number | null; // NEW: Source word count
  processing_time?: number | null;
  created_at: string;
}

export const useAnalysisSession = () => {
  const { toast } = useToast();

  const saveAnalysisSession = async (
    projectId: string,
    userId: string,
    language: string,
    domain: string,
    analysisResult: AnalysisResult,
    translationContent: string, // Add full translation content
    sourceContent?: string, // NEW: Source content for bilingual projects
    sourceWordCount?: number, // NEW: Source word count
    translationFileId?: string,
    glossaryFileId?: string,
    processingTime?: number
  ): Promise<AnalysisSession | null> => {
    try {
      const insertData: Database['public']['Tables']['analysis_sessions']['Insert'] = {
        project_id: projectId,
        user_id: userId,
        translation_file_id: translationFileId || null,
        glossary_file_id: glossaryFileId || null,
        language,
        domain,
        analyzed_terms: JSON.parse(JSON.stringify(analysisResult.terms)),
        statistics: JSON.parse(JSON.stringify(analysisResult.statistics)),
        translation_content: translationContent, // Store full content for auto-restore
        source_content: sourceContent || null, // NEW: Store source content
        source_word_count: sourceWordCount || null, // NEW: Store source word count
        processing_time: processingTime || null,
      };

      const { data, error } = await supabase
        .from('analysis_sessions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Analysis saved",
        description: "Your analysis session has been saved successfully.",
      });

      return data as AnalysisSession;
    } catch (error) {
      console.error('Error saving analysis session:', error);
      toast({
        title: "Failed to save analysis",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return null;
    }
  };

  const loadAnalysisSession = async (sessionId: string): Promise<AnalysisSession | null> => {
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      return data as AnalysisSession;
    } catch (error) {
      console.error('Error loading analysis session:', error);
      toast({
        title: "Failed to load analysis",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      return null;
    }
  };

  const getProjectSessions = async (projectId: string): Promise<AnalysisSession[]> => {
    try {
      const { data, error } = await supabase
        .from('analysis_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AnalysisSession[];
    } catch (error) {
      console.error('Error loading project sessions:', error);
      return [];
    }
  };

  return {
    saveAnalysisSession,
    loadAnalysisSession,
    getProjectSessions,
  };
};
