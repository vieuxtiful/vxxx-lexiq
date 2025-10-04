import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, FileText, Languages, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsMetrics {
  totalAnalyses: number;
  avgQualityScore: number;
  totalGrammarIssues: number;
  topLanguage: string;
  avgProcessingTime: number;
  qualityTrend: { date: string; score: number }[];
  languageDistribution: { name: string; value: number }[];
  issueCategories: { category: string; count: number }[];
}

export const AnalyticsDashboard: React.FC = () => {
  const { currentProject } = useProject();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentProject) {
      loadAnalytics();
    }
  }, [currentProject, dateRange]);

  const loadAnalytics = async () => {
    if (!currentProject) return;

    setLoading(true);
    try {
      let query = supabase
        .from('analysis_sessions')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      // Apply date range filter
      if (dateRange !== 'all') {
        const daysAgo = dateRange === '7d' ? 7 : 30;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      const { data: sessions, error } = await query;
      if (error) throw error;

      const analytics = calculateMetrics(sessions || []);
      setMetrics(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (sessions: any[]): AnalyticsMetrics => {
    if (sessions.length === 0) {
      return {
        totalAnalyses: 0,
        avgQualityScore: 0,
        totalGrammarIssues: 0,
        topLanguage: 'N/A',
        avgProcessingTime: 0,
        qualityTrend: [],
        languageDistribution: [],
        issueCategories: []
      };
    }

    const totalAnalyses = sessions.length;
    const qualityScores = sessions.map(s => s.statistics?.qualityScore || 0);
    const avgQualityScore = Math.round(qualityScores.reduce((a, b) => a + b, 0) / totalAnalyses);

    // Count grammar issues
    const totalGrammarIssues = sessions.reduce((total, session) => {
      const grammarCount = session.analyzed_terms?.filter((t: any) => 
        t.classification === 'grammar_issue'
      ).length || 0;
      return total + grammarCount;
    }, 0);

    // Language distribution
    const languageCounts: Record<string, number> = {};
    sessions.forEach(s => {
      languageCounts[s.language] = (languageCounts[s.language] || 0) + 1;
    });

    const languageDistribution = Object.entries(languageCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topLanguage = languageDistribution[0]?.name || 'N/A';

    // Quality trend (last 10 sessions)
    const qualityTrend = sessions
      .slice(0, 10)
      .reverse()
      .map((s, idx) => ({
        date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: s.statistics?.qualityScore || 0
      }));

    // Average processing time
    const processingTimes = sessions.map(s => s.processing_time || 0).filter(t => t > 0);
    const avgProcessingTime = processingTimes.length > 0
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 0;

    // Issue categories
    const categoryCounts: Record<string, number> = {};
    sessions.forEach(s => {
      s.analyzed_terms?.forEach((term: any) => {
        if (term.classification) {
          categoryCounts[term.classification] = (categoryCounts[term.classification] || 0) + 1;
        }
      });
    });

    const issueCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAnalyses,
      avgQualityScore,
      totalGrammarIssues,
      topLanguage,
      avgProcessingTime,
      qualityTrend,
      languageDistribution,
      issueCategories
    };
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end gap-2">
        <Button
          variant={dateRange === '7d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('7d')}
        >
          Last 7 days
        </Button>
        <Button
          variant={dateRange === '30d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('30d')}
        >
          Last 30 days
        </Button>
        <Button
          variant={dateRange === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('all')}
        >
          All time
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAnalyses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sessions in selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quality Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgQualityScore}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall quality rating
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalGrammarIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Grammar & quality issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Language</CardTitle>
            <Languages className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.topLanguage}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Most analyzed language
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Trend */}
        {metrics.qualityTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Quality Score Trend</CardTitle>
              <CardDescription>Recent quality scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metrics.qualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Language Distribution */}
        {metrics.languageDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Language Distribution</CardTitle>
              <CardDescription>Analysis sessions by language</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={metrics.languageDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {metrics.languageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Issue Categories */}
        {metrics.issueCategories.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top Issue Categories</CardTitle>
              <CardDescription>Most common issue types found</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metrics.issueCategories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
