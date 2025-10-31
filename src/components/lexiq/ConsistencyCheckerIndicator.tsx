import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConsistencyCheckerIndicatorProps {
  qualityScore: number;
  totalIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  infoIssues?: number;
  isAnalyzing: boolean;
  onViewDetails?: () => void;
  compact?: boolean;
  showTrend?: boolean;
  previousScore?: number;
}

/**
 * Get grade configuration based on quality score
 */
const getGradeConfig = (score: number) => {
  if (score >= 90) {
    return {
      grade: 'Excellent',
      color: 'green',
      bgClass: 'bg-green-500/10 hover:bg-green-500/20',
      textClass: 'text-green-700 dark:text-green-400',
      borderClass: 'border-green-500/20',
      icon: CheckCircle2,
      iconColor: 'text-green-600 dark:text-green-400'
    };
  } else if (score >= 75) {
    return {
      grade: 'Good',
      color: 'yellow',
      bgClass: 'bg-yellow-500/10 hover:bg-yellow-500/20',
      textClass: 'text-yellow-700 dark:text-yellow-400',
      borderClass: 'border-yellow-500/20',
      icon: AlertCircle,
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    };
  } else if (score >= 60) {
    return {
      grade: 'Fair',
      color: 'orange',
      bgClass: 'bg-orange-500/10 hover:bg-orange-500/20',
      textClass: 'text-orange-700 dark:text-orange-400',
      borderClass: 'border-orange-500/20',
      icon: AlertTriangle,
      iconColor: 'text-orange-600 dark:text-orange-400'
    };
  } else {
    return {
      grade: 'Poor',
      color: 'red',
      bgClass: 'bg-red-500/10 hover:bg-red-500/20',
      textClass: 'text-red-700 dark:text-red-400',
      borderClass: 'border-red-500/20',
      icon: XCircle,
      iconColor: 'text-red-600 dark:text-red-400'
    };
  }
};

/**
 * ConsistencyCheckerIndicator Component
 * 
 * Displays real-time consistency grade in the Main Editor Area
 * Shows quality score, issue count, and quick access to details
 */
export const ConsistencyCheckerIndicator: React.FC<ConsistencyCheckerIndicatorProps> = ({
  qualityScore,
  totalIssues,
  criticalIssues,
  majorIssues,
  minorIssues,
  infoIssues = 0,
  isAnalyzing,
  onViewDetails,
  compact = false,
  showTrend = false,
  previousScore
}) => {
  const gradeConfig = useMemo(() => getGradeConfig(qualityScore), [qualityScore]);
  const GradeIcon = gradeConfig.icon;

  // Calculate trend
  const trend = useMemo(() => {
    if (!showTrend || previousScore === undefined) return null;
    const diff = qualityScore - previousScore;
    if (Math.abs(diff) < 2) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  }, [qualityScore, previousScore, showTrend]);

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;

  // Tooltip content
  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-semibold">Consistency Grade: {gradeConfig.grade}</div>
      <div className="text-sm space-y-1">
        <div>Quality Score: {qualityScore}/100</div>
        <div className="border-t pt-1 mt-1">
          <div className="font-medium mb-1">Issues Breakdown:</div>
          {criticalIssues > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Critical: {criticalIssues}</span>
            </div>
          )}
          {majorIssues > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Major: {majorIssues}</span>
            </div>
          )}
          {minorIssues > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span>Minor: {minorIssues}</span>
            </div>
          )}
          {infoIssues > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Info: {infoIssues}</span>
            </div>
          )}
          {totalIssues === 0 && (
            <div className="text-green-600 dark:text-green-400">No issues found</div>
          )}
        </div>
        {trend && (
          <div className="border-t pt-1 mt-1">
            <div className="flex items-center gap-1">
              <TrendIcon className="w-3 h-3" />
              <span className="capitalize">{trend}</span>
              {previousScore !== undefined && (
                <span className="text-xs opacity-70">
                  ({previousScore} → {qualityScore})
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      {onViewDetails && (
        <div className="text-xs opacity-70 border-t pt-1 mt-1">
          Click to view detailed analysis
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onViewDetails}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all",
                gradeConfig.bgClass,
                gradeConfig.borderClass,
                gradeConfig.textClass,
                "hover:scale-105",
                isAnalyzing && "animate-pulse"
              )}
            >
              {isAnalyzing ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                <GradeIcon className={cn("w-4 h-4", gradeConfig.iconColor)} />
              )}
              <span className="text-sm font-bold">{qualityScore}</span>
              {totalIssues > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {totalIssues}
                </Badge>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-lg border transition-all",
              gradeConfig.bgClass,
              gradeConfig.borderClass,
              onViewDetails && "cursor-pointer hover:scale-[1.02]",
              isAnalyzing && "animate-pulse"
            )}
            onClick={onViewDetails}
          >
            {/* Icon and Score */}
            <div className="flex items-center gap-2">
              {isAnalyzing ? (
                <Activity className={cn("w-5 h-5 animate-spin", gradeConfig.iconColor)} />
              ) : (
                <GradeIcon className={cn("w-5 h-5", gradeConfig.iconColor)} />
              )}
              <div className="flex flex-col">
                <span className={cn("text-sm font-bold", gradeConfig.textClass)}>
                  {qualityScore}/100
                </span>
                <span className="text-xs opacity-70">{gradeConfig.grade}</span>
              </div>
            </div>

            {/* Issues Summary */}
            {totalIssues > 0 && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium">
                      {totalIssues} {totalIssues === 1 ? 'Issue' : 'Issues'}
                    </span>
                    <div className="flex items-center gap-1 text-xs opacity-70">
                      {criticalIssues > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          {criticalIssues}
                        </span>
                      )}
                      {majorIssues > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                          {majorIssues}
                        </span>
                      )}
                      {minorIssues > 0 && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                          {minorIssues}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Trend Indicator */}
            {showTrend && trend && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-1">
                  <TrendIcon 
                    className={cn(
                      "w-4 h-4",
                      trend === 'improving' && "text-green-600",
                      trend === 'declining' && "text-red-600",
                      trend === 'stable' && "text-gray-600"
                    )} 
                  />
                </div>
              </>
            )}

            {/* View Details Button */}
            {onViewDetails && !isAnalyzing && (
              <>
                <div className="h-8 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails();
                  }}
                >
                  Details
                </Button>
              </>
            )}

            {/* Analyzing State */}
            {isAnalyzing && (
              <>
                <div className="h-8 w-px bg-border" />
                <span className="text-xs opacity-70">Analyzing...</span>
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ConsistencyCheckerIndicator;
