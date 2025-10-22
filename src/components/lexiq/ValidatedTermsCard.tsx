import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

interface ValidatedTermsCardProps {
  validCount: number;
  reviewCount: number;
  criticalCount: number;
  className?: string;
  onClick?: () => void;
}

export const ValidatedTermsCard: React.FC<ValidatedTermsCardProps> = ({
  validCount,
  reviewCount,
  criticalCount,
  className = '',
  onClick,
}) => {
  const [hasHapticSupport, setHasHapticSupport] = useState(false);

  useEffect(() => {
    setHasHapticSupport('vibrate' in navigator);
  }, []);

  const handleClick = () => {
    // Trigger haptic feedback on click
    if (hasHapticSupport) {
      navigator.vibrate(30);
    }
    onClick?.();
  };

  const totalTerms = validCount + reviewCount + criticalCount;

  return (
    <Card
      className={`
        pop-hover cursor-pointer
        ${className}
      `}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`Validated terms summary: ${validCount} valid, ${reviewCount} review, ${criticalCount} critical`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          Validated Terms
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{totalTerms}</span>
            <span className="text-sm text-muted-foreground">Total Terms</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                Valid
              </Badge>
              <span className="text-sm font-medium">{validCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">
                Review
              </Badge>
              <span className="text-sm font-medium">{reviewCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Badge variant="destructive">
                Critical
              </Badge>
              <span className="text-sm font-medium">{criticalCount}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
