import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface StatisticsPanelProps {
  stats: {
    totalTerms: number;
    validTerms: number;
    reviewTerms: number;
    criticalTerms: number;
    qualityScore: number;
    confidenceMin: number;
    confidenceMax: number;
  };
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ stats }) => {
  const validPercentage = stats.totalTerms > 0 ? (stats.validTerms / stats.totalTerms) * 100 : 0;
  const reviewPercentage = stats.totalTerms > 0 ? (stats.reviewTerms / stats.totalTerms) * 100 : 0;
  const criticalPercentage = stats.totalTerms > 0 ? (stats.criticalTerms / stats.totalTerms) * 100 : 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 overflow-auto">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-600">Valid</span>
            </div>
            <div className="text-2xl font-bold">{stats.validTerms}</div>
            <div className="text-xs text-muted-foreground">{validPercentage.toFixed(1)}%</div>
          </div>

          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-xs font-medium text-yellow-600">Review</span>
            </div>
            <div className="text-2xl font-bold">{stats.reviewTerms}</div>
            <div className="text-xs text-muted-foreground">{reviewPercentage.toFixed(1)}%</div>
          </div>

          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-600">Critical</span>
            </div>
            <div className="text-2xl font-bold">{stats.criticalTerms}</div>
            <div className="text-xs text-muted-foreground">{criticalPercentage.toFixed(1)}%</div>
          </div>

          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Total</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalTerms}</div>
            <div className="text-xs text-muted-foreground">terms</div>
          </div>
        </div>

        {/* Quality Score with Confidence Range */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quality Score</span>
            <span className="text-lg font-bold">{stats.qualityScore.toFixed(2)}/10.0</span>
          </div>
          <Progress value={stats.qualityScore * 10} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Range: {stats.confidenceMin.toFixed(1)} - {stats.confidenceMax.toFixed(1)}</span>
            <span className="text-[10px]">95% CI</span>
          </div>
        </div>

        {/* Current Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Current Status</h4>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs w-16 text-green-600">Valid</span>
              <Progress value={validPercentage} className="flex-1 h-2 bg-green-500/20" />
              <span className="text-xs w-12 text-right font-mono">{validPercentage.toFixed(0)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs w-16 text-yellow-600">Review</span>
              <Progress value={reviewPercentage} className="flex-1 h-2 bg-yellow-500/20" />
              <span className="text-xs w-12 text-right font-mono">{reviewPercentage.toFixed(0)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs w-16 text-red-600">Critical</span>
              <Progress value={criticalPercentage} className="flex-1 h-2 bg-red-500/20" />
              <span className="text-xs w-12 text-right font-mono">{criticalPercentage.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
