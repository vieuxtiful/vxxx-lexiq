import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple language detection function for server-side fallback
function detectLanguageSimple(text: string): string {
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

// Call the detect-language edge function for AI-based detection
async function detectLanguageAI(text: string): Promise<{ language: string; confidence: number } | null> {
  try {
    const sample = text.slice(0, 1000);
    
    // Call the existing detect-language edge function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/detect-language`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ text: sample }),
    });

    if (!response.ok) {
      console.warn('AI language detection failed, falling back to simple detection');
      return null;
    }

    const result = await response.json();
    return {
      language: result.language,
      confidence: result.confidence
    };
  } catch (error) {
    console.warn('AI language detection error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      fileName, 
      fileContent, 
      fileSize, 
      type: fileType,
      expectedLanguage // NEW: Expected project language
    } = await req.json();

    if (!fileName || !fileContent) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${fileType} file: ${fileName}, size: ${fileSize} bytes`);
    if (expectedLanguage) {
      console.log(`Expected language: ${expectedLanguage}`);
    }

    // Extract text content based on file type
    let content = '';
    const lowerFileName = fileName.toLowerCase();

    if (lowerFileName.endsWith('.txt')) {
      content = fileContent;
    } else if (lowerFileName.endsWith('.csv')) {
      // Parse CSV content
      const lines = fileContent.split('\n').filter((line: string) => line.trim());
      content = lines.join('\n');
    } else {
      // For other formats (.docx, .pdf, .xlsx), use content as-is
      // In production, you'd use specialized libraries
      content = fileContent;
    }

    // Basic preprocessing
    const normalized = content
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .trim();

    console.log(`Successfully processed file, extracted ${normalized.length} characters`);

    // NEW: Language detection if expected language is provided
    let languageDetection: {
      detected: string;
      confidence: number;
      method: 'ai' | 'simple';
      isMatch?: boolean;
    } | undefined;

    if (expectedLanguage && normalized.length > 50) {
      console.log('🔍 Performing server-side language detection...');
      
      // Try AI-based detection first
      const aiResult = await detectLanguageAI(normalized);
      
      if (aiResult) {
        languageDetection = {
          detected: aiResult.language,
          confidence: aiResult.confidence,
          method: 'ai',
          isMatch: aiResult.language === expectedLanguage
        };
        console.log(`🤖 AI detection: ${aiResult.language} (${(aiResult.confidence * 100).toFixed(1)}% confidence)`);
      } else {
        // Fallback to simple detection
        const simpleResult = detectLanguageSimple(normalized);
        languageDetection = {
          detected: simpleResult,
          confidence: 0.6, // Default confidence for simple detection
          method: 'simple',
          isMatch: simpleResult === expectedLanguage
        };
        console.log(`🔤 Simple detection: ${simpleResult} (fallback)`);
      }
      
      console.log(`📊 Language match: ${languageDetection.isMatch ? '✅' : '❌'}`);
    }

    const response = {
      content: normalized,
      fileName,
      fileSize,
      characterCount: normalized.length,
      wordCount: normalized.split(/\s+/).length,
      // NEW: Include language detection results
      languageDetection
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to process file' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
