import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';
import { HotMatchBadgeProps } from '@/types/hotMatch';

export const HotMatchBadge: React.FC<HotMatchBadgeProps> = ({ 
  percentage, 
  term,
  size = 'sm',
  showIcon = true 
}) => {
  const getBadgeColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    if (pct >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
    if (pct >= 40) return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
    return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'lg':
        return 'text-sm px-3 py-1.5';
      case 'md':
        return 'text-xs px-2.5 py-1';
      case 'sm':
      default:
        return 'text-xs px-2 py-0.5';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'lg':
        return 'h-4 w-4';
      case 'md':
        return 'h-3.5 w-3.5';
      case 'sm':
      default:
        return 'h-3 w-3';
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`${getBadgeColor(percentage)} ${getSizeClasses()} font-medium inline-flex items-center gap-1 transition-all hover:scale-105`}
      title={`${percentage.toFixed(1)}% of users prefer "${term}" in this context`}
    >
      {showIcon && <Flame className={`${getIconSize()} animate-pulse`} />}
      {percentage.toFixed(0)}% Hot Match
    </Badge>
  );
};
