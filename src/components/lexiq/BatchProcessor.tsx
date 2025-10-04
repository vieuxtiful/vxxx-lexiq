import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { useAnalysisEngine } from '@/hooks/useAnalysisEngine';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';

interface BatchFileResult {
  fileName: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  progress: number;
  qualityScore?: number;
  error?: string;
  sessionId?: string;
}

export const BatchProcessor: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BatchFileResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { processFile } = useFileProcessor();
  const { analyzeTranslation } = useAnalysisEngine();
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const { logAnalysis } = useAuditLog();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 10) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 10 files at once.",
        variant: "destructive"
      });
      return;
    }
    setFiles(selectedFiles);
    setResults(selectedFiles.map(f => ({
      fileName: f.name,
      status: 'pending' as const,
      progress: 0
    })));
  };

  const processBatch = async () => {
    if (!currentProject || !user) return;

    setIsProcessing(true);
    const CONCURRENT_LIMIT = 3; // Process 3 files at a time to avoid rate limits
    
    for (let i = 0; i < files.length; i += CONCURRENT_LIMIT) {
      const batch = files.slice(i, i + CONCURRENT_LIMIT);
      
      await Promise.all(
        batch.map(async (file, idx) => {
          const fileIndex = i + idx;
          
          try {
            // Update status to processing
            setResults(prev => {
              const newResults = [...prev];
              newResults[fileIndex] = { ...newResults[fileIndex], status: 'processing', progress: 30 };
              return newResults;
            });

            // Process file
            const processed = await processFile(
              file,
              'translation',
              currentProject.id,
              user.id
            );

            if (!processed) throw new Error('File processing failed');

            setResults(prev => {
              const newResults = [...prev];
              newResults[fileIndex] = { ...newResults[fileIndex], progress: 60 };
              return newResults;
            });

            // Analyze content
            const analysis = await analyzeTranslation(
              processed.content,
              '',
              currentProject.language || 'en',
              currentProject.domain || 'general',
              false
            );

            if (!analysis) throw new Error('Analysis failed');

            // Log analysis (using file ID as session identifier)
            await logAnalysis(processed.fileId || '', processed.content.length);

            setResults(prev => {
              const newResults = [...prev];
              newResults[fileIndex] = {
                ...newResults[fileIndex],
                status: 'success',
                progress: 100,
                qualityScore: analysis.statistics?.qualityScore,
                sessionId: processed.fileId
              };
              return newResults;
            });
          } catch (error: any) {
            setResults(prev => {
              const newResults = [...prev];
              newResults[fileIndex] = {
                ...newResults[fileIndex],
                status: 'error',
                progress: 0,
                error: error.message
              };
              return newResults;
            });
          }
        })
      );
    }

    setIsProcessing(false);
    toast({
      title: "Batch processing complete",
      description: `Processed ${results.filter(r => r.status === 'success').length} of ${files.length} files successfully.`
    });
  };

  const getStatusIcon = (status: BatchFileResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'processing':
        return <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Batch File Processing</h3>
              <p className="text-sm text-muted-foreground">
                Upload and analyze up to 10 files at once
              </p>
            </div>
            <input
              type="file"
              multiple
              accept=".txt,.pdf,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="batch-file-input"
              disabled={isProcessing}
            />
            <label htmlFor="batch-file-input">
              <Button asChild disabled={isProcessing}>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Select Files
                </span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {files.length} file(s) selected
              </span>
              <Button 
                onClick={processBatch}
                disabled={isProcessing || files.length === 0}
              >
                {isProcessing ? 'Processing...' : `Process ${files.length} Files`}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {results.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Processing Results</h3>
          <div className="space-y-3">
            {results.map((result, idx) => (
              <div key={idx} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getStatusIcon(result.status)}
                    <span className="font-medium truncate">{result.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.qualityScore !== undefined && (
                      <Badge variant={result.qualityScore >= 80 ? 'default' : 'secondary'}>
                        {result.qualityScore}% Quality
                      </Badge>
                    )}
                    {result.status === 'error' && (
                      <Badge variant="destructive">Failed</Badge>
                    )}
                  </div>
                </div>

                {result.status === 'processing' && (
                  <Progress value={result.progress} className="h-1" />
                )}

                {result.error && (
                  <p className="text-sm text-destructive">{result.error}</p>
                )}
              </div>
            ))}
          </div>

          {results.some(r => r.status === 'success') && (
            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export All Results
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
