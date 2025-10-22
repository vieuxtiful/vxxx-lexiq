import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HotMatchBadge } from './HotMatchBadge';
import { HotMatchTooltipProps } from '@/types/hotMatch';
import { ArrowRight } from 'lucide-react';

export const HotMatchTooltip: React.FC<HotMatchTooltipProps> = ({ 
  term, 
  hotMatchData,
  children 
}) => {
  if (!hotMatchData) {
    return <>{children}</>;
  }

  const currentPercentage = hotMatchData.percentages[term] || 0;
  const alternatives = hotMatchData.interchangeableTerms.filter(t => t !== term);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-sm p-4 space-y-3"
          sideOffset={5}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm">Current Term:</span>
              <HotMatchBadge 
                percentage={currentPercentage} 
                term={term}
                size="sm"
              />
            </div>
            
            {alternatives.length > 0 && (
              <>
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    Alternative Terms:
                  </p>
                  <div className="space-y-2">
                    {alternatives.map(altTerm => {
                      const altPercentage = hotMatchData.percentages[altTerm] || 0;
                      return (
                        <div 
                          key={altTerm} 
                          className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded"
                        >
                          <div className="flex items-center gap-1.5">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium">{altTerm}</span>
                          </div>
                          <HotMatchBadge 
                            percentage={altPercentage} 
                            term={altTerm}
                            size="sm"
                            showIcon={false}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> These terms are interchangeable in the <strong>{hotMatchData.domain}</strong> domain.
                  </p>
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
