import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermData {
  id: string;
  currentTerm: string;
  targetTerm: string;
  classification: 'valid' | 'review' | 'critical' | 'spelling';
  score: number;
  frequency: number;
  context: string;
}

interface DataPanelProps {
  data: TermData[];
}

export const DataPanel: React.FC<DataPanelProps> = ({ data }) => {
  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'valid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'review':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'spelling':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-600 font-semibold';
    if (score >= 4) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5" />
          Term Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-auto group hover-scrollbar">
          <Table className="min-w-max">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="min-w-[180px]">Current Term</TableHead>
                  <TableHead className="min-w-[180px]">Target Term</TableHead>
                  <TableHead className="min-w-[120px]">Classification</TableHead>
                  <TableHead className="min-w-[80px] text-right">Score</TableHead>
                  <TableHead className="min-w-[80px] text-right">Hits</TableHead>
                  <TableHead className="min-w-[300px]">Context</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No terminology data available. Upload files to begin analysis.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((term) => (
                  <TableRow key={term.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{term.currentTerm}</TableCell>
                    <TableCell className="text-primary">{term.targetTerm}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getClassificationColor(term.classification)}
                      >
                        {term.classification}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getScoreColor(term.score)}>
                        {term.score.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">{term.frequency}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {term.context}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
