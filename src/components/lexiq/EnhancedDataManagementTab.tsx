/**
 * Enhanced Data Management Tab - With async sync and recommendations
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Database, Download, Edit2, Save as SaveIcon, X, Plus, Trash2, 
  RefreshCw, Sparkles, TrendingUp, AlertCircle 
} from 'lucide-react';
import { AnalyzedTerm } from '@/hooks/useAnalysisEngine';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lexiqApi, TermData } from '@/lib/lexiqApiClient';
import { useRecommendations } from '@/hooks/useRecommendations';
import { EnhancedTermTooltip } from './EnhancedTermTooltip';

interface EnhancedDataManagementTabProps {
  terms: AnalyzedTerm[];
  glossaryContent: string;
  currentFullText?: string;
  domain?: string;
  language?: string;
  onTermsUpdate?: (terms: AnalyzedTerm[]) => void;
}

export const EnhancedDataManagementTab: React.FC<EnhancedDataManagementTabProps> = ({ 
  terms, 
  glossaryContent,
  currentFullText,
  domain = 'general',
  language = 'en',
  onTermsUpdate
}) => {
  const { toast } = useToast();
  const { fetchRecommendations, getRecommendationState } = useRecommendations();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<AnalyzedTerm>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [processedTerms, setProcessedTerms] = useState<AnalyzedTerm[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [showTooltipFor, setShowTooltipFor] = useState<string | null>(null);

  // Initialize processed terms
  useEffect(() => {
    setProcessedTerms(terms);
  }, [terms]);

  // Auto-fetch recommendations for low-confidence terms
  useEffect(() => {
    const lowConfidenceTerms = processedTerms.filter(
      term => ['critical', 'review', 'spelling'].includes(term.classification) && term.score < 70
    );

    lowConfidenceTerms.forEach(term => {
      const recState = getRecommendationState(term.text, domain, language);
      if (!recState) {
        fetchRecommendations(term.text, domain, language, term.context, term.classification);
      }
    });
  }, [processedTerms, domain, language, fetchRecommendations, getRecommendationState]);

  const getTermId = (term: AnalyzedTerm) => term.text.toLowerCase();

  const handleEditStart = (term: AnalyzedTerm) => {
    setEditingId(getTermId(term));
    setEditValues(term);
  };

  const handleEditSave = async () => {
    if (!editingId) return;

    try {
      setIsSyncing(true);
      setSyncStatus('Saving changes...');

      // Update local state
      setProcessedTerms(prev => 
        prev.map(term => getTermId(term) === editingId ? { ...term, ...editValues } : term)
      );

      // Sync to backend (if term has ID)
      const termToUpdate = processedTerms.find(t => getTermId(t) === editingId);
      if (termToUpdate) {
        // In a real scenario, you'd have term IDs from the backend
        // await lexiqApi.updateTerm(termToUpdate.id, editValues);
      }

      setEditingId(null);
      setEditValues({});
      setSyncStatus('');
      
      toast({
        title: "Changes saved",
        description: "Term has been updated successfully",
      });

      if (onTermsUpdate) {
        onTermsUpdate(processedTerms);
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleAddRow = () => {
    const newTerm: AnalyzedTerm = {
      text: 'New Term',
      startPosition: 0,
      endPosition: 0,
      classification: 'review',
      score: 0,
      frequency: 0,
      context: '',
      rationale: '',
      suggestions: [],
    };
    setProcessedTerms(prev => [...prev, newTerm]);
    toast({
      title: "Row added",
      description: "New term row has been added",
    });
  };

  const handleDeleteRows = async () => {
    if (selectedRows.size === 0) {
      toast({
        title: "No selection",
        description: "Please select rows to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSyncing(true);
      setSyncStatus('Deleting terms...');

      setProcessedTerms(prev => prev.filter(term => !selectedRows.has(getTermId(term))));
      setSelectedRows(new Set());
      setSyncStatus('');

      toast({
        title: "Rows deleted",
        description: `${selectedRows.size} row(s) have been deleted`,
      });

      if (onTermsUpdate) {
        onTermsUpdate(processedTerms.filter(term => !selectedRows.has(getTermId(term))));
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete rows",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleRowSelection = (termId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(termId)) {
        newSet.delete(termId);
      } else {
        newSet.add(termId);
      }
      return newSet;
    });
  };

  const handleExportCSV = () => {
    const headers = ['Term', 'Classification', 'Score', 'Frequency', 'Context', 'Rationale', 'Suggestions'];
    const rows = processedTerms.map(term => [
      term.text,
      term.classification,
      term.score.toString(),
      term.frequency.toString(),
      term.context,
      term.rationale,
      term.suggestions?.join('; ') || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexiq-glossary-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Export successful",
      description: "Glossary data exported as CSV",
    });
  };

  const handleAcceptRecommendation = async (termId: string, recommendedTerm: string) => {
    try {
      setIsSyncing(true);
      setSyncStatus('Accepting recommendation...');

      setProcessedTerms(prev =>
        prev.map(term =>
          getTermId(term) === termId
            ? { ...term, text: recommendedTerm, classification: 'valid' as const }
            : term
        )
      );

      setSyncStatus('');
      toast({
        title: "Recommendation accepted",
        description: `Term updated to "${recommendedTerm}"`,
      });

      if (onTermsUpdate) {
        onTermsUpdate(processedTerms);
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to accept recommendation",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'valid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'review':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'spelling':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const hasRecommendations = (term: AnalyzedTerm) => {
    const recState = getRecommendationState(term.text, domain, language);
    return recState && recState.recommendations.length > 0;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Enhanced Data Management</h2>
          <p className="text-muted-foreground">
            View, edit, and manage glossary with AI-powered recommendations
          </p>
          {syncStatus && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              {syncStatus}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddRow} variant="outline" className="gap-2" disabled={isSyncing}>
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          <Button 
            onClick={handleDeleteRows} 
            variant="outline" 
            className="gap-2"
            disabled={selectedRows.size === 0 || isSyncing}
          >
            <Trash2 className="h-4 w-4" />
            Delete ({selectedRows.size})
          </Button>
          <Button onClick={handleExportCSV} className="gap-2" disabled={isSyncing}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{processedTerms.length}</div>
            <div className="text-xs text-muted-foreground">Total Terms</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {processedTerms.filter(t => t.classification === 'valid').length}
            </div>
            <div className="text-xs text-muted-foreground">Valid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {processedTerms.filter(t => t.classification === 'review').length}
            </div>
            <div className="text-xs text-muted-foreground">Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {processedTerms.filter(t => t.classification === 'critical').length}
            </div>
            <div className="text-xs text-muted-foreground">Critical</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {processedTerms.filter(t => hasRecommendations(t)).length}
            </div>
            <div className="text-xs text-muted-foreground">With Recommendations</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Glossary Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === processedTerms.length && processedTerms.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(processedTerms.map(getTermId)));
                        } else {
                          setSelectedRows(new Set());
                        }
                      }}
                      className="cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="min-w-[200px]">Term</TableHead>
                  <TableHead className="min-w-[120px]">Classification</TableHead>
                  <TableHead className="min-w-[80px] text-right">Score</TableHead>
                  <TableHead className="min-w-[80px] text-right">Frequency</TableHead>
                  <TableHead className="min-w-[250px]">Context</TableHead>
                  <TableHead className="min-w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No data available. Complete analysis first.
                    </TableCell>
                  </TableRow>
                ) : (
                  processedTerms.map((term) => {
                    const termId = getTermId(term);
                    const isSelected = selectedRows.has(termId);
                    const recState = getRecommendationState(term.text, domain, language);
                    const showRecommendationBadge = recState && recState.recommendations.length > 0;

                    return (
                      <TableRow key={termId} className={`hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(termId)}
                            className="cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {editingId === termId ? (
                              <Input
                                value={editValues.text || ''}
                                onChange={(e) => setEditValues(prev => ({ ...prev, text: e.target.value }))}
                                className="h-8"
                              />
                            ) : (
                              <>
                                <span className="font-medium">{term.text}</span>
                                {showRecommendationBadge && (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 px-2">
                                        <Sparkles className="h-3 w-3 text-yellow-600" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <EnhancedTermTooltip
                                        term={term.text}
                                        classification={term.classification}
                                        score={term.score}
                                        rationale={term.rationale}
                                        context={term.context}
                                        domain={domain}
                                        language={language}
                                        termId={termId}
                                        onReplaceInGlossary={handleAcceptRecommendation}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {editingId === termId ? (
                            <Select
                              value={editValues.classification || term.classification}
                              onValueChange={(value) => setEditValues(prev => ({ ...prev, classification: value as any }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="valid">Valid</SelectItem>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="spelling">Spelling</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={getClassificationColor(term.classification)}>
                              {term.classification}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === termId ? (
                            <Input
                              type="number"
                              value={editValues.score || 0}
                              onChange={(e) => setEditValues(prev => ({ ...prev, score: parseFloat(e.target.value) }))}
                              className="h-8 w-20"
                              min="0"
                              max="100"
                            />
                          ) : (
                            <span className="font-mono">{term.score.toFixed(1)}%</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">{term.frequency}</TableCell>
                        <TableCell className="text-sm max-w-[250px]">
                          {editingId === termId ? (
                            <Input
                              value={editValues.context || ''}
                              onChange={(e) => setEditValues(prev => ({ ...prev, context: e.target.value }))}
                              className="h-8 w-full"
                            />
                          ) : (
                            <span className="text-muted-foreground truncate block">{term.context}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === termId ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleEditSave} 
                                className="h-8 w-8 p-0"
                                disabled={isSyncing}
                              >
                                <SaveIcon className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={handleEditCancel} 
                                className="h-8 w-8 p-0"
                                disabled={isSyncing}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleEditStart(term)} 
                              className="h-8 w-8 p-0"
                              disabled={isSyncing}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
