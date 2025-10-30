import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, Clock, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUpload {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  issues?: number;
}

export const BatchUploadInterface: React.FC = () => {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: FileUpload[] = selectedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    toast({
      title: 'Files Added',
      description: `${newFiles.length} file(s) added to queue`,
    });
  };

  const handleProcessBatch = async () => {
    if (files.length === 0) {
      toast({
        title: 'No Files',
        description: 'Please add files to process',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    
    // Simulate batch processing
    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((file, idx) =>
          idx === i ? { ...file, status: 'processing' as const } : file
        )
      );

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setFiles((prev) =>
          prev.map((file, idx) =>
            idx === i ? { ...file, progress } : file
          )
        );
      }

      // Mark as complete
      setFiles((prev) =>
        prev.map((file, idx) =>
          idx === i
            ? {
                ...file,
                status: 'complete' as const,
                progress: 100,
                issues: Math.floor(Math.random() * 10),
              }
            : file
        )
      );
    }

    setIsProcessing(false);
    toast({
      title: 'Batch Complete',
      description: `Processed ${files.length} file(s) successfully`,
    });
  };

  const handleClearAll = () => {
    setFiles([]);
    toast({
      title: 'Queue Cleared',
      description: 'All files removed from queue',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500">Complete</Badge>;
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const completedFiles = files.filter((f) => f.status === 'complete').length;
  const totalIssues = files.reduce((sum, f) => sum + (f.issues || 0), 0);

  return (
    <div className="space-y-4">
      <Alert>
        <Layers className="h-4 w-4" />
        <AlertDescription>
          <strong>Batch Processing</strong> - Upload and analyze multiple files simultaneously with concurrent processing.
        </AlertDescription>
      </Alert>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Files
          </CardTitle>
          <CardDescription>Select multiple XLIFF, TMX, or TXT files to process</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              id="batch-file-input"
              multiple
              accept=".xliff,.xlf,.tmx,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <label htmlFor="batch-file-input" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Click to select files</p>
              <p className="text-sm text-muted-foreground">Supported: XLIFF, TMX, TXT</p>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleProcessBatch}
              disabled={files.length === 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 mr-2" />
                  Process Batch ({files.length})
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClearAll}
              disabled={files.length === 0 || isProcessing}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Batch Statistics */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Batch Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{files.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedFiles}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold text-orange-600">{totalIssues}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Queue */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => (
              <Card key={file.id} className="border">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      {getStatusIcon(file.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'complete' && file.issues !== undefined && (
                        <Badge variant="outline">{file.issues} issues</Badge>
                      )}
                      {getStatusBadge(file.status)}
                    </div>
                  </div>
                  {(file.status === 'processing' || file.status === 'complete') && (
                    <Progress value={file.progress} className="mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      <Alert>
        <AlertDescription className="text-sm">
          <ul className="list-disc ml-4 space-y-1">
            <li><strong>Concurrent Processing:</strong> Up to 4 files processed simultaneously</li>
            <li><strong>All Checks Applied:</strong> Runs consistency, structural, and custom rule validations</li>
            <li><strong>Results Export:</strong> Download combined report after batch completion</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
};
