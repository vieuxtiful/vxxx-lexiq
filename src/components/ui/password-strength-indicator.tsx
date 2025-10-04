import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PasswordRequirements } from '@/hooks/usePasswordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  requirements: PasswordRequirements;
  strength: 'weak' | 'medium' | 'strong';
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  requirements,
  strength
}) => {
  if (!password) return null;

  const strengthColors = {
    weak: 'bg-destructive',
    medium: 'bg-warning',
    strong: 'bg-success'
  };

  const strengthWidth = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full'
  };

  const requirementsList = [
    { key: 'minLength', label: 'At least 8 characters', met: requirements.minLength },
    { key: 'hasUpperCase', label: 'One uppercase letter', met: requirements.hasUpperCase },
    { key: 'hasLowerCase', label: 'One lowercase letter', met: requirements.hasLowerCase },
    { key: 'hasNumbers', label: 'One number', met: requirements.hasNumbers },
    { key: 'hasSpecialChar', label: 'One special character', met: requirements.hasSpecialChar }
  ];

  return (
    <div className="space-y-3 mt-2">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            "font-medium capitalize",
            strength === 'weak' && "text-destructive",
            strength === 'medium' && "text-warning",
            strength === 'strong' && "text-success"
          )}>
            {strength}
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-300",
              strengthColors[strength],
              strengthWidth[strength]
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        {requirementsList.map((req) => (
          <div key={req.key} className="flex items-center gap-2 text-sm">
            {req.met ? (
              <Check className="h-4 w-4 text-success flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn(
              req.met ? "text-foreground" : "text-muted-foreground"
            )}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
