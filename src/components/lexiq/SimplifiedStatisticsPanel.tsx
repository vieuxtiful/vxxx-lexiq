import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle, AlertCircle, PieChart, BarChart3, TrendingDown } from 'lucide-react';
import { AnalysisStatistics } from '@/hooks/useAnalysisEngine';

interface SimplifiedStatisticsPanelProps {
  statistics: AnalysisStatistics;
}

export const SimplifiedStatisticsPanel: React.FC<SimplifiedStatisticsPanelProps> = ({ statistics }) => {
  const validPercentage = statistics.totalTerms > 0 ? (statistics.validTerms / statistics.totalTerms) * 100 : 0;
  const reviewPercentage = statistics.totalTerms > 0 ? (statistics.reviewTerms / statistics.totalTerms) * 100 : 0;
  const criticalPercentage = statistics.totalTerms > 0 ? (statistics.criticalTerms / statistics.totalTerms) * 100 : 0;
  
  // Calculate additional metrics
  const successRate = validPercentage;
  const riskScore = (reviewPercentage * 0.5 + criticalPercentage * 1.0).toFixed(1);
  const qualityGrade = statistics.qualityScore >= 8 ? 'A' : statistics.qualityScore >= 7 ? 'B' : statistics.qualityScore >= 6 ? 'C' : statistics.qualityScore >= 5 ? 'D' : 'F';
  
  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.qualityScore.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">Grade: {qualityGrade}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{statistics.validTerms} valid</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Risk Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{riskScore}%</div>
            <div className="text-xs text-muted-foreground mt-1">Attention</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Total Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalTerms}</div>
            <div className="text-xs text-muted-foreground mt-1">Analyzed</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Spelling Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.spellingIssues ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {(statistics.spellingIssues ?? 0) === 0 ? 'Perfect' : 'Needs review'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              Grammar Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{statistics.grammarIssues ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {(statistics.grammarIssues ?? 0) === 0 ? 'Perfect' : 'Needs attention'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Term Classification Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Valid Terms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Valid Terms</span>
              </div>
              <span className="text-xs font-mono">{statistics.validTerms} ({validPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={validPercentage} className="h-2 bg-green-100" />
            <p className="text-xs text-muted-foreground">
              Terms that match the glossary with high confidence.
            </p>
          </div>

          {/* Review Terms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Review Required</span>
              </div>
              <span className="text-xs font-mono">{statistics.reviewTerms} ({reviewPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={reviewPercentage} className="h-2 bg-yellow-100" />
            <p className="text-xs text-muted-foreground">
              Terms with minor inconsistencies or variations.
            </p>
          </div>

          {/* Critical Terms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Critical Issues</span>
              </div>
              <span className="text-xs font-mono">{statistics.criticalTerms} ({criticalPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={criticalPercentage} className="h-2 bg-red-100" />
            <p className="text-xs text-muted-foreground">
              Significant deviations requiring immediate attention.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};