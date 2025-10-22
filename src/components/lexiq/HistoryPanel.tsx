import React, { useState, useEffect } from 'react';
import { Clock, Download, Trash2, AlertCircle } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { useAnalysisSession, AnalysisSession } from '@/hooks/useAnalysisSession';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface HistoryPanelProps {
  onRestoreSession: (session: AnalysisSession) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onRestoreSession }) => {
  const { currentProject } = useProject();
  const { getProjectSessions } = useAnalysisSession();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      loadSessions();
    } else {
      setSessions([]);
      setLoading(false);
    }
  }, [currentProject]);

  const loadSessions = async () => {
    if (!currentProject) return;
    
    try {
      setLoading(true);
      const data = await getProjectSessions(currentProject.id);
      setSessions(data);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Failed to load history",
        description: "Could not load analysis sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Timestamp formatting utilities
  const formatSessionTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const formatFullDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleRestore = (session: AnalysisSession) => {
    onRestoreSession(session);
    setSelectedSessionId(null); // Clear selection after restore
    toast({
      title: "Session Restored",
      description: `Loaded analysis from ${formatSessionTimestamp(session.created_at)} (${formatFullDateTime(session.created_at)})`,
    });
  };

  const handleCardClick = (sessionId: string) => {
    setSelectedSessionId(selectedSessionId === sessionId ? null : sessionId);
  };

  const confirmDelete = async () => {
    if (!deleteSessionId) return;

    try {
      // Note: We'll need to add a delete method to useAnalysisSession
      // For now, we'll just remove from local state
      setSessions(prev => prev.filter(s => s.id !== deleteSessionId));
      toast({
        title: "Session Deleted",
        description: "Analysis session removed from history",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete session",
        variant: "destructive",
      });
    } finally {
      setDeleteSessionId(null);
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return 'No content';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getFirstTermText = (analyzedTerms: any) => {
    if (!analyzedTerms || !Array.isArray(analyzedTerms) || analyzedTerms.length === 0) {
      return 'No terms analyzed';
    }
    // Get first few terms to create a preview
    const firstTerms = analyzedTerms.slice(0, 5).map((t: any) => t.text || '').join(', ');
    return truncateText(firstTerms, 100);
  };

  if (!currentProject) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Please select a project to view history</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Analysis History</h2>
        <Badge variant="secondary">
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Analysis Sessions Yet</h3>
          <p className="text-muted-foreground">
            Your analysis history will appear here after you run your first analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => (
            <Card 
              key={session.id} 
              className={`history-card-selectable ${selectedSessionId === session.id ? 'history-card-selected' : ''} hover:shadow-md transition-shadow`}
              onClick={() => handleCardClick(session.id)}
            >
              <CardContent className="p-4 relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span title={formatFullDateTime(session.created_at)}>
                      {formatSessionTimestamp(session.created_at)}
                    </span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {session.language.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {session.domain}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestore(session)}
                      title={`Restore session from ${formatFullDateTime(session.created_at)}`}
                      className="h-8 w-8 p-0"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteSessionId(session.id)}
                      title="Delete session"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm mb-3 text-muted-foreground">
                  {getFirstTermText(session.analyzed_terms)}
                </p>
                
                {session.statistics && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      <strong>{session.statistics.totalTerms || 0}</strong> terms
                    </span>
                    <span>
                      <strong>{session.statistics.review || 0}</strong> for review
                    </span>
                    <span>
                      Quality: <strong>{Math.round(session.statistics.qualityScore || 0)}%</strong>
                    </span>
                    {session.processing_time && (
                      <span>
                        <strong>{session.processing_time.toFixed(1)}s</strong>
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteSessionId} onOpenChange={() => setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analysis Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this analysis session from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
