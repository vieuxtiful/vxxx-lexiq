import React from 'react';
import { AlertTriangle, Globe, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getLanguageName } from '@/lib/languageDetector';

interface LanguageMismatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onContinue: () => void;
  validation: {
    isMatch: boolean;
    expectedLanguage: string;
    detectedLanguage: string;
    confidence: number;
    message: string;
    isMixed?: boolean;
    secondaryLanguage?: string;
  };
  contentType?: 'file' | 'translation' | 'text';
  fileName?: string;
}

export const LanguageMismatchDialog: React.FC<LanguageMismatchDialogProps> = ({
  isOpen,
  onClose,
  onCancel,
  onContinue,
  validation,
  contentType = 'text',
  fileName
}) => {
  const { expectedLanguage, detectedLanguage, confidence, message, isMixed, secondaryLanguage } = validation;
  const confidencePercent = Math.round(confidence * 100);
  
  // Determine severity based on confidence
  const isHighConfidence = confidence >= 0.9;
  const isMediumConfidence = confidence >= 0.7 && confidence < 0.9;
  
  // Build detected languages display
  const detectedLanguagesDisplay = isMixed && secondaryLanguage
    ? `${getLanguageName(detectedLanguage)}, ${getLanguageName(secondaryLanguage)}`
    : getLanguageName(detectedLanguage);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-6 w-6 ${isHighConfidence ? 'text-destructive' : 'text-yellow-600'}`} />
            <AlertDialogTitle>Language Mismatch Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 pt-4">
            {/* File name if provided */}
            {fileName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">File:</span>
                <code className="px-2 py-1 bg-muted rounded text-foreground">{fileName}</code>
              </div>
            )}

            {/* Language comparison */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Expected Language
                </div>
                <Badge variant="outline" className="text-base">
                  {getLanguageName(expectedLanguage)}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Detected Language{isMixed ? 's' : ''}
                </div>
                <Badge 
                  variant={isHighConfidence ? 'destructive' : 'secondary'}
                  className="text-base"
                >
                  {detectedLanguagesDisplay}
                </Badge>
              </div>
            </div>

            {/* Confidence indicator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Detection Confidence</span>
                <span className="font-medium">{confidencePercent}%</span>
              </div>
              <Progress 
                value={confidencePercent} 
                className={`h-2 ${isHighConfidence ? 'bg-destructive/20' : isMediumConfidence ? 'bg-yellow-600/20' : 'bg-muted'}`}
              />
            </div>

            {/* Warning message */}
            <div className="flex gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  {message}
                </p>
                <p className="text-yellow-800 dark:text-yellow-200">
                  {isHighConfidence ? (
                    <>
                      <strong>Recommendation:</strong> We strongly recommend canceling and checking your {contentType === 'file' ? 'file' : 'content'}. 
                      Analysis accuracy may be significantly reduced if you continue.
                    </>
                  ) : (
                    <>
                      Analysis may be less accurate if the language is incorrect. 
                      Please verify your {contentType === 'file' ? 'file' : 'content'} language before proceeding.
                    </>
                  )}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel & Review
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className={isHighConfidence ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
