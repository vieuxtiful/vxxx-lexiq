import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FlaggedTerm {
  text: string;
  start: number;
  end: number;
  score: number;
  hits: number;
  rationale: string;
  classification: 'valid' | 'review' | 'critical' | 'spelling';
  suggestions?: string[];
}

interface LiveAnalysisPanelProps {
  content: string;
  flaggedTerms: FlaggedTerm[];
  onContentChange: (content: string) => void;
  onReanalyze?: (content: string) => void;
  glossaryContent?: string;
}

export const LiveAnalysisPanel: React.FC<LiveAnalysisPanelProps> = ({
  content,
  flaggedTerms,
  onContentChange,
  onReanalyze,
  glossaryContent = '',
}) => {
  const [hoveredTerm, setHoveredTerm] = useState<(FlaggedTerm & { position: { start: number; end: number } }) | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [clickedTerm, setClickedTerm] = useState<FlaggedTerm & { position: { start: number; end: number } } | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const cursorPositionRef = useRef<number>(0);
  const tooltipHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);
  const reanalyzeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Accurately count occurrences of a term in content (Unicode safe)
  const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const countOccurrences = (haystack: string, needle: string) => {
    if (!needle) return 0;
    const re = new RegExp(escapeForRegex(needle), 'g');
    const matches = haystack.match(re);
    return matches ? matches.length : 0;
  };

  // Save cursor position before any update
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

  // Restore cursor position after DOM update
  const restoreCursorPosition = () => {
    const editor = editorRef.current;
    if (!editor) return;
    
    const targetPosition = cursorPositionRef.current;
    const selection = window.getSelection();
    if (!selection) return;
    
    let currentPosition = 0;
    const nodeIterator = document.createNodeIterator(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentNode: Node | null;
    while ((currentNode = nodeIterator.nextNode())) {
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

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('term-highlight')) {
        const start = parseInt(target.getAttribute('data-term-start') || '0', 10);
        const end = parseInt(target.getAttribute('data-term-end') || '0', 10);
        const termText = target.getAttribute('data-term-text') || '';
        
        const term = flaggedTerms.find(t => t.text === termText);
        if (term) {
          setHoveredTerm({ ...term, position: { start, end } });
          const rect = target.getBoundingClientRect();
          setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('term-highlight')) {
        // Delay hiding to allow moving to tooltip
        tooltipHoverTimeoutRef.current = setTimeout(() => {
          if (!isTooltipHovered) {
            setHoveredTerm(null);
            setTooltipPosition(null);
          }
        }, 200);
      }
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const editor = editorRef.current;
      if (editor && editor.contains(target)) {
        setIsEditing(true);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('term-highlight') && !isEditing) {
        e.preventDefault();
        const start = parseInt(target.getAttribute('data-term-start') || '0', 10);
        const end = parseInt(target.getAttribute('data-term-end') || '0', 10);
        const termText = target.getAttribute('data-term-text') || '';
        
        const term = flaggedTerms.find(t => t.text === termText);
        if (term) {
          setClickedTerm({ ...term, position: { start, end } });
          const rect = target.getBoundingClientRect();
          setClickPosition({ x: rect.left, y: rect.bottom + 5 });
        }
      } else if (!target.closest('.recommendation-popup')) {
        setClickedTerm(null);
        setClickPosition(null);
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('mouseover', handleMouseOver);
      editor.addEventListener('mouseout', handleMouseOut);
      editor.addEventListener('click', handleClick);
      editor.addEventListener('dblclick', handleDoubleClick);
    }

    // Close popup when clicking outside
    document.addEventListener('click', handleClick);

    return () => {
      if (editor) {
        editor.removeEventListener('mouseover', handleMouseOver);
        editor.removeEventListener('mouseout', handleMouseOut);
        editor.removeEventListener('click', handleClick);
        editor.removeEventListener('dblclick', handleDoubleClick);
      }
      document.removeEventListener('click', handleClick);
      if (tooltipHoverTimeoutRef.current) {
        clearTimeout(tooltipHoverTimeoutRef.current);
      }
    };
  }, [flaggedTerms, isEditing]);

  // Restore cursor after content updates during editing
  useEffect(() => {
    if (isEditing) {
      restoreCursorPosition();
    }
  }, [content, isEditing]);

  // Debounced re-analysis when content changes
  useEffect(() => {
    if (!isEditing || !onReanalyze) return;

    // Clear previous timeout
    if (reanalyzeTimeoutRef.current) {
      clearTimeout(reanalyzeTimeoutRef.current);
    }

    // Set new timeout for re-analysis (2 seconds after user stops typing)
    reanalyzeTimeoutRef.current = setTimeout(() => {
      console.log('Triggering re-analysis of edited content...');
      onReanalyze(content);
    }, 2000);

    return () => {
      if (reanalyzeTimeoutRef.current) {
        clearTimeout(reanalyzeTimeoutRef.current);
      }
    };
  }, [content, isEditing, onReanalyze]);

  const getClassificationColor = (classification: string, score: number) => {
    switch (classification) {
      case 'valid':
        return 'text-green-600 dark:text-green-400';
      case 'review':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'spelling':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getUnderlineClass = (classification: string) => {
    switch (classification) {
      case 'valid':
        return 'border-b-2 border-green-500 border-dashed';
      case 'review':
        return 'border-b-2 border-yellow-500 border-wavy';
      case 'critical':
        return 'border-b-2 border-red-500 border-wavy';
      case 'spelling':
        return 'border-b-2 border-yellow-400 border-dotted';
      default:
        return '';
    }
  };

  const renderContentWithUnderlines = () => {
    if (!content || flaggedTerms.length === 0) {
      return content || 'Start typing or paste your text here...';
    }

    if (isEditing) {
      return content;
    }

    // Find all actual occurrences of terms in the content
    const foundTermPositions: Array<{
      start: number;
      end: number;
      term: FlaggedTerm;
      actualText: string;
    }> = [];

    flaggedTerms.forEach(term => {
      // Search for the actual term text in the content
      const searchText = term.text;
      let searchIndex = 0;
      
      while (searchIndex < content.length) {
        const foundIndex = content.indexOf(searchText, searchIndex);
        if (foundIndex === -1) break;
        
        foundTermPositions.push({
          start: foundIndex,
          end: foundIndex + searchText.length,
          term: term,
          actualText: content.slice(foundIndex, foundIndex + searchText.length)
        });
        
        searchIndex = foundIndex + 1; // Continue searching for more occurrences
      }
    });

    // Sort by start position
    const sortedTerms = [...foundTermPositions].sort((a, b) => a.start - b.start);

    // Remove overlapping terms - keep the first one
    const nonOverlappingTerms = sortedTerms.filter((termPos, index) => {
      if (index === 0) return true;
      const prevTermPos = sortedTerms[index - 1];
      return termPos.start >= prevTermPos.end;
    });

    console.log('Rendering terms:', {
      totalFlagged: flaggedTerms.length,
      foundOccurrences: foundTermPositions.length,
      afterOverlapRemoval: nonOverlappingTerms.length,
      contentLength: content.length
    });

    let html = '';
    let lastIndex = 0;

    nonOverlappingTerms.forEach((termPos) => {
      // Add text before the flagged term
      if (termPos.start > lastIndex) {
        const textBefore = content.slice(lastIndex, termPos.start);
        html += escapeHtml(textBefore);
      }

      // Determine color based on classification
      const getColor = (classification: string) => {
        switch (classification) {
          case 'valid': return '#22c55e';
          case 'review': return '#eab308';
          case 'critical': return '#ef4444';
          case 'spelling': return '#facc15';
          default: return '#eab308';
        }
      };

      const color = getColor(termPos.term.classification);
      const underlineStyle = termPos.term.classification === 'valid'
        ? `border-bottom: 2px dashed ${color}; cursor: pointer; background-color: ${color}10; padding: 0 2px; border-radius: 2px; display: inline;`
        : `border-bottom: 2px solid ${color}; cursor: pointer; background-color: ${color}10; padding: 0 2px; border-radius: 2px; display: inline;`;
      
      const escapedText = escapeHtml(termPos.actualText);
      html += `<span class="term-highlight" style="${underlineStyle}" data-term-start="${termPos.start}" data-term-end="${termPos.end}" data-term-class="${termPos.term.classification}" data-term-text="${escapeHtml(termPos.term.text)}">${escapedText}</span>`;
      lastIndex = termPos.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      html += escapeHtml(remainingText);
    }

    return html;
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

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Translation Editor</span>
            <div className="flex gap-2 text-xs">
              <Badge variant="outline" className="text-green-600 border-green-500">
                Valid
              </Badge>
              <Badge variant="outline" className="text-yellow-600 border-yellow-500">
                Review
              </Badge>
              <Badge variant="outline" className="text-red-600 border-red-500">
                Critical
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto relative">
          <div
            ref={editorRef}
            className="min-h-[400px] p-4 rounded-md border bg-background/50 font-mono text-sm leading-relaxed"
            contentEditable={isEditing}
            spellCheck={false}
            suppressContentEditableWarning
            onInput={(e) => {
              if (!isEditing) return;
              saveCursorPosition();
              const newContent = e.currentTarget.textContent || '';
              onContentChange(newContent);
            }}
            onBlur={(e) => {
              setIsEditing(false);
              // Refresh underlines after editing
              setTimeout(() => {
                e.currentTarget.innerHTML = renderContentWithUnderlines();
              }, 100);
            }}
            onKeyUp={saveCursorPosition}
            onClick={saveCursorPosition}
            onCompositionStart={() => {
              // Handle CJK input method composition
              saveCursorPosition();
            }}
            onCompositionEnd={(e) => {
              // Handle CJK input method composition end
              if (isEditing) {
                const newContent = e.currentTarget.textContent || '';
                onContentChange(newContent);
              }
            }}
            dangerouslySetInnerHTML={{ 
              __html: renderContentWithUnderlines()
            }}
          />

          {/* Hover Tooltip with Click-to-Replace */}
          {hoveredTerm && tooltipPosition && !clickedTerm && (
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
              <div className="bg-popover border-2 border-primary rounded-lg shadow-xl p-3 max-w-md">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b">
                    <Badge 
                      className={
                        hoveredTerm.classification === 'valid' 
                          ? 'bg-green-600' 
                          : hoveredTerm.classification === 'review'
                          ? 'bg-yellow-600'
                          : hoveredTerm.classification === 'spelling'
                          ? 'bg-yellow-500'
                          : 'bg-red-600'
                      }
                    >
                      {hoveredTerm.classification.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-medium">Score: {hoveredTerm.score}%</span>
                  </div>
                  
                  {/* Current Term */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current:</div>
                    <div className="text-sm font-semibold">{hoveredTerm.text}</div>
                  </div>
                  
                  {/* Rationale */}
                  {hoveredTerm.rationale && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Context:</div>
                      <div className="text-xs bg-muted p-2 rounded">{hoveredTerm.rationale}</div>
                    </div>
                  )}
                  
                  {/* Frequency (computed from current content) */}
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const c = countOccurrences(content, hoveredTerm.text);
                      return `Appears ${c} time${c !== 1 ? 's' : ''}`;
                    })()}
                  </div>
                  
                  {/* Recommendations */}
                  {hoveredTerm.suggestions && hoveredTerm.suggestions.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Recommended alternatives:</div>
                      <div className="space-y-1">
                        {hoveredTerm.suggestions.slice(0, 3).map((suggestion, idx) => (
                          <button
                            key={idx}
                            className="w-full text-left px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 rounded border border-primary/20 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              const newContent = 
                                content.substring(0, hoveredTerm.position.start) +
                                suggestion +
                                content.substring(hoveredTerm.position.end);
                              onContentChange(newContent);
                              setHoveredTerm(null);
                              setTooltipPosition(null);
                            }}
                          >
                            <span className="font-medium">{suggestion}</span>
                            {idx === 0 && <span className="ml-2 text-xs text-muted-foreground">(glossary)</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Keep Current Button */}
                  <button
                    className="w-full text-center px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoveredTerm(null);
                      setTooltipPosition(null);
                    }}
                  >
                    Keep current term
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Click Recommendation Popup */}
          {clickedTerm && clickPosition && (
            <div 
              className="fixed z-50 recommendation-popup"
              style={{ 
                left: `${clickPosition.x}px`, 
                top: `${clickPosition.y}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-popover border-2 border-primary rounded-lg shadow-xl p-4 max-w-md min-w-[300px]">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                    <Badge 
                      className={
                        clickedTerm.classification === 'valid' 
                          ? 'bg-green-600' 
                          : clickedTerm.classification === 'review'
                          ? 'bg-yellow-600'
                          : clickedTerm.classification === 'spelling'
                          ? 'bg-yellow-500'
                          : 'bg-red-600'
                      }
                    >
                      {clickedTerm.classification.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-medium">Score: {clickedTerm.score}%</span>
                  </div>

                  {/* Current Term */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Term:</div>
                    <div className="text-sm font-semibold">{clickedTerm.text}</div>
                  </div>

                  {/* Rationale */}
                  {clickedTerm.rationale && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Context:</div>
                      <div className="text-xs bg-muted p-2 rounded">{clickedTerm.rationale}</div>
                    </div>
                  )}

                  {/* Frequency (computed from current content) */}
                  <div className="text-xs text-muted-foreground">
                    {(() => {
                      const c = countOccurrences(content, clickedTerm.text);
                      return `Appears ${c} time${c !== 1 ? 's' : ''} in translation`;
                    })()}
                  </div>

                  {/* Recommendations */}
                  {clickedTerm.classification !== 'valid' && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Recommended alternatives:</div>
                      <div className="space-y-1">
                        <button
                          className="w-full text-left px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 rounded border border-primary/20 transition-colors"
                          onClick={() => {
                            const newContent = 
                              content.substring(0, clickedTerm.position.start) +
                              clickedTerm.text +
                              content.substring(clickedTerm.position.end);
                            onContentChange(newContent);
                            setClickedTerm(null);
                            setClickPosition(null);
                          }}
                        >
                          Keep current: <span className="font-medium">{clickedTerm.text}</span>
                        </button>
                        <button
                          className="w-full text-left px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded transition-colors"
                          onClick={() => {
                            // Generate a correction suggestion (you can enhance this logic)
                            const suggestion = clickedTerm.text.trim();
                            const newContent = 
                              content.substring(0, clickedTerm.position.start) +
                              suggestion +
                              content.substring(clickedTerm.position.end);
                            onContentChange(newContent);
                            setClickedTerm(null);
                            setClickPosition(null);
                          }}
                        >
                          Review manually
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {clickedTerm.classification === 'valid' && (
                    <div className="text-xs text-success bg-success/10 p-2 rounded">
                      ✓ This term is correctly used according to the glossary
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
