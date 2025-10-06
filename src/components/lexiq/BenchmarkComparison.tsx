import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Download, Trophy, Target, Zap, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  BenchmarkTestCase,
  BenchmarkResult,
  BenchmarkMetrics,
  ComparisonResult,
  calculateMetrics,
  compareWithCompetitors,
  generateReport,
  exportResultsJSON,
  exportResultsCSV
} from '@/utils/benchmarkRunner';

interface BenchmarkComparisonProps {
  testCases: BenchmarkTestCase[];
  lexiqResults: BenchmarkResult[];
  onRunBenchmark?: () => void;
}

export const BenchmarkComparison = ({ 
  testCases, 
  lexiqResults,
  onRunBenchmark
}: BenchmarkComparisonProps) => {
  const { toast } = useToast();
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (lexiqResults.length > 0) {
      // For now, just calculate LexiQ metrics
      // Users can manually add competitor results to compare
      const result = compareWithCompetitors(testCases, lexiqResults);
      setComparison(result);
    }
  }, [testCases, lexiqResults]);

  const downloadReport = (format: 'json' | 'csv' | 'markdown') => {
    if (!comparison) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'json':
        content = exportResultsJSON(comparison);
        filename = 'lexiq-benchmark-results.json';
        mimeType = 'application/json';
        break;
      case 'csv':
        content = exportResultsCSV(testCases, lexiqResults);
        filename = 'lexiq-benchmark-results.csv';
        mimeType = 'text/csv';
        break;
      case 'markdown':
        content = generateReport(comparison);
        filename = 'lexiq-benchmark-report.md';
        mimeType = 'text/markdown';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Report downloaded",
      description: `Benchmark results exported as ${format.toUpperCase()}`,
    });
  };

  const renderMetricsCard = (title: string, metrics: BenchmarkMetrics, color: string) => (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {comparison?.winner && (
          <div className="flex gap-1">
            {comparison.winner.precision === title && <Trophy className="w-4 h-4 text-yellow-500" />}
            {comparison.winner.recall === title && <Target className="w-4 h-4 text-blue-500" />}
            {comparison.winner.f1_score === title && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {comparison.winner.speed === title && <Zap className="w-4 h-4 text-purple-500" />}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Precision</div>
          <div className="text-2xl font-bold" style={{ color }}>{(metrics.precision * 100).toFixed(1)}%</div>
          <Progress value={metrics.precision * 100} className="mt-2" />
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Recall</div>
          <div className="text-2xl font-bold" style={{ color }}>{(metrics.recall * 100).toFixed(1)}%</div>
          <Progress value={metrics.recall * 100} className="mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">F1 Score</div>
          <div className="text-xl font-bold">{(metrics.f1_score * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Accuracy</div>
          <div className="text-xl font-bold">{(metrics.accuracy * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Avg Speed</div>
          <div className="text-xl font-bold">{metrics.avg_processing_time_ms}ms</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-muted-foreground">TP:</span>
          <span className="font-semibold">{metrics.true_positives}</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4 text-gray-500" />
          <span className="text-muted-foreground">TN:</span>
          <span className="font-semibold">{metrics.true_negatives}</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="w-4 h-4 text-orange-500" />
          <span className="text-muted-foreground">FP:</span>
          <span className="font-semibold">{metrics.false_positives}</span>
        </div>
        <div className="flex items-center gap-1">
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-muted-foreground">FN:</span>
          <span className="font-semibold">{metrics.false_negatives}</span>
        </div>
      </div>
    </Card>
  );

  const renderErrorTypeBreakdown = (metrics: BenchmarkMetrics) => (
    <div className="space-y-3">
      {Object.entries(metrics.by_error_type).map(([type, data]) => (
        <Card key={type} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{type}</Badge>
              <span className="text-sm text-muted-foreground">
                {data.detected}/{data.total} detected
              </span>
            </div>
            <div className="text-lg font-semibold">
              {(data.detection_rate * 100).toFixed(1)}%
            </div>
          </div>
          <Progress value={data.detection_rate * 100} />
          {data.missed > 0 && (
            <div className="flex items-center gap-1 mt-2 text-sm text-orange-600">
              <AlertCircle className="w-3 h-3" />
              <span>{data.missed} missed</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );

  const renderTestResults = () => (
    <div className="space-y-2 max-h-[600px] overflow-y-auto">
      {lexiqResults.map(result => {
        const testCase = testCases.find(tc => tc.id === result.test_id);
        if (!testCase) return null;

        return (
          <Card key={result.test_id} className={`p-4 ${
            result.correct ? 'border-green-500/20' : 'border-red-500/20'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {result.correct ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <div className="font-mono text-sm text-muted-foreground">{result.test_id}</div>
                  <div className="text-sm font-semibold">{testCase.domain} - {testCase.error_type}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={result.false_positive ? "destructive" : result.false_negative ? "destructive" : "secondary"}>
                  {result.false_positive ? "False Positive" : result.false_negative ? "False Negative" : "Correct"}
                </Badge>
                <span className="text-xs text-muted-foreground">{result.processing_time_ms}ms</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-2">
              <div>
                <div className="text-muted-foreground mb-1">Source:</div>
                <div className="font-mono text-xs bg-muted p-2 rounded">{testCase.source}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Target:</div>
                <div className="font-mono text-xs bg-muted p-2 rounded">{testCase.target}</div>
              </div>
            </div>

            {testCase.expected_issues.length > 0 && (
              <div className="text-sm mb-2">
                <div className="text-muted-foreground mb-1">Expected Issues:</div>
                <div className="flex flex-wrap gap-1">
                  {testCase.expected_issues.map((issue, idx) => (
                    <Badge key={idx} variant="outline">{issue}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.issues_found.length > 0 && (
              <div className="text-sm">
                <div className="text-muted-foreground mb-1">LexiQ Detected:</div>
                <div className="space-y-1">
                  {result.issues_found.map((issue, idx) => (
                    <div key={idx} className="text-xs bg-muted p-2 rounded">{issue}</div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );

  if (!comparison) {
    return (
      <Card className="p-8 text-center">
        <div className="mb-4">
          <Trophy className="w-16 h-16 mx-auto text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Benchmark Results Yet</h3>
        <p className="text-muted-foreground mb-4">
          Run the benchmark test suite to compare LexiQ's performance with industry standards.
        </p>
        {onRunBenchmark && (
          <Button onClick={onRunBenchmark}>Run Benchmark Tests</Button>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Benchmark Comparison</h2>
          <p className="text-muted-foreground">
            LexiQ vs Industry-Leading QA Tools
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => downloadReport('json')}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => downloadReport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => downloadReport('markdown')}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Error Type Breakdown</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="comparison">Head-to-Head</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {renderMetricsCard("LexiQ", comparison.lexiq, "#22c55e")}
          {comparison.errorspy && renderMetricsCard("ErrorSpy", comparison.errorspy, "#3b82f6")}
          {comparison.verifika && renderMetricsCard("Verifika", comparison.verifika, "#a855f7")}
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Detection Rates by Error Type</h3>
            {renderErrorTypeBreakdown(comparison.lexiq)}
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Individual Test Results ({lexiqResults.length} tests)
            </h3>
            {renderTestResults()}
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Head-to-Head Comparison</h3>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Winners
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Best Precision:</span>
                    <Badge>{comparison.winner.precision}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Best Recall:</span>
                    <Badge>{comparison.winner.recall}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Best F1 Score:</span>
                    <Badge>{comparison.winner.f1_score}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">Fastest:</span>
                    <Badge>{comparison.winner.speed}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Competitive Advantages</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 p-2 bg-muted rounded">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">AI-Powered Analysis</div>
                      <div className="text-muted-foreground text-xs">
                        Context-aware semantic understanding
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted rounded">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Real-time Processing</div>
                      <div className="text-muted-foreground text-xs">
                        Instant feedback as you type
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 bg-muted rounded">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">Comprehensive Checks</div>
                      <div className="text-muted-foreground text-xs">
                        Grammar, spelling, numbers, tags, whitespace
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(!comparison.errorspy && !comparison.verifika) && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Add Competitor Results
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  To enable full comparison, manually run the benchmark test corpus through ErrorSpy and Verifika,
                  then update the competitor-results.json file.
                </p>
                <p className="text-xs text-muted-foreground">
                  Location: scripts/benchmark-tests/competitor-results.json
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
