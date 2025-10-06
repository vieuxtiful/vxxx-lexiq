import { AnalyzedTerm, AnalysisStatistics } from '@/hooks/useAnalysisEngine';

export interface BenchmarkTestCase {
  id: string;
  source: string;
  target: string;
  expected_issues: string[];
  error_type: string;
  severity: string;
  language: string;
  domain: string;
}

export interface BenchmarkResult {
  test_id: string;
  detected: boolean;
  issues_found: string[];
  processing_time_ms: number;
  correct: boolean;
  false_positive: boolean;
  false_negative: boolean;
}

export interface BenchmarkMetrics {
  total_tests: number;
  true_positives: number;
  true_negatives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
  accuracy: number;
  avg_processing_time_ms: number;
  by_error_type: Record<string, {
    total: number;
    detected: number;
    missed: number;
    detection_rate: number;
  }>;
}

export interface CompetitorResult {
  test_id: string;
  detected: boolean;
  issues_found: string[];
  processing_time_ms: number;
}

export interface ComparisonResult {
  lexiq: BenchmarkMetrics;
  errorspy?: BenchmarkMetrics;
  verifika?: BenchmarkMetrics;
  winner: {
    precision: string;
    recall: string;
    f1_score: string;
    speed: string;
  };
}

/**
 * Calculate benchmark metrics from test results
 */
export function calculateMetrics(
  testCases: BenchmarkTestCase[],
  results: BenchmarkResult[]
): BenchmarkMetrics {
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let totalProcessingTime = 0;
  
  const byErrorType: Record<string, { total: number; detected: number; missed: number }> = {};

  results.forEach(result => {
    const testCase = testCases.find(tc => tc.id === result.test_id);
    if (!testCase) return;

    const hasExpectedIssues = testCase.expected_issues.length > 0;
    
    if (result.detected && hasExpectedIssues) {
      truePositives++;
    } else if (!result.detected && !hasExpectedIssues) {
      trueNegatives++;
    } else if (result.detected && !hasExpectedIssues) {
      falsePositives++;
    } else if (!result.detected && hasExpectedIssues) {
      falseNegatives++;
    }

    totalProcessingTime += result.processing_time_ms;

    // Track by error type
    if (hasExpectedIssues) {
      const errorType = testCase.error_type;
      if (!byErrorType[errorType]) {
        byErrorType[errorType] = { total: 0, detected: 0, missed: 0 };
      }
      byErrorType[errorType].total++;
      if (result.detected) {
        byErrorType[errorType].detected++;
      } else {
        byErrorType[errorType].missed++;
      }
    }
  });

  const precision = truePositives + falsePositives > 0
    ? truePositives / (truePositives + falsePositives)
    : 0;
  
  const recall = truePositives + falseNegatives > 0
    ? truePositives / (truePositives + falseNegatives)
    : 0;
  
  const f1Score = precision + recall > 0
    ? 2 * (precision * recall) / (precision + recall)
    : 0;
  
  const accuracy = results.length > 0
    ? (truePositives + trueNegatives) / results.length
    : 0;

  // Calculate detection rates by error type
  const byErrorTypeWithRates: Record<string, {
    total: number;
    detected: number;
    missed: number;
    detection_rate: number;
  }> = {};

  Object.entries(byErrorType).forEach(([type, data]) => {
    byErrorTypeWithRates[type] = {
      ...data,
      detection_rate: data.total > 0 ? data.detected / data.total : 0
    };
  });

  return {
    total_tests: results.length,
    true_positives: truePositives,
    true_negatives: trueNegatives,
    false_positives: falsePositives,
    false_negatives: falseNegatives,
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    f1_score: Math.round(f1Score * 100) / 100,
    accuracy: Math.round(accuracy * 100) / 100,
    avg_processing_time_ms: results.length > 0 
      ? Math.round(totalProcessingTime / results.length) 
      : 0,
    by_error_type: byErrorTypeWithRates
  };
}

/**
 * Convert analyzed terms to benchmark result
 */
export function convertToBenchmarkResult(
  testCase: BenchmarkTestCase,
  analyzedTerms: AnalyzedTerm[],
  processingTimeMs: number
): BenchmarkResult {
  const issuesFound = analyzedTerms
    .filter(term => term.classification !== 'valid')
    .map(term => `${term.classification}: ${term.text} - ${term.rationale}`);

  const detected = issuesFound.length > 0;
  const expectedIssues = testCase.expected_issues.length > 0;

  return {
    test_id: testCase.id,
    detected,
    issues_found: issuesFound,
    processing_time_ms: processingTimeMs,
    correct: (detected && expectedIssues) || (!detected && !expectedIssues),
    false_positive: detected && !expectedIssues,
    false_negative: !detected && expectedIssues
  };
}

/**
 * Compare LexiQ results with competitor tools
 */
