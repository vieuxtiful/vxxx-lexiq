import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, XCircle, Zap, BookOpen, Palette, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FlaggedTerm {
  text: string;
  start: number;
  end: number;
  score: number;
  hits: number;
  rationale: string;
  classification: 'valid' | 'review' | 'critical' | 'spelling' | 'grammar';
  suggestions?: string[];
  // Enhanced fields from the new engine
  semantic_type?: {
    semantic_type: string;
    ui_information?: {
      category: string;
      color_code: string;
      description: string;
      display_name: string;
    };
  };
  grammar_issues?: Array<{
    rule: string;
    severity: string;
    suggestion: string;
  }>;
  ui_metadata?: {
    semantic_type_info?: any;
    confidence_level: string;
    has_grammar_issues: boolean;
    grammar_severity: string;
  };
}

interface EnhancedLiveAnalysisPanelProps {
  content: string;
  flaggedTerms: FlaggedTerm[];
  onContentChange: (content: string) => void;
  onReanalyze?: (content: string) => void;
  glossaryContent?: string;
  // New props for enhanced functionality
  grammarCheckingEnabled?: boolean;
  onGrammarCheckingToggle?: (enabled: boolean) => void;
  selectedLanguage?: string;
  selectedDomain?: string;
  onValidateTerm?: (term: FlaggedTerm) => void;
}

