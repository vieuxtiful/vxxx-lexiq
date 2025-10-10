import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileText, AlertCircle, CheckCircle2, Loader2, RefreshCw, Undo2, Redo2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedEllipsis } from '@/components/ui/animated-ellipsis';

interface SourceEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  language: string;
  grammarEnabled: boolean;
  spellingEnabled: boolean;
  onGrammarToggle: () => void;
  onSpellingToggle: () => void;
  onReanalyze?: () => void;
  isReanalyzing?: boolean;
  readOnly?: boolean;
}

interface SourceAnalysis {
  grammarIssues: number;
  spellingIssues: number;
}

export const SourceEditor: React.FC<SourceEditorProps> = ({
  content,
  onContentChange,
  language,
  grammarEnabled,
  spellingEnabled,
  onGrammarToggle,
  onSpellingToggle,
  onReanalyze,
  isReanalyzing = false,
  readOnly = false,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SourceAnalysis>({ grammarIssues: 0, spellingIssues: 0 });
  
  // Undo/Redo functionality
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoAction = useRef(false);
  
  const characterCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Track content changes for undo/redo
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    
    if (content !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(content);
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      } else {
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }
  }, [content]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onContentChange(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onContentChange(history[newIndex]);
    }
  };

  // Analyze source text for grammar/spelling only
  useEffect(() => {
    const analyzeSource = async () => {
      if (!content.trim() || (!grammarEnabled && !spellingEnabled)) {
        setAnalysis({ grammarIssues: 0, spellingIssues: 0 });
        return;
      }

      setIsAnalyzing(true);
      try {
        const { data, error } = await supabase.functions.invoke('analyze-translation', {
          body: {
            translationContent: content, // Fixed: was translationText
            glossaryContent: '', // Fixed: was glossary
            language,
            domain: 'general',
            sourceTextOnly: true,
            checkGrammar: grammarEnabled,
            checkSpelling: spellingEnabled,
          },
        });

        if (error) throw error;

        if (data?.analysis?.terms) {
          const grammarCount = data.analysis.terms.filter((t: any) => t.classification === 'grammar').length;
          const spellingCount = data.analysis.terms.filter((t: any) => t.classification === 'spelling').length;
          setAnalysis({ grammarIssues: grammarCount, spellingIssues: spellingCount });
        }
      } catch (error) {
        console.error('Source analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounceTimer = setTimeout(analyzeSource, 1500);
    return () => clearTimeout(debounceTimer);
  }, [content, language, grammarEnabled, spellingEnabled]);

  const totalIssues = analysis.grammarIssues + analysis.spellingIssues;

  return (
    <Card className="h-full flex flex-col border-primary/20">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Source Editor
              <Badge variant="outline" className="ml-2 text-xs">
                {language.toUpperCase()}
              </Badge>
            </CardTitle>
            
            {/* Undo/Redo buttons */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex === 0 || readOnly}
                className="h-7 w-7 p-0"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1 || readOnly}
                className="h-7 w-7 p-0"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          {/* Issue indicators */}
          <div className="flex items-center gap-3">
            {isAnalyzing ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing...
              </div>
            ) : totalIssues > 0 ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                  <AlertCircle className="h-3 w-3" />
                  {totalIssues} issues
                </Badge>
              </div>
            ) : content.trim() ? (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                No issues
              </div>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex flex-col min-h-0">
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Source text will appear here when you upload a bilingual file..."
          className="flex-1 resize-none font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
          readOnly={readOnly}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
              e.preventDefault();
              handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
              e.preventDefault();
              handleRedo();
            }
          }}
        />

        {/* Bottom Bar: Toggles + Reanalyze + Character/Word Count */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="source-grammar-bottom"
                checked={grammarEnabled}
                onCheckedChange={onGrammarToggle}
              />
              <Label htmlFor="source-grammar-bottom" className="text-xs cursor-pointer">
                Grammar
                {grammarEnabled && analysis.grammarIssues > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs bg-purple-500/10 text-purple-700 border-purple-500/20">
                    {analysis.grammarIssues}
                  </Badge>
                )}
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="source-spelling-bottom"
                checked={spellingEnabled}
                onCheckedChange={onSpellingToggle}
              />
              <Label htmlFor="source-spelling-bottom" className="text-xs cursor-pointer">
                Spelling
                {spellingEnabled && analysis.spellingIssues > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs bg-red-500/10 text-red-700 border-red-500/20">
                    {analysis.spellingIssues}
                  </Badge>
                )}
              </Label>
            </div>

            {onReanalyze && content.trim() && (
              <Button
                variant={isReanalyzing ? "outline" : "ghost"}
                size="sm"
                onClick={onReanalyze}
                disabled={isReanalyzing || isAnalyzing}
                className={`h-7 text-xs transition-all duration-200 ${
                  isReanalyzing ? 'bg-transparent border-primary/50' : ''
                }`}
              >
                {isReanalyzing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    <AnimatedEllipsis text="Analyzing" />
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Reanalyze
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="flex gap-4 text-xs text-blue-600 dark:text-blue-400">
            <span>{wordCount.toLocaleString()} words</span>
            <span>•</span>
            <span>{characterCount.toLocaleString()} characters</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
