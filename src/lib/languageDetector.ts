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
  const sample = text.slice(0, 500).toLowerCase();
  
  // Check for specific character ranges (non-Latin scripts)
  if (/[\u4e00-\u9fff]/.test(sample)) return 'zh'; // Chinese
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) return 'ja'; // Japanese
  if (/[\uac00-\ud7af]/.test(sample)) return 'ko'; // Korean
  if (/[\u0400-\u04ff]/.test(sample)) return 'ru'; // Russian
  if (/[\u0600-\u06ff]/.test(sample)) return 'ar'; // Arabic
  if (/[\u0e00-\u0e7f]/.test(sample)) return 'th'; // Thai
  if (/[\u0590-\u05ff]/.test(sample)) return 'he'; // Hebrew
  if (/[\u0900-\u097f]/.test(sample)) return 'hi'; // Hindi
  
  // Detect Latin-script languages by common words/patterns
  // German indicators
  const germanPatterns = /\b(das|die|der|und|ist|sind|mit|für|auf|bei|von|zu|den|dem|des|ein|eine|einem|eines)\b/g;
  const germanMatches = (sample.match(germanPatterns) || []).length;
  
  // French indicators
  const frenchPatterns = /\b(le|la|les|un|une|des|et|est|sont|dans|pour|avec|sur|par|ce|cette|qui|que)\b/g;
  const frenchMatches = (sample.match(frenchPatterns) || []).length;
  
  // Spanish indicators
  const spanishPatterns = /\b(el|la|los|las|un|una|y|es|son|en|con|por|para|de|del|que|está|están)\b/g;
  const spanishMatches = (sample.match(spanishPatterns) || []).length;
  
  // Determine language by highest match count
  const maxMatches = Math.max(germanMatches, frenchMatches, spanishMatches);
  if (maxMatches >= 3) { // Need at least 3 matches to be confident
    if (germanMatches === maxMatches) return 'de';
    if (frenchMatches === maxMatches) return 'fr';
    if (spanishMatches === maxMatches) return 'es';
  }
  
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
    
    // Show dialog for mismatches with reasonable confidence (>0.5)
    // Only auto-proceed if match OR confidence is very low (<0.5)
    const isMixedContent = !isMatch && confidence >= 0.4 && confidence < 0.6;
    const canProceed = isMatch || confidence < 0.5;

    let message = '';
    if (!isMatch) {
      if (isMixedContent) {
        message = `Mixed language content detected (${(confidence * 100).toFixed(0)}% confidence). Expected ${getLanguageName(expectedLanguage)}, but detected ${getLanguageName(detectedLang)}. The content may contain multiple languages or technical terms, which can affect translation quality.`;
      } else if (confidence >= 0.8) {
        message = `High confidence (${(confidence * 100).toFixed(0)}%) that content is in ${getLanguageName(detectedLang)}, but expected ${getLanguageName(expectedLanguage)}. This may affect translation quality.`;
      } else if (confidence >= 0.6) {
        message = `Medium confidence (${(confidence * 100).toFixed(0)}%) that content is in ${getLanguageName(detectedLang)}. Expected ${getLanguageName(expectedLanguage)}. You may proceed with caution.`;
      } else {
        message = `Low confidence (${(confidence * 100).toFixed(0)}%) in language detection. Expected ${getLanguageName(expectedLanguage)}. The content language is unclear.`;
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
