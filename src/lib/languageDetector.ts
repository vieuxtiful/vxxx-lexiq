import { supabase } from "@/integrations/supabase/client";

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  suggestions: Array<{ language: string; confidence: number }>;
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