export function compareWithCompetitors(
  testCases: BenchmarkTestCase[],
  lexiqResults: BenchmarkResult[],
  errorspyResults?: CompetitorResult[],
  verifikaResults?: CompetitorResult[]
): ComparisonResult {
  const lexiqMetrics = calculateMetrics(testCases, lexiqResults);

  let errorspyMetrics: BenchmarkMetrics | undefined;
  let verifikaMetrics: BenchmarkMetrics | undefined;

  if (errorspyResults) {
    const errorspyBenchmarkResults = errorspyResults.map(r => ({
      ...r,
      correct: false,
      false_positive: false,
      false_negative: false
    }));
    errorspyMetrics = calculateMetrics(testCases, errorspyBenchmarkResults);
  }

  if (verifikaResults) {
    const verifikaBenchmarkResults = verifikaResults.map(r => ({
      ...r,
      correct: false,
      false_positive: false,
      false_negative: false
    }));
    verifikaMetrics = calculateMetrics(testCases, verifikaBenchmarkResults);
  }

  // Determine winners
  const competitors = [
    { name: 'LexiQ', metrics: lexiqMetrics },
    errorspyMetrics && { name: 'ErrorSpy', metrics: errorspyMetrics },
    verifikaMetrics && { name: 'Verifika', metrics: verifikaMetrics }
  ].filter(Boolean) as { name: string; metrics: BenchmarkMetrics }[];

  const winner = {
    precision: competitors.reduce((max, c) => 
      c.metrics.precision > max.metrics.precision ? c : max
    ).name,
    recall: competitors.reduce((max, c) => 
      c.metrics.recall > max.metrics.recall ? c : max
    ).name,
    f1_score: competitors.reduce((max, c) => 
      c.metrics.f1_score > max.metrics.f1_score ? c : max
    ).name,
    speed: competitors.reduce((min, c) => 
      c.metrics.avg_processing_time_ms < min.metrics.avg_processing_time_ms ? c : min
    ).name
  };

  return {
    lexiq: lexiqMetrics,
    errorspy: errorspyMetrics,
    verifika: verifikaMetrics,
    winner
  };
}

/**
 * Generate detailed benchmark report
 */
export function generateReport(comparison: ComparisonResult): string {
  let report = '# LexiQ Benchmark Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += '## Overall Metrics\n\n';
  report += '| Tool | Precision | Recall | F1 Score | Accuracy | Avg Speed (ms) |\n';
  report += '|------|-----------|--------|----------|----------|----------------|\n';
  report += `| LexiQ | ${(comparison.lexiq.precision * 100).toFixed(1)}% | ${(comparison.lexiq.recall * 100).toFixed(1)}% | ${(comparison.lexiq.f1_score * 100).toFixed(1)}% | ${(comparison.lexiq.accuracy * 100).toFixed(1)}% | ${comparison.lexiq.avg_processing_time_ms} |\n`;
  
  if (comparison.errorspy) {
    report += `| ErrorSpy | ${(comparison.errorspy.precision * 100).toFixed(1)}% | ${(comparison.errorspy.recall * 100).toFixed(1)}% | ${(comparison.errorspy.f1_score * 100).toFixed(1)}% | ${(comparison.errorspy.accuracy * 100).toFixed(1)}% | ${comparison.errorspy.avg_processing_time_ms} |\n`;
  }
  
  if (comparison.verifika) {
    report += `| Verifika | ${(comparison.verifika.precision * 100).toFixed(1)}% | ${(comparison.verifika.recall * 100).toFixed(1)}% | ${(comparison.verifika.f1_score * 100).toFixed(1)}% | ${(comparison.verifika.accuracy * 100).toFixed(1)}% | ${comparison.verifika.avg_processing_time_ms} |\n`;
  }
  
  report += '\n## Winners\n\n';
  report += `- **Precision**: ${comparison.winner.precision}\n`;
  report += `- **Recall**: ${comparison.winner.recall}\n`;
  report += `- **F1 Score**: ${comparison.winner.f1_score}\n`;
  report += `- **Speed**: ${comparison.winner.speed}\n\n`;
  
  report += '## Detection Rates by Error Type (LexiQ)\n\n';
  report += '| Error Type | Total | Detected | Missed | Detection Rate |\n';
  report += '|------------|-------|----------|--------|----------------|\n';
  
  Object.entries(comparison.lexiq.by_error_type).forEach(([type, data]) => {
    report += `| ${type} | ${data.total} | ${data.detected} | ${data.missed} | ${(data.detection_rate * 100).toFixed(1)}% |\n`;
  });
  
  report += '\n## Confusion Matrix (LexiQ)\n\n';
  report += `- True Positives: ${comparison.lexiq.true_positives}\n`;
  report += `- True Negatives: ${comparison.lexiq.true_negatives}\n`;
  report += `- False Positives: ${comparison.lexiq.false_positives}\n`;
  report += `- False Negatives: ${comparison.lexiq.false_negatives}\n`;
  
  return report;
}

/**
 * Export results to JSON
 */
export function exportResultsJSON(comparison: ComparisonResult): string {
  return JSON.stringify(comparison, null, 2);
}

/**
 * Export results to CSV
 */
export function exportResultsCSV(
  testCases: BenchmarkTestCase[],
  results: BenchmarkResult[]
): string {
  let csv = 'Test ID,Source,Target,Expected Issues,Detected,Issues Found,Processing Time (ms),Correct\n';
  
  results.forEach(result => {
    const testCase = testCases.find(tc => tc.id === result.test_id);
    if (!testCase) return;
    
    csv += `"${result.test_id}","${testCase.source}","${testCase.target}","${testCase.expected_issues.join('; ')}",${result.detected},"${result.issues_found.join('; ')}",${result.processing_time_ms},${result.correct}\n`;
  });
  
  return csv;
}
