import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, AlertCircle, CheckCircle2, Loader2, RefreshCw, Undo2, Redo2, Lock, Unlock } from 'lucide-react';
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
  isLocked?: boolean;
  onLockToggle?: () => void;
  // Optional live status + cross-pane alignment indicators
  isAnalyzingLive?: boolean;
  misalignmentActive?: boolean;
  unmatchedSegments?: string[]; // Content segments not matched in counterpart panel
  unmatchedCount?: number;
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
  isLocked = false,
  onLockToggle,
  isAnalyzingLive,
  misalignmentActive,
  unmatchedSegments = [],
  unmatchedCount,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SourceAnalysis>({ grammarIssues: 0, spellingIssues: 0 });
  const [analysisTerms, setAnalysisTerms] = useState<any[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const cursorPositionRef = useRef<number>(0);
  
  // Tooltip state
  const [hoveredTerm, setHoveredTerm] = useState<any | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const tooltipHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const termPositionsRef = useRef<Array<{ start: number; end: number; term: any }>>([]);
  
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
    const analyzeSource = async (retryCount = 0, maxRetries = 2) => {
      if (!content.trim() || (!grammarEnabled && !spellingEnabled)) {
        setAnalysis({ grammarIssues: 0, spellingIssues: 0 });
        setAnalysisTerms([]);
        return;
      }

      setIsAnalyzing(true);
      try {
        console.log('🔍 SourceEditor: Starting source analysis', {
          contentLength: content.length,
          language,
          grammarEnabled,
          spellingEnabled,
          attempt: retryCount + 1
        });

        const { data, error } = await supabase.functions.invoke('analyze-translation', {
          body: {
            translationContent: content,
            glossaryContent: '',
            language,
            domain: 'general',
            sourceTextOnly: true,
            checkGrammar: grammarEnabled,
            checkSpelling: spellingEnabled,
          },
        });

        if (error) {
          console.error('❌ SourceEditor: Analysis function error:', error);
          throw error;
        }

        console.log('✅ SourceEditor: Analysis response received', {
          hasData: !!data,
          hasAnalysis: !!data?.analysis,
          termCount: data?.analysis?.terms?.length || 0
        });

        if (data?.analysis?.terms) {
          const terms = data.analysis.terms as any[];
          const grammarCount = terms.filter((t: any) => t.classification === 'grammar').length;
          const spellingCount = terms.filter((t: any) => t.classification === 'spelling').length;
          console.log('📊 SourceEditor: Analysis complete', { grammarCount, spellingCount });
          setAnalysis({ grammarIssues: grammarCount, spellingIssues: spellingCount });
          setAnalysisTerms(terms);
        } else {
          console.warn('⚠️ SourceEditor: No terms in analysis response');
          setAnalysisTerms([]);
        }
      } catch (error) {
        // Retry with exponential backoff for transient failures
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          console.warn(`⚠️ SourceEditor: Analysis failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`, {
            error: error?.message,
            contentLength: content.length
          });
          setIsAnalyzing(false);
          await new Promise(resolve => setTimeout(resolve, delay));
          return analyzeSource(retryCount + 1, maxRetries);
        }
        
        console.error('❌ SourceEditor: Analysis failed after retries:', {
          error,
          errorName: error?.name,
          errorMessage: error?.message,
          contentLength: content.length,
          attempts: retryCount + 1
        });
        // Silently fail - don't disrupt user experience
        setAnalysis({ grammarIssues: 0, spellingIssues: 0 });
        setAnalysisTerms([]);
      } finally {
        setIsAnalyzing(false);
      }
    };

    const debounceTimer = setTimeout(() => analyzeSource(), 1500);
    return () => clearTimeout(debounceTimer);
  }, [content, language, grammarEnabled, spellingEnabled]);

  const totalIssues = analysis.grammarIssues + analysis.spellingIssues;

  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    const editor = editorRef.current;
    if (!editor) return;
    preCaretRange.selectNodeContents(editor);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    cursorPositionRef.current = preCaretRange.toString().length;
  };

  const restoreCursorPosition = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const targetPosition = cursorPositionRef.current;
    const selection = window.getSelection();
    if (!selection) return;
    let currentPosition = 0;
    const nodeIterator = document.createNodeIterator(editor, NodeFilter.SHOW_TEXT, null);
    let currentNode: Node | null;
    while (currentNode = nodeIterator.nextNode()) {
      const textLength = currentNode.textContent?.length || 0;
      if (currentPosition + textLength >= targetPosition) {
        const range = document.createRange();
        const offset = Math.min(targetPosition - currentPosition, textLength);
        range.setStart(currentNode, offset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        break;
      }
      currentPosition += textLength;
    }
  };

  const hexToRgba = (hex: string, opacity: number) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'spelling':
        return '#f97316';
      case 'grammar':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  };

  const renderContentWithUnderlines = () => {
    if (!content) return '';

    console.log('🎨 SourceEditor rendering:', {
      contentLength: content.length,
      unmatchedSegmentsCount: unmatchedSegments.length,
      unmatchedSegments: unmatchedSegments.map(s => s.substring(0, 50) + '...'),
      analysisTermsCount: analysisTerms.length,
      analysisTerms: analysisTerms.map(t => ({ text: t.text, classification: t.classification }))
    });

    // Build a map of character positions to their styling
    type CharStyle = { isUnmatched: boolean; term?: any };
    const charStyles: CharStyle[] = Array(content.length).fill(null).map(() => ({ isUnmatched: false }));

    // Mark unmatched segments
    if (unmatchedSegments && unmatchedSegments.length > 0) {
      unmatchedSegments.forEach(seg => {
        const needle = (seg || '').trim();
        if (!needle) return;
        let idx = 0;
        while (idx < content.length) {
          const found = content.indexOf(needle, idx);
          if (found === -1) break;
          for (let i = found; i < found + needle.length; i++) {
            charStyles[i].isUnmatched = true;
          }
          idx = found + 1;
        }
      });
    }

    // Collect term positions
    type TermPos = { start: number; end: number; term: any };
    const termPositions: TermPos[] = [];
    const filteredTerms = (analysisTerms || []).filter((t: any) => {
      if (t?.classification === 'grammar') return grammarEnabled;
      if (t?.classification === 'spelling') return spellingEnabled;
      return true;
    });

    if (filteredTerms.length > 0) {
      filteredTerms.forEach((term: any) => {
        if (!term?.text) return;
        let idx = 0;
        while (idx < content.length) {
          const found = content.indexOf(term.text, idx);
          if (found === -1) break;
          const start = found;
          const end = found + term.text.length;
          termPositions.push({ start, end, term });
          idx = found + 1;
        }
      });
    }

    // Sort term positions
    termPositions.sort((a, b) => a.start - b.start);
    
    // Store for tooltip event handlers
    termPositionsRef.current = termPositions;

    let html = '';
    let pos = 0;

    // Helper function to render a segment with proper unmatched highlighting
    const renderSegment = (start: number, end: number) => {
      let segHtml = '';
      let segPos = start;
      
      while (segPos < end) {
        const isUnmatched = charStyles[segPos]?.isUnmatched;
        // Find the end of this run (either matched or unmatched)
        let runEnd = segPos + 1;
        while (runEnd < end && charStyles[runEnd]?.isUnmatched === isUnmatched) {
          runEnd++;
        }
        
        const runText = content.slice(segPos, runEnd);
        if (isUnmatched) {
          const style = `background-color: ${hexToRgba('#f59e0b', 0.3)}; border-bottom: 2px dashed #f59e0b; padding: 0 2px; border-radius: 2px; display: inline;`;
          segHtml += `<span style="${style}">${escapeHtml(runText)}</span>`;
        } else {
          segHtml += escapeHtml(runText);
        }
        segPos = runEnd;
      }
      return segHtml;
    };

    termPositions.forEach(termPos => {
      // Render content before this term
      if (pos < termPos.start) {
        html += renderSegment(pos, termPos.start);
        pos = termPos.start;
      }

      // Render the term with appropriate styling
      const term = termPos.term;
      const termText = content.slice(termPos.start, termPos.end);
      const color = getClassificationColor(term.classification || '');
      const isTermInUnmatched = charStyles[termPos.start].isUnmatched;
      
      let underlineStyle = '';
      if (term.classification === 'grammar') {
        const bgGradient = `linear-gradient(90deg, ${hexToRgba(color, 0.12)}, ${hexToRgba(color, 0.12)})`;
        if (isTermInUnmatched) {
          const amberOverlay = `linear-gradient(0deg, ${hexToRgba('#f59e0b', 0.3)}, ${hexToRgba('#f59e0b', 0.3)}), `;
          underlineStyle = `color: ${color}; border-bottom: 2px wavy ${color}; background: ${amberOverlay}${bgGradient}; padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
        } else {
          underlineStyle = `color: ${color}; border-bottom: 2px wavy ${color}; background: ${bgGradient}; padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
        }
      } else if (term.classification === 'spelling') {
        const baseBg = hexToRgba(color, 0.08);
        if (isTermInUnmatched) {
          const amberOverlay = `linear-gradient(0deg, ${hexToRgba('#f59e0b', 0.3)}, ${hexToRgba('#f59e0b', 0.3)}), `;
          underlineStyle = `color: ${color}; border-bottom: 2px dotted ${color}; background: ${amberOverlay}${baseBg}; padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
        } else {
          underlineStyle = `color: ${color}; border-bottom: 2px dotted ${color}; background-color: ${baseBg}; padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
        }
      } else {
        if (isTermInUnmatched) {
          underlineStyle = `border-bottom: 2px solid ${color}; background-color: ${hexToRgba('#f59e0b', 0.3)}; padding: 0 2px; border-radius: 2px; display: inline;`;
        } else {
          underlineStyle = `border-bottom: 2px solid ${color}; padding: 0 2px; border-radius: 2px; display: inline;`;
        }
      }
      // Add data attribute for hover detection (bilingual projects only)
      const termIdx = termPositions.indexOf(termPos);
      const dataAttr = unmatchedSegments ? `data-term-idx="${termIdx}"` : '';
      html += `<span style="${underlineStyle}" ${dataAttr} class="source-term-span">${escapeHtml(termText)}</span>`;
      pos = termPos.end;
    });

    // Render remaining content
    if (pos < content.length) {
      html += renderSegment(pos, content.length);
    }

    return html;
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (isEditing) return;
    el.innerHTML = renderContentWithUnderlines();
  }, [content, analysisTerms, unmatchedSegments, isEditing, grammarEnabled, spellingEnabled]);

  // Attach hover event listeners to term spans (bilingual projects only)
  useEffect(() => {
    if (!unmatchedSegments || isEditing || !editorRef.current) return;
    
    const termSpans = editorRef.current.querySelectorAll('.source-term-span[data-term-idx]');
    
    const handleMouseEnter = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      const termIdx = parseInt(target.getAttribute('data-term-idx') || '-1');
      if (termIdx < 0 || termIdx >= termPositionsRef.current.length) return;
      
      const termPos = termPositionsRef.current[termIdx];
      setHoveredTerm(termPos.term);
      
      const rect = target.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    };
    
    const handleMouseLeave = () => {
      tooltipHoverTimeoutRef.current = setTimeout(() => {
        if (!isTooltipHovered) {
          setHoveredTerm(null);
          setTooltipPosition(null);
        }
      }, 100);
    };
    
    termSpans.forEach(span => {
      span.addEventListener('mouseenter', handleMouseEnter);
      span.addEventListener('mouseleave', handleMouseLeave);
    });
    
    return () => {
      termSpans.forEach(span => {
        span.removeEventListener('mouseenter', handleMouseEnter);
        span.removeEventListener('mouseleave', handleMouseLeave);
      });
      if (tooltipHoverTimeoutRef.current) {
        clearTimeout(tooltipHoverTimeoutRef.current);
      }
    };
  }, [analysisTerms, unmatchedSegments, isEditing, isTooltipHovered, grammarEnabled, spellingEnabled]);

  return (
    <TooltipProvider>
      <Card className={`h-full flex flex-col border-primary/20 ${isLocked ? 'opacity-80 bg-muted/30' : ''}`}>
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Source Editor
                <Badge variant="outline" className="ml-2 text-xs">
                  {language.toUpperCase()}
                </Badge>
                
                {/* Misalignment Indicator - Shows unmatched segment count */}
                {(unmatchedCount ?? unmatchedSegments.length) > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-700 border-amber-400/50 shadow-sm cursor-help">
                        <AlertCircle className="h-3.5 w-3.5 fill-amber-500/20" />
                        <span className="font-medium">{(unmatchedCount ?? unmatchedSegments.length)}</span> unmatched {(unmatchedCount ?? unmatchedSegments.length) === 1 ? 'segment' : 'segments'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-md">
                      <div className="space-y-1">
                        <p className="font-semibold text-xs">Unmatched segments:</p>
                        {unmatchedSegments.slice(0, 3).map((seg, i) => (
                          <p key={i} className="text-xs text-muted-foreground truncate">• {seg.trim()}</p>
                        ))}
                        {unmatchedSegments.length > 3 && (
                          <p className="text-xs text-muted-foreground italic">...and {unmatchedSegments.length - 3} more</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {/* Lock Status Badge */}
                {isLocked && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </CardTitle>
              
              {/* Undo/Redo buttons */}
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex === 0 || readOnly || isLocked}
                  className="h-7 w-7 p-0"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex === history.length - 1 || readOnly || isLocked}
                  className="h-7 w-7 p-0"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          
          {/* Lock Toggle & Issue indicators */}
          <div className="flex items-center gap-3">
            {/* Lock Toggle Button */}
            {onLockToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLockToggle}
                    className="h-8 w-8 p-0"
                  >
                    {isLocked ? (
                      <Unlock className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isLocked ? 'Unlock source editor' : 'Lock source editor'}
                </TooltipContent>
              </Tooltip>
            )}

            <div className="flex items-center gap-2 text-xs">
              {isAnalyzing || isReanalyzing ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">Analyzing...</span>
                </span>
              ) : (
                <>
                  {spellingEnabled && analysis.spellingIssues > 0 && (
                    <Badge variant="outline" className="gap-1.5 bg-orange-50 text-orange-700 border-orange-300/50 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                      <span className="font-medium">{analysis.spellingIssues}</span> spelling
                    </Badge>
                  )}
                  {grammarEnabled && analysis.grammarIssues > 0 && (
                    <Badge variant="outline" className="gap-1.5 bg-purple-50 text-purple-700 border-purple-300/50 shadow-sm">
                      <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                      <span className="font-medium">{analysis.grammarIssues}</span> grammar
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 flex flex-col min-h-0 relative">
        <div
          ref={editorRef}
          className={`flex-1 rounded-md border bg-background/50 font-mono text-sm leading-relaxed p-3 whitespace-pre-wrap break-words ${isLocked ? 'cursor-not-allowed bg-muted/50' : ''}`}
          contentEditable={!isLocked && !readOnly && isEditing}
          spellCheck={false}
          suppressContentEditableWarning
          onInput={(e) => {
            if (!isEditing) return;
            saveCursorPosition();
            const newContent = e.currentTarget.textContent || '';
            onContentChange(newContent);
          }}
          onBlur={() => {
            setIsEditing(false);
            requestAnimationFrame(() => {
              const el = editorRef.current;
              if (el && document.contains(el)) {
                el.innerHTML = renderContentWithUnderlines();
                restoreCursorPosition();
              }
            });
          }}
          onClick={() => {
            if (!isLocked && !readOnly) {
              setIsEditing(true);
              const el = editorRef.current;
              if (el) {
                el.textContent = content;
              }
            }
          }}
          onKeyDown={(e) => {
            if (isLocked) return;
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
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="source-grammar-bottom"
                checked={grammarEnabled}
                onCheckedChange={onGrammarToggle}
              />
              <Label htmlFor="source-grammar-bottom" className="text-xs cursor-pointer whitespace-nowrap">
                Grammar
                {grammarEnabled && analysis.grammarIssues > 0 && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] bg-purple-500/10 text-purple-700 border-purple-500/20">
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
              <Label htmlFor="source-spelling-bottom" className="text-xs cursor-pointer whitespace-nowrap">
                Spelling
                {spellingEnabled && analysis.spellingIssues > 0 && (
                  <Badge variant="outline" className="ml-1.5 text-[10px] bg-red-500/10 text-red-700 border-red-500/20">
                    {analysis.spellingIssues}
                  </Badge>
                )}
              </Label>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
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
            
            <div className="flex gap-2 text-[10px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
              <span>{wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{characterCount.toLocaleString()} chars</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Hover Tooltip for Grammar/Spelling Errors (Bilingual Projects Only) */}
      {unmatchedSegments && hoveredTerm && tooltipPosition && (
        <div 
          className="fixed z-50 pointer-events-auto" 
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y - 10}px`,
            transform: 'translate(-50%, -100%)'
          }}
          onMouseEnter={() => {
            setIsTooltipHovered(true);
            if (tooltipHoverTimeoutRef.current) {
              clearTimeout(tooltipHoverTimeoutRef.current);
            }
          }}
          onMouseLeave={() => {
            setIsTooltipHovered(false);
            setHoveredTerm(null);
            setTooltipPosition(null);
          }}
        >
          <div className="tooltip-gradient-border">
            <div className="bg-popover rounded-lg shadow-xl p-4 max-w-md">
              <div className="space-y-3">
                {/* Header with Type Badge */}
                <div className="flex items-center justify-between gap-2 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    {hoveredTerm.classification === 'grammar' ? (
                      <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                    )}
                    <Badge 
                      className="text-white"
                      style={{
                        backgroundColor: hoveredTerm.classification === 'grammar' ? '#9333ea' : '#f97316'
                      }}
                    >
                      {hoveredTerm.classification === 'grammar' ? 'GRAMMAR' : 'SPELLING'}
                    </Badge>
                  </div>
                </div>
                
                {/* Current Term/Issue */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Issue:</div>
                  <div className="text-sm font-semibold">{hoveredTerm.text}</div>
                </div>
                
                {/* Rationale/Significance */}
                {hoveredTerm.rationale && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Significance:</div>
                    <div className="text-xs bg-muted p-2 rounded">
                      {hoveredTerm.rationale.replace(/([,.])(\S)/g, '$1 $2')}
                    </div>
                  </div>
                )}
                
                {/* Suggestions */}
                {hoveredTerm.suggestions && hoveredTerm.suggestions.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Suggestions:</div>
                    <div className="flex flex-wrap gap-1">
                      {hoveredTerm.suggestions.map((suggestion: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
    </TooltipProvider>
  );
};
