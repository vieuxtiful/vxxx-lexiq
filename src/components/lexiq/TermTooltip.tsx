/**
 * Enhanced Term Tooltip - Unified tooltip with HotMatch and recommendations
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Sparkles, 
  TrendingUp,
  FileEdit,
  Database,
  Loader2
} from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';
import { lexiqApi } from '@/lib/lexiqApiClient';

interface EnhancedTermTooltipProps {
  term: string;
  classification: 'valid' | 'review' | 'critical' | 'spelling' | 'grammar';
  score: number;
  rationale: string;
  context: string;
  domain: string;
  language: string;
  termId?: string;
  onReplaceInEditor?: (newTerm: string) => void;
  onReplaceInGlossary?: (termId: string, newTerm: string) => void;
  onClose?: () => void;
}

export const EnhancedTermTooltip: React.FC<EnhancedTermTooltipProps> = ({
  term,
  classification,
  score,
  rationale,
  context,
  domain,
  language,
  termId,
  onReplaceInEditor,
  onReplaceInGlossary,
  onClose,
}) => {
  const { fetchRecommendations, getRecommendationState } = useRecommendations();
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const recommendationState = getRecommendationState(term, domain, language);

  useEffect(() => {
    // Auto-fetch recommendations for non-valid terms
    if (classification !== 'valid' && !recommendationState) {
      setIsLoadingRecommendations(true);
      fetchRecommendations(term, domain, language, context, classification).finally(() => {
        setIsLoadingRecommendations(false);
      });
    }
  }, [term, domain, language, classification, context, fetchRecommendations, recommendationState]);

  const getClassificationIcon = () => {
    switch (classification) {
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'review':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'spelling':
        return <AlertCircle className="h-4 w-4 text-purple-600" />;
      case 'grammar':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getClassificationColor = () => {
    switch (classification) {
      case 'valid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'review':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'spelling':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'grammar':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleReplaceInEditor = (newTerm: string) => {
    if (onReplaceInEditor) {
      onReplaceInEditor(newTerm);
      onClose?.();
    }
  };

  const handleReplaceInGlossary = async (newTerm: string) => {
    if (termId && onReplaceInGlossary) {
      onReplaceInGlossary(termId, newTerm);
      onClose?.();
    }
  };

  const getScoreColor = (scoreValue: number) => {
    if (scoreValue >= 70) return 'text-green-600';
    if (scoreValue >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-[400px] shadow-lg border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              {getClassificationIcon()}
              {term}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={getClassificationColor()}>
                {classification}
              </Badge>
              <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                {score.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Rationale */}
        <div>
          <h4 className="text-sm font-semibold mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Quality Assessment
          </h4>
          <p className="text-sm text-muted-foreground">{rationale}</p>
        </div>

        {/* Context */}
        {context && (
          <div>
            <h4 className="text-sm font-semibold mb-1">Context</h4>
            <p className="text-xs text-muted-foreground italic bg-muted p-2 rounded">
              {context}
            </p>
          </div>
        )}

        <Separator />

        {/* Recommendations Section */}
        {classification !== 'valid' && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Recommended Alternatives
            </h4>

            {isLoadingRecommendations || recommendationState?.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading recommendations...
                </span>
              </div>
            ) : recommendationState?.recommendations &&
              recommendationState.recommendations.length > 0 ? (
              <div className="space-y-2">
                {recommendationState.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{rec.term}</span>
                          <Badge variant="outline" className="text-xs">
                            {(rec.confidence * 100).toFixed(0)}%
                          </Badge>
                          {rec.source === 'hot_match' && (
                            <Badge variant="outline" className="text-xs bg-orange-500/10">
                              HotMatch
                            </Badge>
                          )}
                          {rec.source === 'llm_annotation' && (
                            <Badge variant="outline" className="text-xs bg-blue-500/10">
                              AI
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.rationale}
                        </p>
                        {rec.usage_count && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Used {rec.usage_count} times by other users
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-2">
                      {onReplaceInEditor && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleReplaceInEditor(rec.term)}
                        >
                          <FileEdit className="h-3 w-3" />
                          Replace in Editor
                        </Button>
                      )}
                      {termId && onReplaceInGlossary && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleReplaceInGlossary(rec.term)}
                        >
                          <Database className="h-3 w-3" />
                          Update Glossary
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No recommendations available
              </p>
            )}
          </div>
        )}

        {/* Validation Info */}
        {recommendationState?.validation && (
          <>
            <Separator />
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validation Tier:</span>
                <span className="font-medium">
                  {recommendationState.validation.fallback_tier?.replace('tier_', 'Tier ').replace('_', ' ')}
                </span>
              </div>
              {recommendationState.validation.semantic_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semantic Type:</span>
                  <span className="font-medium">
                    {recommendationState.validation.semantic_type}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
