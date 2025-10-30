import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, AlertCircle, FileCheck, Database, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ValidationResults {
  consistency?: any;
  structural?: any;
  customRules?: any;
  tmConsistency?: any;
  grammar?: any;
  spelling?: any;
}

interface EnhancedResultsDisplayProps {
  results: ValidationResults;
  onExport?: () => void;
}

export const EnhancedResultsDisplay: React.FC<EnhancedResultsDisplayProps> = ({ results, onExport }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate statistics
  const getTotalIssues = () => {
    let total = 0;
    if (results.consistency?.issues) total += results.consistency.issues.length;
    if (results.structural?.issues) total += results.structural.issues.length;
    if (results.customRules?.violations) total += results.customRules.violations.length;
    if (results.tmConsistency?.issues) total += results.tmConsistency.issues.length;
    if (results.grammar) total += results.grammar.length || 0;
    if (results.spelling) total += results.spelling.length || 0;
    return total;
  };

  const getIssuesBySeverity = () => {
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    
    const countSeverity = (items: any[]) => {
      items?.forEach((item: any) => {
        const severity = item.severity || 'medium';
        if (severity in severityCounts) {
          severityCounts[severity as keyof typeof severityCounts]++;
        }
      });
    };

    countSeverity(results.consistency?.issues || []);
    countSeverity(results.structural?.issues || []);
    countSeverity(results.customRules?.violations || []);
    countSeverity(results.tmConsistency?.issues || []);

    return severityCounts;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const totalIssues = getTotalIssues();
  const issuesBySeverity = getIssuesBySeverity();

  return (
    <div className="space-y-4">
      {/* Overview Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Validation Summary
            </span>
            {onExport && (
              <Button size="sm" variant="outline" onClick={onExport}>
                Export Report
              </Button>
            )}
          </CardTitle>
          <CardDescription>Comprehensive quality analysis results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Issues</p>
              <p className="text-3xl font-bold">{totalIssues}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-3xl font-bold text-red-600">{issuesBySeverity.critical}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">High</p>
              <p className="text-3xl font-bold text-orange-600">{issuesBySeverity.high}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Medium</p>
              <p className="text-3xl font-bold text-yellow-600">{issuesBySeverity.medium}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low</p>
              <p className="text-3xl font-bold text-blue-600">{issuesBySeverity.low}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="consistency">Consistency</TabsTrigger>
          <TabsTrigger value="structural">Structural</TabsTrigger>
          <TabsTrigger value="custom">Custom Rules</TabsTrigger>
          <TabsTrigger value="tm">TM</TabsTrigger>
          <TabsTrigger value="language">Language</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Issues by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.consistency?.issues?.length > 0 && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Consistency Issues</span>
                  </div>
                  <Badge>{results.consistency.issues.length}</Badge>
                </div>
              )}
              {results.structural?.issues?.length > 0 && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Structural Issues</span>
                  </div>
                  <Badge>{results.structural.issues.length}</Badge>
                </div>
              )}
              {results.customRules?.violations?.length > 0 && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <span className="font-medium">Custom Rule Violations</span>
                  </div>
                  <Badge>{results.customRules.violations.length}</Badge>
                </div>
              )}
              {results.tmConsistency?.issues?.length > 0 && (
                <div className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">TM Inconsistencies</span>
                  </div>
                  <Badge>{results.tmConsistency.issues.length}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {totalIssues === 0 && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Excellent!</strong> No quality issues detected. Your translation meets all validation criteria.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Consistency Tab */}
        <TabsContent value="consistency" className="space-y-3">
          {results.consistency?.issues?.length > 0 ? (
            results.consistency.issues.map((issue: any, index: number) => (
              <Card key={index}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                    <Badge variant="outline">{issue.type}</Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{issue.message || issue.rationale}</p>
                  {issue.expected && (
                    <p className="text-sm text-muted-foreground">Expected: {issue.expected}</p>
                  )}
                  {issue.found && (
                    <p className="text-sm text-muted-foreground">Found: {issue.found}</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No consistency issues found</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Structural Tab */}
        <TabsContent value="structural" className="space-y-3">
          {results.structural?.issues?.length > 0 ? (
            results.structural.issues.map((issue: any, index: number) => (
              <Card key={index}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                    <Badge variant="outline">{issue.type}</Badge>
                  </div>
                  <p className="text-sm font-medium">{issue.message}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No structural issues found</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Custom Rules Tab */}
        <TabsContent value="custom" className="space-y-3">
          {results.customRules?.violations?.length > 0 ? (
            results.customRules.violations.map((violation: any, index: number) => (
              <Card key={index}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getSeverityColor(violation.severity)}>{violation.severity}</Badge>
                    <Badge variant="outline">{violation.rule_name}</Badge>
                  </div>
                  <p className="text-sm font-medium">{violation.message}</p>
                  {violation.matched_text && (
                    <p className="text-sm text-muted-foreground mt-1">Match: &quot;{violation.matched_text}&quot;</p>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No custom rule violations found</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* TM Tab */}
        <TabsContent value="tm" className="space-y-3">
          {results.tmConsistency?.issues?.length > 0 ? (
            results.tmConsistency.issues.map((issue: any, index: number) => (
              <Card key={index}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                    <Badge variant="outline">{(issue.similarity * 100).toFixed(0)}% Match</Badge>
                  </div>
                  <p className="text-sm font-medium mb-2">{issue.rationale}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">TM Translation:</p>
                    <p className="text-sm">{issue.tm_translation}</p>
                    <p className="text-xs text-muted-foreground mt-2">Current Translation:</p>
                    <p className="text-sm">{issue.current_translation}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No TM inconsistencies found</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Language Tab (Grammar/Spelling) */}
        <TabsContent value="language" className="space-y-3">
          {(results.grammar?.length > 0 || results.spelling?.length > 0) ? (
            <>
              {results.grammar?.map((issue: any, index: number) => (
                <Card key={`grammar-${index}`}>
                  <CardContent className="py-4">
                    <Badge className="bg-red-500 mb-2">Grammar</Badge>
                    <p className="text-sm">{issue.message || 'Grammar issue detected'}</p>
                  </CardContent>
                </Card>
              ))}
              {results.spelling?.map((issue: any, index: number) => (
                <Card key={`spelling-${index}`}>
                  <CardContent className="py-4">
                    <Badge className="bg-orange-500 mb-2">Spelling</Badge>
                    <p className="text-sm">{issue.message || 'Spelling issue detected'}</p>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>No grammar or spelling issues found</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
