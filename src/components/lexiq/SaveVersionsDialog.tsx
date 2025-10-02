import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, Trash2 } from 'lucide-react';

export interface SavedVersion {
  id: string;
  content: string;
  timestamp: number;
  name: string;
  wordCount: number;
  hasAnalysis: boolean;
}

interface SaveVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: SavedVersion[];
  onLoadVersion: (version: SavedVersion) => void;
  onDeleteVersion: (id: string) => void;
  currentContent: string;
  onSaveNew: () => void;
}

export function SaveVersionsDialog({
  open,
  onOpenChange,
  versions,
  onLoadVersion,
  onDeleteVersion,
  currentContent,
  onSaveNew,
}: SaveVersionsDialogProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Saved Versions
          </DialogTitle>
          <DialogDescription>
            Load a previous version or save your current work
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save Current Button */}
          <Button 
            onClick={onSaveNew}
            className="w-full"
            disabled={!currentContent.trim()}
          >
            Save Current Version
          </Button>

          {/* Versions List */}
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {versions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No saved versions yet</p>
                <p className="text-sm mt-1">Save your current work to create a version</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium truncate">{version.name}</h4>
                          {version.hasAnalysis && (
                            <Badge variant="outline" className="text-xs">
                              Analyzed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(version.timestamp)}
                          </span>
                          <span>{formatTime(version.timestamp)}</span>
                          <span>{version.wordCount} words</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {version.content.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onLoadVersion(version);
                            onOpenChange(false);
                          }}
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteVersion(version.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
