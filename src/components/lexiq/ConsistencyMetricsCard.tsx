import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  FileText,
  Target,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelMetrics } from '@/hooks/useConsistencyGrade';
import type { EnhancedLQASyncIssue, EnhancedLQAStatistics } from '@/hooks/useLQASyncEnhanced';

export interface ConsistencyMetricsCardProps {
  overallScore: number;
  sourceEditorMetrics: PanelMetrics;
  termValidatorMetrics: PanelMetrics;
  allIssues: EnhancedLQASyncIssue[];
  statistics: EnhancedLQAStatistics | null;
  isAnalyzing: boolean;
  lastAnalyzed: Date | null;
  onRefresh?: () => void;
  onFixIssue?: (issueId: string) => void;
  onDismissIssue?: (issueId: string) => void;
}

/**
 * Get severity icon and color
 */
const getSeverityConfig = (severity?: string) => {
  switch (severity) {
    case 'critical':
      return {
        icon: XCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    case 'major':
      return {
        icon: AlertTriangle,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        borderColor: 'border-orange-200 dark:border-orange-800'
      };
    case 'minor':
      return {
        icon: AlertCircle,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      };
    case 'info':
      return {
        icon: Info,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800'
      };
    default:
      return {
        icon: Info,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-950/30',
        borderColor: 'border-gray-200 dark:border-gray-800'
      };
  }
};

/**
 * Get quality score color
 */
const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 60) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Panel Metrics Display Component
 */