export const EnhancedLiveAnalysisPanel: React.FC<EnhancedLiveAnalysisPanelProps> = ({
  content,
  flaggedTerms,
  onContentChange,
  onReanalyze,
  glossaryContent = '',
  grammarCheckingEnabled = false,
  onGrammarCheckingToggle,
  selectedLanguage = 'en',
  selectedDomain = 'general',
  onValidateTerm,
}) => {
  const { toast } = useToast();
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
  const [showSemanticTypes, setShowSemanticTypes] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const warningShownRef = useRef(false);
  const semanticTypesJustEnabledRef = useRef(false);

  // Auto-enable legend ONLY when semantic types are first enabled
  useEffect(() => {
    if (showSemanticTypes && !semanticTypesJustEnabledRef.current) {
      setShowLegend(true);
      semanticTypesJustEnabledRef.current = true;
    } else if (!showSemanticTypes) {
      semanticTypesJustEnabledRef.current = false;
    }
  }, [showSemanticTypes]);

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
      const editor = editorRef.current;
      
      // Enable editing mode when clicking inside the editor (not on highlights)
      if (editor && editor.contains(target) && !target.classList.contains('term-highlight')) {
        setIsEditing(true);
      }
      
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

    if (reanalyzeTimeoutRef.current) {
      clearTimeout(reanalyzeTimeoutRef.current);
    }

    reanalyzeTimeoutRef.current = setTimeout(() => {
      console.log('Triggering enhanced re-analysis of edited content...');
      onReanalyze(content);
    }, 25000);

    return () => {
      if (reanalyzeTimeoutRef.current) {
        clearTimeout(reanalyzeTimeoutRef.current);
      }
    };
  }, [content, isEditing, onReanalyze]);

  // Show warning when approaching character limit
  useEffect(() => {
    if (content.length >= 14000 && !warningShownRef.current) {
      warningShownRef.current = true;
      const remaining = 15000 - content.length;
      toast({
        title: "Approaching character limit",
        description: `${remaining.toLocaleString()} characters remaining (${content.length.toLocaleString()} / 15,000)`,
        variant: "destructive",
      });
    }
    
    // Reset warning if content goes back below threshold
    if (content.length < 14000) {
      warningShownRef.current = false;
    }
  }, [content.length, toast]);

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'valid':
        return <CheckCircle className="h-3 w-3" />;
      case 'review':
        return <AlertCircle className="h-3 w-3" />;
      case 'critical':
        return <XCircle className="h-3 w-3" />;
      case 'spelling':
        return <BookOpen className="h-3 w-3" />;
      case 'grammar':
        return <Zap className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'valid':
        return '#22c55e';
      case 'review':
        return '#eab308';
      case 'critical':
        return '#ef4444';
      case 'spelling':
        return '#f97316';
      case 'grammar':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getSemanticTypeColor = (semanticType?: any) => {
    if (!semanticType?.ui_information?.color_code) {
      return '#6b7280';
    }
    return semanticType.ui_information.color_code;
  };

  const renderContentWithUnderlines = () => {
    if (!content || flaggedTerms.length === 0) {
      // Show placeholder with brush fade animation when not editing and no content
      if (!content && !isEditing) {
        const placeholderText = 'Start typing or paste your text here... (0 / 15,000 characters)';
        return `<span class="placeholder-light-sweep" style="opacity: 0.5; color: #9ca3af;">${placeholderText}</span>`;
      }
      return content || '';
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
        
        searchIndex = foundIndex + 1;
      }
    });

    // Sort by start position and remove overlapping terms
    const sortedTerms = [...foundTermPositions].sort((a, b) => a.start - b.start);
    const nonOverlappingTerms = sortedTerms.filter((termPos, index) => {
      if (index === 0) return true;
      const prevTermPos = sortedTerms[index - 1];
      return termPos.start >= prevTermPos.end;
    });

    let html = '';
    let lastIndex = 0;

    nonOverlappingTerms.forEach((termPos) => {
      // Add text before the flagged term
      if (termPos.start > lastIndex) {
        const textBefore = content.slice(lastIndex, termPos.start);
        html += escapeHtml(textBefore);
      }

      const color = getClassificationColor(termPos.term.classification);
      const semanticColor = showSemanticTypes ? getSemanticTypeColor(termPos.term.semantic_type) : color;
      
      // Enhanced styling with semantic type information (with text color)
      let underlineStyle = '';
      if (termPos.term.classification === 'grammar') {
        underlineStyle = `color: ${color}; border-bottom: 2px wavy ${color}; cursor: pointer; background: linear-gradient(90deg, ${color}20, ${semanticColor}20); padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
      } else if (termPos.term.classification === 'spelling') {
        underlineStyle = `color: ${color}; border-bottom: 2px dotted ${color}; cursor: pointer; background-color: ${color}15; padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
      } else if (termPos.term.classification === 'valid') {
        underlineStyle = `color: ${showSemanticTypes ? semanticColor : color}; border-bottom: 2px dashed ${showSemanticTypes ? semanticColor : color}; cursor: pointer; background-color: ${showSemanticTypes ? semanticColor : color}10; padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
      } else {
        underlineStyle = `color: ${color}; border-bottom: 2px solid ${color}; cursor: pointer; background-color: ${color}10; padding: 0 2px; border-radius: 2px; display: inline; font-weight: 500;`;
      }
      
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

  const getCategoryStats = () => {
    const stats = {
      valid: 0,
      review: 0,
      critical: 0,
      spelling: 0,
      grammar: 0
    };

    flaggedTerms.forEach(term => {
      if (stats.hasOwnProperty(term.classification)) {
        stats[term.classification as keyof typeof stats]++;
      }
    });

    return stats;
  };

  const categoryStats = getCategoryStats();

  return (
    <TooltipProvider>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>Translation</span>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-blue-600 border-blue-500">
                  {selectedLanguage.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-purple-600 border-purple-500">
                  {selectedDomain}
                </Badge>
              </div>
            </CardTitle>
            
            <div className="flex items-center gap-4">
              {/* Grammar Checking Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="grammar-check"
                  checked={grammarCheckingEnabled}
                  onCheckedChange={onGrammarCheckingToggle}
                />
                <Label htmlFor="grammar-check" className="text-sm">Grammar Check</Label>
              </div>
              
              {/* Semantic Types Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="semantic-types"
                  checked={showSemanticTypes}
                  onCheckedChange={setShowSemanticTypes}
                />
                <Label htmlFor="semantic-types" className="text-sm flex items-center gap-1">
                  <Palette className="h-3 w-3" />
                  Types
                </Label>
              </div>

              {/* Show/Hide Legend Button - appears when Types is enabled AND analysis has been performed */}
              {showSemanticTypes && flaggedTerms.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLegend(!showLegend)}
                  className="h-8 text-xs"
                >
                  {showLegend ? 'Hide Legend' : 'Show Legend'}
                </Button>
              )}
            </div>
          </div>
          
          {/* Enhanced Category Badges - Hidden when Types toggle is off */}
          {showSemanticTypes && (
            <div className="flex gap-2 text-xs mt-2">
              <Badge variant="outline" className="text-green-600 border-green-500 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Valid ({categoryStats.valid})
              </Badge>
              <Badge variant="outline" className="text-yellow-600 border-yellow-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Review ({categoryStats.review})
              </Badge>
              <Badge variant="outline" className="text-red-600 border-red-500 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Critical ({categoryStats.critical})
              </Badge>
              <Badge variant="outline" className="text-orange-600 border-orange-500 flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                Spelling ({categoryStats.spelling})
              </Badge>
              {grammarCheckingEnabled && (
                <Badge variant="outline" className="text-purple-600 border-purple-500 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Grammar ({categoryStats.grammar})
                </Badge>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-auto relative">
          <div
            ref={editorRef}
            className="min-h-[400px] p-4 rounded-md border bg-background/50 font-mono text-sm leading-relaxed"
            contentEditable={isEditing}
            spellCheck={false}
            suppressContentEditableWarning
            onInput={(e) => {
              if (!isEditing || isComposing) return;
              saveCursorPosition();
              const newContent = e.currentTarget.textContent || '';
              onContentChange(newContent);
            }}
            onBlur={(e) => {
              setIsEditing(false);
              setIsComposing(false);
              setTimeout(() => {
                e.currentTarget.innerHTML = renderContentWithUnderlines();
              }, 100);
            }}
            onKeyUp={saveCursorPosition}
            onClick={saveCursorPosition}
            onCompositionStart={() => {
              // Pause state updates while user composes non-roman characters
              setIsComposing(true);
              saveCursorPosition();
            }}
            onCompositionUpdate={() => {
              // Continue tracking cursor during IME composition
              saveCursorPosition();
            }}
            onCompositionEnd={(e) => {
              // Commit the composed text when user selects character
              setIsComposing(false);
              if (isEditing) {
                const newContent = e.currentTarget.textContent || '';
                onContentChange(newContent);
                saveCursorPosition();
              }
            }}
            dangerouslySetInnerHTML={{ 
              __html: renderContentWithUnderlines()
            }}
          />

          {/* Character Counter and Legend */}
          <div className="text-xs mt-2 flex items-center justify-between">
            {showLegend && showSemanticTypes && (
              <div className="flex items-center gap-3">
                {/* Dynamically generate legend from actual flagged terms */}
                {Array.from(new Set(
                  flaggedTerms
                    .filter(t => t.semantic_type?.semantic_type)
                    .map(t => t.semantic_type!.semantic_type)
                )).map(type => {
                  const term = flaggedTerms.find(t => t.semantic_type?.semantic_type === type);
                  const color = getSemanticTypeColor(term?.semantic_type);
                  
                  // Priority: 1) Classification, 2) Semantic Type, 3) Display Name
                  let displayName = '';
                  
                  // First priority: Classification (Entity, Event, etc.)
                  if (term?.semantic_type?.ui_information?.category) {
                    displayName = term.semantic_type.ui_information.category;
                  }
                  // First fallback: AI's semantic type
                  else if (type) {
                    displayName = type;
                  }
                  // Second fallback: Display name
                  else if (term?.semantic_type?.ui_information?.display_name) {
                    const rawDisplayName = term.semantic_type.ui_information.display_name;
                    if (
                      typeof rawDisplayName === 'string' && 
                      rawDisplayName.length > 0 &&
                      !rawDisplayName.includes('[Max depth')
                    ) {
                      displayName = rawDisplayName;
                    }
                  }

                  // Capitalize first letter
                  displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();
                  
                  return (
                    <div key={type} className="flex items-center gap-1">
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-muted-foreground">{displayName}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <span className={`font-mono ml-auto ${
              content.length > 14000 ? 'text-red-600 dark:text-red-400' : 
              content.length > 10000 ? 'text-yellow-600 dark:text-yellow-400' : 
              'text-green-600 dark:text-green-400'
            }`}>
              {content.length.toLocaleString()} / 15,000 characters
            </span>
          </div>

          {/* Enhanced Hover Tooltip */}
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
              <div className="bg-popover border-2 border-primary rounded-lg shadow-xl p-4 max-w-md">
                <div className="space-y-3">
                  {/* Enhanced Header */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b">
                    <div className="flex items-center gap-2">
                      {getClassificationIcon(hoveredTerm.classification)}
                      <Badge 
                        style={{ backgroundColor: getClassificationColor(hoveredTerm.classification) }}
                        className="text-white"
                      >
                        {hoveredTerm.classification.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">Score: {hoveredTerm.score}%</span>
                      {hoveredTerm.ui_metadata?.confidence_level && (
                        <Badge variant="outline" className="text-xs">
                          {hoveredTerm.ui_metadata.confidence_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Current Term */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Current Term:</div>
                    <div className="text-sm font-semibold">{hoveredTerm.text}</div>
                  </div>
                  
                  {/* Semantic Type Information */}
                  {hoveredTerm.semantic_type?.ui_information && showSemanticTypes && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Semantic Type:</div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: hoveredTerm.semantic_type.ui_information.color_code }}
                        ></div>
                        <span className="text-sm font-medium">
                          {/* Priority: 1) Classification, 2) Semantic Type, 3) Display Name */}
                          {hoveredTerm.semantic_type.ui_information.category 
                            ? hoveredTerm.semantic_type.ui_information.category.charAt(0).toUpperCase() + hoveredTerm.semantic_type.ui_information.category.slice(1).toLowerCase()
                            : hoveredTerm.semantic_type.semantic_type 
                              ? hoveredTerm.semantic_type.semantic_type.charAt(0).toUpperCase() + hoveredTerm.semantic_type.semantic_type.slice(1).toLowerCase()
                              : hoveredTerm.semantic_type.ui_information.display_name}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {hoveredTerm.semantic_type.ui_information.description}
                      </div>
                    </div>
                  )}
                  
                  {/* Grammar Issues */}
                  {hoveredTerm.grammar_issues && hoveredTerm.grammar_issues.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Grammar Issues:</div>
                      <div className="space-y-1">
                        {hoveredTerm.grammar_issues.map((issue, idx) => (
                          <div key={idx} className="text-xs bg-muted p-2 rounded">
                            <div className="font-medium text-purple-600">{issue.rule.replace('_', ' ').toUpperCase()}</div>
                            <div className="text-muted-foreground">{issue.suggestion}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Rationale */}
                  {hoveredTerm.rationale && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Analysis:</div>
                      <div className="text-xs bg-muted p-2 rounded">{hoveredTerm.rationale}</div>
                    </div>
                  )}
                  
                  {/* Suggestions - clickable to trigger Quick Actions */}
                  {hoveredTerm.suggestions && hoveredTerm.suggestions.length > 0 && 
                   hoveredTerm.suggestions.some(s => s !== hoveredTerm.text) && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Suggestions:</div>
                      <div className="flex flex-wrap gap-1">
                        {hoveredTerm.suggestions
                          .filter(suggestion => suggestion !== hoveredTerm.text)
                          .slice(0, 3)
                          .map((suggestion, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Auto-replace with the clicked suggestion
                              const newContent = content.slice(0, hoveredTerm.position.start) + 
                                               suggestion + 
                                               content.slice(hoveredTerm.position.end);
                              onContentChange(newContent);
                              setHoveredTerm(null);
                              setTooltipPosition(null);
                            }}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Frequency */}
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Appears {hoveredTerm.hits} time{hoveredTerm.hits !== 1 ? 's' : ''} in document
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Click Popup for Replacements */}
          {clickedTerm && clickPosition && (
            <div 
              className="fixed z-50 recommendation-popup"
              style={{ 
                left: `${clickPosition.x}px`, 
                top: `${clickPosition.y}px`
              }}
            >
              <div className="bg-popover border-2 border-primary rounded-lg shadow-xl p-3 min-w-[200px]">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Quick Actions</div>
                  
                  {clickedTerm.suggestions && clickedTerm.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Replace with:</div>
                      {clickedTerm.suggestions
                        .filter(suggestion => suggestion !== clickedTerm.text)
                        .slice(0, 3)
                        .map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7"
                          onClick={() => {
                            const newContent = content.slice(0, clickedTerm.position.start) + 
                                             suggestion + 
                                             content.slice(clickedTerm.position.end);
                            onContentChange(newContent);
                            setClickedTerm(null);
                            setClickPosition(null);
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Grammar-specific actions */}
                  {clickedTerm.classification === 'grammar' && clickedTerm.grammar_issues && (
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Grammar fixes:</div>
                      {clickedTerm.grammar_issues.slice(0, 2).map((issue, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs h-7 text-purple-600"
                          onClick={() => {
                            // Apply grammar fix (simplified)
                            const suggestion = issue.suggestion.split(' ').pop() || issue.suggestion;
                            const newContent = content.slice(0, clickedTerm.position.start) + 
                                             suggestion + 
                                             content.slice(clickedTerm.position.end);
                            onContentChange(newContent);
                            setClickedTerm(null);
                            setClickPosition(null);
                          }}
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {issue.suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Validate action - only for Review terms */}
                  {clickedTerm.classification === 'review' && onValidateTerm && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-xs h-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          onValidateTerm(clickedTerm);
                          setClickedTerm(null);
                          setClickPosition(null);
                          toast({
                            title: "Term Validated",
                            description: `"${clickedTerm.text}" has been marked as valid.`,
                          });
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Validate
                      </Button>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={() => {
                        setClickedTerm(null);
                        setClickPosition(null);
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default EnhancedLiveAnalysisPanel;
