import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { HotMatchBadge } from './HotMatchBadge';
import { HotMatchDialogProps } from '@/types/hotMatch';
import { Flame, Info } from 'lucide-react';

export const HotMatchDialog: React.FC<HotMatchDialogProps> = ({ 
  hotMatchData, 
  onTermSelect, 
  onSkip,
  isVisible 
}) => {
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  const handleConfirm = () => {
    if (selectedTerm) {
      const rejectedTerms = hotMatchData.interchangeableTerms.filter(t => t !== selectedTerm);
      onTermSelect(selectedTerm, rejectedTerms);
      setSelectedTerm('');
    }
  };

  const handleSkip = () => {
    setSelectedTerm('');
    onSkip();
  };

  // Sort terms by percentage (highest first)
  const sortedTerms = [...hotMatchData.interchangeableTerms].sort((a, b) => {
    const percentA = hotMatchData.percentages[a] || 0;
    const percentB = hotMatchData.percentages[b] || 0;
    return percentB - percentA;
  });

  return (
    <AlertDialog open={isVisible}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500 animate-pulse" />
            Hot Match Detected!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Multiple interchangeable terms detected for <strong>"{hotMatchData.baseTerm}"</strong> in the <strong>{hotMatchData.domain}</strong> domain.
            <br />
            Which term do you prefer in this context?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-3 my-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Hot Match percentages show how often other LexiQ users chose each term. Your selection helps improve recommendations for everyone.
            </p>
          </div>

          <RadioGroup value={selectedTerm} onValueChange={setSelectedTerm}>
            {sortedTerms.map(term => {
              const percentage = hotMatchData.percentages[term] || 0;
              const isDetected = term === hotMatchData.detectedTerm;
              
              return (
                <div 
                  key={term} 
                  className={`flex items-center justify-between p-4 border rounded-lg transition-all cursor-pointer hover:bg-accent ${
                    selectedTerm === term ? 'border-primary bg-accent' : 'border-border'
                  } ${isDetected ? 'ring-2 ring-amber-400 dark:ring-amber-600' : ''}`}
                  onClick={() => setSelectedTerm(term)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <RadioGroupItem value={term} id={`term-${term}`} />
                    <Label 
                      htmlFor={`term-${term}`} 
                      className="font-medium text-base cursor-pointer flex items-center gap-2"
                    >
                      {term}
                      {isDetected && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700">
                          Currently Used
                        </span>
                      )}
                    </Label>
                  </div>
                  <HotMatchBadge 
                    percentage={percentage} 
                    term={term}
                    size="md"
                  />
                </div>
              );
            })}
          </RadioGroup>

          {/* Context Preview */}
          {hotMatchData.context && (
            <div className="mt-4 p-3 bg-muted rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Context:</p>
              <p className="text-sm italic">"{hotMatchData.context.substring(0, 150)}..."</p>
            </div>
          )}

          {/* Confidence Indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Detection Confidence: {(hotMatchData.confidence * 100).toFixed(0)}%</span>
            <span>Domain: {hotMatchData.domain} | Language: {hotMatchData.language}</span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkip}>
            Skip for Now
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            disabled={!selectedTerm}
            className="bg-primary hover:bg-primary/90"
          >
            Confirm Selection
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
