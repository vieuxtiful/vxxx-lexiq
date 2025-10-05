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
  if (!text || text.length < 10) return 'en';
  
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
  
  // Check for Japanese characters
  if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text)) {
    return 'ja';
  }
  
  // Weighted language patterns
  const patterns = {
    de: {
      words: /\b(der|die|das|und|ist|mit|für|auf|eine?|nicht|sich|auch|werden?|haben?|sein|werden|können|sollen|müssen)\b/g,
      endings: /\b\w*(ung|keit|schaft|lich|ig|isch)\b/g,
      chars: /ä|ö|ü|ß/g,
      weight: 1.0
    },
    en: {
      words: /\b(the|and|is|with|for|on|an?|not|also|will|have|be|can|should|must|would|could)\b/g,
      endings: /\b\w*(ing|tion|ly|al|ic|ive|ous)\b/g,
      chars: /[^a-z]/g,
      weight: 1.0
    }
  };
  
  let scores = { de: 0, en: 0 };
  const words = cleanText.split(/\s+/).filter(w => w.length > 2);
  
  Object.entries(patterns).forEach(([lang, pattern]) => {
    const wordMatches = cleanText.match(pattern.words) || [];
    const endingMatches = cleanText.match(pattern.endings) || [];
    const charMatches = cleanText.match(pattern.chars) || [];
    
    scores[lang] = (wordMatches.length * 2 + endingMatches.length * 1.5 + charMatches.length) * pattern.weight;
  });
  
  // Normalize by word count
  Object.keys(scores).forEach(lang => {
    scores[lang] = scores[lang] / Math.max(1, words.length);
  });
  
  if (scores.de > 0.1 && scores.de > scores.en) return 'de';
  if (scores.en > 0.1 && scores.en > scores.de) return 'en';
  
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
    
    // Fixed logic: Only bypass if confidence is very low (<0.3) or if it matches
    // This ensures mismatches with confidence >= 0.3 trigger the dialog
    const isMixedContent = !isMatch && confidence >= 0.4 && confidence < 0.6;
    const canProceed = isMatch || confidence < 0.3;
    
    console.log('🚦 Validation decision:', {
      isMatch,
      confidence,
      canProceed,
      reason: canProceed ? 
        (isMatch ? 'Language matches' : 'Detection confidence too low (<0.3)') :
        'Language mismatch detected with sufficient confidence'
    });

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
