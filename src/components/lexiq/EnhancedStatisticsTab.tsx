import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, AlertCircle, CheckCircle, Target, PieChart, BarChart3, TrendingDown } from 'lucide-react';
import { AnalysisStatistics } from '@/hooks/useAnalysisEngine';

interface EnhancedStatisticsTabProps {
  statistics: AnalysisStatistics;
}

export const EnhancedStatisticsTab: React.FC<EnhancedStatisticsTabProps> = ({ statistics }) => {
  const validPercentage = statistics.totalTerms > 0 ? (statistics.validTerms / statistics.totalTerms) * 100 : 0;
  const reviewPercentage = statistics.totalTerms > 0 ? (statistics.reviewTerms / statistics.totalTerms) * 100 : 0;
  const criticalPercentage = statistics.totalTerms > 0 ? (statistics.criticalTerms / statistics.totalTerms) * 100 : 0;
  
  // Calculate additional metrics
  const successRate = validPercentage;
  const riskScore = (reviewPercentage * 0.5 + criticalPercentage * 1.0).toFixed(1);
  const qualityGrade = statistics.qualityScore >= 8 ? 'A' : statistics.qualityScore >= 7 ? 'B' : statistics.qualityScore >= 6 ? 'C' : statistics.qualityScore >= 5 ? 'D' : 'F';
  
  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold mb-2">LQA Analysis</h2>
        <p className="text-muted-foreground">Comprehensive statistical evaluation of terminology consistency and quality</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Quality Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.qualityScore.toFixed(2)}</div>
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
            <div className="text-3xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{statistics.validTerms} valid terms</div>
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
            <div className="text-3xl font-bold text-yellow-600">{riskScore}%</div>
            <div className="text-xs text-muted-foreground mt-1">Needs attention</div>
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
            <div className="text-3xl font-bold">{statistics.totalTerms}</div>
            <div className="text-xs text-muted-foreground mt-1">Analyzed</div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Term Classification Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Valid Terms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Valid Terms</span>
              </div>
              <span className="text-sm font-mono">{statistics.validTerms} ({validPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={validPercentage} className="h-3 bg-green-100" />
            <p className="text-xs text-muted-foreground">
              Terms that match the glossary with high confidence. These represent consistent and accurate translations.
            </p>
          </div>

          {/* Review Terms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Review Required</span>
              </div>
              <span className="text-sm font-mono">{statistics.reviewTerms} ({reviewPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={reviewPercentage} className="h-3 bg-yellow-100" />
            <p className="text-xs text-muted-foreground">
              Terms with minor inconsistencies or variations. Manual review recommended for context-specific validation.
            </p>
          </div>

          {/* Critical Terms */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="font-medium">Critical Issues</span>
              </div>
              <span className="text-sm font-mono">{statistics.criticalTerms} ({criticalPercentage.toFixed(1)}%)</span>
            </div>
            <Progress value={criticalPercentage} className="h-3 bg-red-100" />
            <p className="text-xs text-muted-foreground">
              Significant deviations from glossary or potential translation errors. Immediate attention required.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Interval Analysis */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Confidence Interval
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">95% Confidence Range</span>
                <span className="text-sm font-mono">{statistics.confidenceMin.toFixed(2)} - {statistics.confidenceMax.toFixed(2)}</span>
              </div>
              <Progress value={(statistics.qualityScore / 10) * 100} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">
              Statistical confidence interval indicating the reliability of the quality score. Narrower ranges indicate higher measurement precision.
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Lower Bound:</span>
                <span className="font-mono">{statistics.confidenceMin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Mean Score:</span>
                <span className="font-mono font-semibold">{statistics.qualityScore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Upper Bound:</span>
                <span className="font-mono">{statistics.confidenceMax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Interval Width:</span>
                <span className="font-mono">{(statistics.confidenceMax - statistics.confidenceMin).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Quality Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statistics.qualityScore >= 8 && (
              <div className="p-3 rounded bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                <div className="font-medium text-green-900 dark:text-green-100">Excellent Quality</div>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Translation maintains high terminology consistency. Consider it ready for publication.
                </p>
              </div>
            )}
            
            {statistics.qualityScore >= 6 && statistics.qualityScore < 8 && (
              <div className="p-3 rounded bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                <div className="font-medium text-yellow-900 dark:text-yellow-100">Good Quality</div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Review the flagged terms for potential improvements. Minor adjustments may enhance consistency.
                </p>
              </div>
            )}
            
            {statistics.qualityScore < 6 && (
              <div className="p-3 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                <div className="font-medium text-red-900 dark:text-red-100">Needs Improvement</div>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Significant terminology issues detected. Review and correction of critical terms is essential.
                </p>
              </div>
            )}

            <div className="pt-3 space-y-2 border-t">
              <div className="text-xs font-medium">Action Items:</div>
              {statistics.criticalTerms > 0 && (
                <div className="text-xs flex items-start gap-2">
                  <span className="text-red-600">•</span>
                  <span>Address {statistics.criticalTerms} critical term{statistics.criticalTerms !== 1 ? 's' : ''}</span>
                </div>
              )}
              {statistics.reviewTerms > 0 && (
                <div className="text-xs flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  <span>Review {statistics.reviewTerms} flagged term{statistics.reviewTerms !== 1 ? 's' : ''}</span>
                </div>
              )}
              {statistics.validTerms === statistics.totalTerms && (
                <div className="text-xs flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  <span>All terms validated successfully</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
