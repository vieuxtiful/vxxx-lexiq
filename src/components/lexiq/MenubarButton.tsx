import React, { useRef, MouseEvent } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';

interface MenubarButtonProps extends ButtonProps {
  children: React.ReactNode;
  withRadialPressure?: boolean;
}

export const MenubarButton: React.FC<MenubarButtonProps> = ({
  children,
  withRadialPressure = true,
  className = '',
  onMouseMove,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    if (withRadialPressure && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      buttonRef.current.style.setProperty('--mouse-x', `${x}%`);
      buttonRef.current.style.setProperty('--mouse-y', `${y}%`);
    }
    
    onMouseMove?.(e);
  };

  return (
    <Button
      ref={buttonRef}
      className={`
        menubar-inset-button
        ${withRadialPressure ? 'radial-pressure-hover' : ''}
        ${className}
      `}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {children}
    </Button>
  );
};
