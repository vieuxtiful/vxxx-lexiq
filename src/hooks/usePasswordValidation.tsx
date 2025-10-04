import { useMemo } from 'react';

export interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChar: boolean;
}

export interface PasswordValidation {
  isValid: boolean;
  requirements: PasswordRequirements;
  strength: 'weak' | 'medium' | 'strong';
}

export const usePasswordValidation = () => {
  const validatePassword = (password: string): PasswordValidation => {
    const requirements: PasswordRequirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const metRequirements = Object.values(requirements).filter(Boolean).length;
    const isValid = metRequirements === 5;
    
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    if (metRequirements >= 5) strength = 'strong';
    else if (metRequirements >= 3) strength = 'medium';
    
    return {
      isValid,
      requirements,
      strength
    };
  };

  return { validatePassword };
};
