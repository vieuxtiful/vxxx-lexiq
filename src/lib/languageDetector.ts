import { supabase } from "@/integrations/supabase/client";

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  suggestions: Array<{ language: string; confidence: number }>;
}

export interface LanguageValidationResult {
  canProceed: boolean;
  detectedLanguage: string;
  validation: {
    isMatch: boolean;
    expectedLanguage: string;
    detectedLanguage: string;
    confidence: number;
    message: string;
  };
}

// Language name mapping for user-friendly display
const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'he': 'Hebrew',
  'hi': 'Hindi',
  'th': 'Thai',
  'tr': 'Turkish',
  'pl': 'Polish',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'no': 'Norwegian',
  'da': 'Danish',
  'fi': 'Finnish',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'ro': 'Romanian',
  'uk': 'Ukrainian',
  'el': 'Greek',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'tl': 'Tagalog',
};

/**
 * Get user-friendly language name from ISO code
 */
export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Detects the language of the given text using Lovable AI
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  try {
    // Extract a sample from the text (first 1000 characters for efficiency)
    const sample = text.slice(0, 1000);

    const { data, error } = await supabase.functions.invoke('detect-language', {
      body: { text: sample }
    });

    if (error) throw error;

    return data as LanguageDetectionResult;
  } catch (error) {
    console.error('Language detection error:', error);
    // Fallback to English if detection fails
    return {
      language: 'en',
      confidence: 0.5,
      suggestions: [{ language: 'en', confidence: 0.5 }]
    };
  }
}

/**
 * Analyzes text and suggests the most appropriate language based on character patterns
 * This is a simple client-side fallback that doesn't require AI
 */
export function detectLanguageSimple(text: string): string {
  // Simple heuristic-based detection
  const sample = text.slice(0, 500);

  // Check for specific character ranges
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh'; // Chinese
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return 'ja'; // Japanese
  if (/[\uac00-\ud7af]/.test(sample)) return 'ko'; // Korean
  if (/[\u0600-\u06ff]/.test(sample)) return 'ar'; // Arabic
  if (/[\u0590-\u05ff]/.test(sample)) return 'he'; // Hebrew
  if (/[\u0400-\u04ff]/.test(sample)) return 'ru'; // Cyrillic (Russian)
  if (/[\u0e00-\u0e7f]/.test(sample)) return 'th'; // Thai
  if (/[\u0900-\u097f]/.test(sample)) return 'hi'; // Hindi

  // Default to English for Latin scripts
  return 'en';
}

/**
 * Validates content language against expected project language
 * Returns whether the analysis can proceed and detailed validation results
 */
export async function validateContentLanguage(
  content: string,
  expectedLanguage: string
): Promise<LanguageValidationResult> {
  if (!content || content.trim().length < 50) {
    // Too short to validate
    return {
      canProceed: true,
      detectedLanguage: expectedLanguage,
      validation: {
        isMatch: true,
        expectedLanguage,
        detectedLanguage: expectedLanguage,
        confidence: 1,
        message: 'Content too short to validate'
      }
    };
  }

  try {
    // Use AI detection for accuracy
    const detection = await detectLanguage(content);
    const detectedLang = detection.language;
    const confidence = detection.confidence;

    const isMatch = detectedLang === expectedLanguage;
    
    console.log('🔍 Language Detection Result:', {
      detected: detectedLang,
      expected: expectedLanguage,
      confidence: (confidence * 100).toFixed(1) + '%',
      isMatch
    });
    
    // Show dialog for mismatches with reasonable confidence (>0.6)
    // Only auto-proceed if match OR confidence is very low (<0.6)
    const canProceed = isMatch || confidence < 0.6;

    let message = '';
    if (!isMatch) {
      if (confidence >= 0.9) {
        message = `Strong mismatch detected: Expected ${getLanguageName(expectedLanguage)}, but content appears to be ${getLanguageName(detectedLang)} (${(confidence * 100).toFixed(0)}% confidence)`;
      } else if (confidence >= 0.7) {
        message = `Possible mismatch: Expected ${getLanguageName(expectedLanguage)}, detected ${getLanguageName(detectedLang)} (${(confidence * 100).toFixed(0)}% confidence)`;
      } else {
        message = `Language unclear. Expected ${getLanguageName(expectedLanguage)}, detected ${getLanguageName(detectedLang)} (low confidence: ${(confidence * 100).toFixed(0)}%)`;
      }
    }

    return {
      canProceed,
      detectedLanguage: detectedLang,
      validation: {
        isMatch,
        expectedLanguage,
        detectedLanguage: detectedLang,
        confidence,
        message
      }
    };
  } catch (error) {
    console.error('❌ Language validation error:', error);
    
    // Try simple fallback detection
    const simpleLang = detectLanguageSimple(content);
    const isMatch = simpleLang === expectedLanguage;
    
    return {
      canProceed: isMatch, // Only proceed if simple detection matches
      detectedLanguage: simpleLang,
      validation: {
        isMatch,
        expectedLanguage,
        detectedLanguage: simpleLang,
        confidence: 0.5,
        message: isMatch 
          ? 'Validation used fallback detection (match found)' 
          : `Validation error: Expected ${getLanguageName(expectedLanguage)}, simple detection suggests ${getLanguageName(simpleLang)}`
      }
    };
  }
}
