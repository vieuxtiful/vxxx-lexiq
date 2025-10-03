import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Database, Download, Edit2, Save as SaveIcon, X, Plus, Trash2 } from 'lucide-react';
import { AnalyzedTerm } from '@/hooks/useAnalysisEngine';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEditedTerms } from '@/hooks/useEditedTerms';

interface DataManagementTabProps {
  terms: AnalyzedTerm[];
  glossaryContent: string;
}

export const DataManagementTab: React.FC<DataManagementTabProps> = ({ terms, glossaryContent }) => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const { editedTerms, setEditedTerms } = useEditedTerms(terms);
  const [editValues, setEditValues] = useState<Partial<AnalyzedTerm>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const getTermId = (term: AnalyzedTerm) => term.text.toLowerCase();

  const handleEditStart = (term: AnalyzedTerm) => {
    setEditingId(getTermId(term));
    setEditValues(term);
  };

  const handleEditSave = () => {
    if (editingId) {
      setEditedTerms(prev => 
        prev.map(term => getTermId(term) === editingId ? { ...term, ...editValues } : term)
      );
      setEditingId(null);
      setEditValues({});
      toast({
        title: "Changes saved",
        description: "Term has been updated successfully",
      });
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
    setEditedTerms(prev => [...prev, newTerm]);
    toast({
      title: "Row added",
      description: "New term row has been added",
    });
  };

  const handleDeleteRows = () => {
    if (selectedRows.size === 0) {
      toast({
        title: "No selection",
        description: "Please select rows to delete",
        variant: "destructive",
      });
      return;
    }

    setEditedTerms(prev => prev.filter(term => !selectedRows.has(getTermId(term))));
    setSelectedRows(new Set());
    toast({
      title: "Rows deleted",
      description: `${selectedRows.size} row(s) have been deleted`,
    });
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
    const headers = ['Term', 'Classification', 'Score', 'Frequency', 'Context', 'Suggestions'];
    const rows = editedTerms.map(term => [
      term.text,
      term.classification,
      term.score.toString(),
      term.frequency.toString(),
      term.context,
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
    a.download = 'glossary-data.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Export successful",
      description: "Glossary data exported as CSV",
    });
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Data Management</h2>
          <p className="text-muted-foreground">View, edit, and export glossary terminology data</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddRow} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          <Button 
            onClick={handleDeleteRows} 
            variant="outline" 
            className="gap-2"
            disabled={selectedRows.size === 0}
          >
            <Trash2 className="h-4 w-4" />
            Delete ({selectedRows.size})
          </Button>
          <Button onClick={handleExportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{editedTerms.length}</div>
            <div className="text-xs text-muted-foreground">Total Terms</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {editedTerms.filter(t => t.classification === 'valid').length}
            </div>
            <div className="text-xs text-muted-foreground">Valid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {editedTerms.filter(t => t.classification === 'review').length}
            </div>
            <div className="text-xs text-muted-foreground">Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {editedTerms.filter(t => t.classification === 'critical').length}
            </div>
            <div className="text-xs text-muted-foreground">Critical</div>
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
                      checked={selectedRows.size === editedTerms.length && editedTerms.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(editedTerms.map(getTermId)));
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
                  <TableHead className="min-w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No data available. Complete analysis first.
                    </TableCell>
                  </TableRow>
                ) : (
                  editedTerms.map((term) => {
                    const termId = getTermId(term);
                    const isSelected = selectedRows.has(termId);
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
                          {editingId === termId ? (
                            <Input
                              value={editValues.text || ''}
                              onChange={(e) => setEditValues(prev => ({ ...prev, text: e.target.value }))}
                              className="h-8"
                            />
                          ) : (
                            <span className="font-medium">{term.text}</span>
                          )}
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
                              <Button size="sm" variant="ghost" onClick={handleEditSave} className="h-8 w-8 p-0">
                                <SaveIcon className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={handleEditCancel} className="h-8 w-8 p-0">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleEditStart(term)} className="h-8 w-8 p-0">
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