const PanelMetricsDisplay: React.FC<{
  metrics: PanelMetrics;
  onFixIssue?: (issueId: string) => void;
}> = ({ metrics, onFixIssue }) => {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {metrics.panelName === 'Source Editor' ? (
            <FileText className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Target className="w-5 h-5 text-muted-foreground" />
          )}
          <h4 className="font-semibold">{metrics.panelName}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-bold", getScoreColor(metrics.qualityScore))}>
            {metrics.qualityScore}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress value={metrics.qualityScore} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{metrics.contentLength} characters</span>
          <span>{metrics.issueCount} {metrics.issueCount === 1 ? 'issue' : 'issues'}</span>
        </div>
      </div>

      {/* Severity Breakdown */}
      {metrics.issueCount > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {metrics.issuesBySeverity.critical > 0 && (
            <div className="flex flex-col items-center p-2 rounded-md bg-red-50 dark:bg-red-950/30">
              <span className="text-xs text-muted-foreground">Critical</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {metrics.issuesBySeverity.critical}
              </span>
            </div>
          )}
          {metrics.issuesBySeverity.major > 0 && (
            <div className="flex flex-col items-center p-2 rounded-md bg-orange-50 dark:bg-orange-950/30">
              <span className="text-xs text-muted-foreground">Major</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {metrics.issuesBySeverity.major}
              </span>
            </div>
          )}
          {metrics.issuesBySeverity.minor > 0 && (
            <div className="flex flex-col items-center p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30">
              <span className="text-xs text-muted-foreground">Minor</span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {metrics.issuesBySeverity.minor}
              </span>
            </div>
          )}
          {metrics.issuesBySeverity.info > 0 && (
            <div className="flex flex-col items-center p-2 rounded-md bg-blue-50 dark:bg-blue-950/30">
              <span className="text-xs text-muted-foreground">Info</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {metrics.issuesBySeverity.info}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Issues List */}
      {metrics.issues.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-sm font-medium">Issues:</h5>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2 pr-4">
              {metrics.issues.map((issue) => {
                const severityConfig = getSeverityConfig(issue.severity);
                const SeverityIcon = severityConfig.icon;
                const isExpanded = expandedIssue === issue.id;

                return (
                  <div
                    key={issue.id}
                    className={cn(
                      "p-3 rounded-md border transition-all",
                      severityConfig.bgColor,
                      severityConfig.borderColor
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityIcon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", severityConfig.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {issue.type}
                          </Badge>
                          {issue.severity && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {issue.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium mb-1">{issue.rationale}</p>
                        
                        {!isExpanded && issue.targetText && (
                          <p className="text-xs text-muted-foreground truncate">
                            "{issue.targetText}"
                          </p>
                        )}

                        {isExpanded && (
                          <div className="mt-2 space-y-2 text-xs">
                            {issue.targetText && (
                              <div>
                                <span className="font-medium">Text: </span>
                                <span className="text-muted-foreground">"{issue.targetText}"</span>
                              </div>
                            )}
                            {issue.suggestion && (
                              <div>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  Suggestion: 
                                </span>
                                <span className="text-muted-foreground"> "{issue.suggestion}"</span>
                              </div>
                            )}
                            {issue.context && (
                              <div>
                                <span className="font-medium">Context: </span>
                                <span className="text-muted-foreground">{issue.context}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Confidence: </span>
                              <span className="text-muted-foreground">
                                {(issue.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                          >
                            {isExpanded ? 'Show Less' : 'Show More'}
                          </Button>
                          {issue.autoFixable && onFixIssue && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => onFixIssue(issue.id)}
                            >
                              Fix
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* No Issues */}
      {metrics.issueCount === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mb-2" />
          <p className="text-sm font-medium">No issues found</p>
          <p className="text-xs text-muted-foreground">This panel has excellent quality</p>
        </div>
      )}
    </div>
  );
};

/**
 * ConsistencyMetricsCard Component
 * 
 * Detailed consistency metrics display for StatisticsTab
 * Shows per-panel breakdown and actionable insights
 */
export const ConsistencyMetricsCard: React.FC<ConsistencyMetricsCardProps> = ({
  overallScore,
  sourceEditorMetrics,
  termValidatorMetrics,
  allIssues,
  statistics,
  isAnalyzing,
  lastAnalyzed,
  onRefresh,
  onFixIssue,
  onDismissIssue
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'source' | 'target'>('overview');

  // Calculate issue type distribution
  const issueTypeDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    allIssues.forEach(issue => {
      distribution[issue.type] = (distribution[issue.type] || 0) + 1;
    });
    return Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 issue types
  }, [allIssues]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Consistency Metrics
            </CardTitle>
            <CardDescription>
              Real-time quality analysis across all panels
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastAnalyzed && (
              <span className="text-xs text-muted-foreground">
                Updated {lastAnalyzed.toLocaleTimeString()}
              </span>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isAnalyzing}
              >
                <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Overall Quality Score</h3>
            <div className="flex items-center gap-2">
              <span className={cn("text-4xl font-bold", getScoreColor(overallScore))}>
                {overallScore}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>
          <Progress value={overallScore} className="h-3" />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {allIssues.length} {allIssues.length === 1 ? 'issue' : 'issues'} detected
            </span>
            <span>
              {overallScore >= 90 ? 'Excellent' : overallScore >= 75 ? 'Good' : overallScore >= 60 ? 'Fair' : 'Needs Improvement'}
            </span>
          </div>
        </div>

        <Separator />

        {/* Issue Type Distribution */}
        {issueTypeDistribution.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Top Issue Types</h4>
            <div className="space-y-2">
              {issueTypeDistribution.map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                    <Progress 
                      value={(count / allIssues.length) * 100} 
                      className="h-1.5" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Per-Panel Breakdown */}
        <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="source">
              Source ({sourceEditorMetrics.issueCount})
            </TabsTrigger>
            <TabsTrigger value="target">
              Target ({termValidatorMetrics.issueCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Source Editor Summary */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h5 className="font-medium">Source Editor</h5>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality</span>
                    <span className={cn("text-lg font-bold", getScoreColor(sourceEditorMetrics.qualityScore))}>
                      {sourceEditorMetrics.qualityScore}
                    </span>
                  </div>
                  <Progress value={sourceEditorMetrics.qualityScore} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {sourceEditorMetrics.issueCount} {sourceEditorMetrics.issueCount === 1 ? 'issue' : 'issues'}
                  </div>
                </div>
              </div>

              {/* Term Validator Summary */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <h5 className="font-medium">Term Validator</h5>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Quality</span>
                    <span className={cn("text-lg font-bold", getScoreColor(termValidatorMetrics.qualityScore))}>
                      {termValidatorMetrics.qualityScore}
                    </span>
                  </div>
                  <Progress value={termValidatorMetrics.qualityScore} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {termValidatorMetrics.issueCount} {termValidatorMetrics.issueCount === 1 ? 'issue' : 'issues'}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Summary */}
            {statistics && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <h5 className="font-medium mb-3">Analysis Statistics</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Grammar Issues:</span>
                    <span className="ml-2 font-medium">{statistics.grammarIssues}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Spelling Issues:</span>
                    <span className="ml-2 font-medium">{statistics.spellingIssues}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Consistency Issues:</span>
                    <span className="ml-2 font-medium">{statistics.consistencyIssues}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Confidence:</span>
                    <span className="ml-2 font-medium">
                      {(statistics.averageConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="source" className="mt-4">
            <PanelMetricsDisplay 
              metrics={sourceEditorMetrics} 
              onFixIssue={onFixIssue}
            />
          </TabsContent>

          <TabsContent value="target" className="mt-4">
            <PanelMetricsDisplay 
              metrics={termValidatorMetrics} 
              onFixIssue={onFixIssue}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ConsistencyMetricsCard;
