import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Search, TrendingUp, FileText, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lexiqApi } from '@/lib/lexiqApiClient';

interface TMMatch {
  source: string;
  target: string;
  similarity: number;
  origin: string;
  domain?: string;
}

interface TMStats {
  total_terms: number;
  by_classification: Record<string, number>;
  by_domain: Record<string, number>;
  by_language: Record<string, number>;
  average_score: number;
  average_confidence: number;
}

export const TMPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [threshold, setThreshold] = useState(70);
  const [matches, setMatches] = useState<TMMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState<TMStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const statistics = await lexiqApi.getStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load TM stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a search query',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      setMatches([]);
      toast({
        title: 'Not Implemented',
        description: 'TM search is not available in this build.',
      });
    } catch (error) {
      console.error('TM search failed:', error);
      toast({
        title: 'Search Failed',
        description: 'Could not search Translation Memory',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.95) return 'text-green-600';
    if (similarity >= 0.85) return 'text-blue-600';
    if (similarity >= 0.75) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getSimilarityBadge = (similarity: number) => {
    if (similarity >= 0.95) return 'bg-green-500';
    if (similarity >= 0.85) return 'bg-blue-500';
    if (similarity >= 0.75) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          <strong>Translation Memory</strong> - Search for similar translations and leverage previous work.
        </AlertDescription>
      </Alert>

      {/* TM Statistics */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              TM Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{stats.total_terms}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Languages</p>
                <p className="text-2xl font-bold">{Object.keys(stats.by_language).length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Domains</p>
                <p className="text-2xl font-bold">{Object.keys(stats.by_domain).length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Score</p>
                <p className="text-2xl font-bold">{stats.average_score.toFixed(2)}</p>
              </div>
            </div>

            {Object.keys(stats.by_language).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Languages:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.by_language).map(([lang, count]) => (
                    <Badge key={lang} variant="outline">
                      {lang}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Translation Memory
          </CardTitle>
          <CardDescription>Find similar translations from your TM database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-query">Source Text</Label>
            <Input
              id="search-query"
              placeholder="Enter source text to search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source-lang">Source Language</Label>
              <Input
                id="source-lang"
                placeholder="e.g., en"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-lang">Target Language</Label>
              <Input
                id="target-lang"
                placeholder="e.g., es"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Threshold ({threshold}%)</Label>
              <Input
                id="threshold"
                type="range"
                min="50"
                max="100"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={isSearching} className="w-full">
            {isSearching ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search TM
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Search Results */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Search Results ({matches.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matches.map((match, index) => (
              <Card key={index} className="border">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getSimilarityBadge(match.similarity)}>
                      {(match.similarity * 100).toFixed(0)}% Match
                    </Badge>
                    <Badge variant="outline">{match.origin}</Badge>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Source</p>
                      <p className="text-sm">{match.source}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Target</p>
                      <p className="text-sm font-medium">{match.target}</p>
                    </div>
                    {match.domain && (
                      <Badge variant="secondary" className="mt-2">
                        {match.domain}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload TMX */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload TMX File
          </CardTitle>
          <CardDescription>Import Translation Memory from TMX format</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> TMX upload functionality will be available in the next update.
              Currently, TM entries are created automatically from validated translations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
