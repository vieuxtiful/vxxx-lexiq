import { useToast } from '@/hooks/use-toast';
import { AnalyzedTerm, AnalysisStatistics } from './useAnalysisEngine';
import { supabase } from '@/integrations/supabase/client';

export type ReportFormat = 'json' | 'csv' | 'html';

export const useReportGenerator = () => {
  const { toast } = useToast();

  const generateReport = async (
    terms: AnalyzedTerm[],
    statistics: AnalysisStatistics,
    format: ReportFormat,
    language: string,
    domain: string
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          terms,
          statistics,
          format,
          language,
          domain,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate report');
      }

      // Download the file
      const blob = new Blob([JSON.stringify(data)], { 
        type: format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'text/html' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lexiq-report.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report generated",
        description: `Report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  return { generateReport };
};
