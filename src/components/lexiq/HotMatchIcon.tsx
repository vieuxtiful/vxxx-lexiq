import React from 'react';
import { Flame } from 'lucide-react';

export interface HotMatchIconProps {
  color?: 'pink' | 'emerald' | 'amber' | 'sky' | 'gray';
  size?: number; // px
  className?: string;
}

const colorMap: Record<NonNullable<HotMatchIconProps['color']>, string> = {
  pink: 'text-pink-600',
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  sky: 'text-sky-600',
  gray: 'text-muted-foreground',
};

export const HotMatchIcon: React.FC<HotMatchIconProps> = ({ color = 'pink', size = 16, className }) => {
  const cls = `${colorMap[color]} ${className ?? ''}`.trim();
  return <Flame className={cls} style={{ width: size, height: size }} />;
};

export default HotMatchIcon;
