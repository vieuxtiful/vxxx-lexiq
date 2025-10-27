import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Enhanced AI language detection prompt
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('LLM_MODEL') || Deno.env.get('DEFAULT_LLM_MODEL') || 'llm/default',
        messages: [
          {
            role: 'system',
            content: `You are a language detection expert. Analyze the text and determine:
1) PRIMARY language (ISO 639-1 code)
2) Confidence level (0-1 scale)
3) Whether content is mixed-language
4) Secondary language if mixed

Guidelines:
- For mixed content, identify the PRIMARY language based on grammatical structure and sentence patterns, not just vocabulary
- Technical terms, proper nouns, and code snippets should not heavily influence the primary language decision
- If content is genuinely mixed (e.g., German sentences with English technical terms), set isMixed: true
- For mixed content, assign confidence between 0.4-0.7 depending on how clear the primary language is
- Even if uncertain, provide your best assessment with appropriate confidence
- Never return confidence below 0.3 unless the text is completely unidentifiable

Return ONLY valid JSON (no markdown, no code blocks):
{"language":"en","confidence":0.65,"isMixed":false,"secondaryLanguage":null,"suggestions":[{"language":"en","confidence":0.65}]}`
          },
          {
            role: 'user',
            content: `Detect the language of this text:\n\n${text.slice(0, 1000)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Language detection failed');
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Enhanced JSON cleaning
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    }
    
    content = content.trim().replace(/^["']|["']$/g, '');
    
    try {
      const result = JSON.parse(content);
      
      // Validate and enhance fields
      if (typeof result.language !== 'string') {
        throw new Error('Invalid language field');
      }
      if (typeof result.confidence !== 'number') {
        result.confidence = parseFloat(result.confidence) || 0.5;
      }
      if (result.confidence < 0.3) {
        console.log('Adjusting low confidence to minimum threshold');
        result.confidence = 0.3;
      }
      if (typeof result.isMixed !== 'boolean') {
        result.isMixed = false;
      }
      
      console.log('Enhanced language detection result:', {
        detected: result.language,
        confidence: result.confidence,
        isMixed: result.isMixed,
        secondaryLanguage: result.secondaryLanguage,
        textLength: text.length,
        textPreview: text.substring(0, 100) + '...'
      });

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Enhanced JSON parsing error:', parseError, 'Content:', content);
      
      // Enhanced fallback
      const fallbackResult = {
        language: 'en',
        confidence: 0.5,
        isMixed: text.length > 100,
        secondaryLanguage: null,
        suggestions: [{ language: 'en', confidence: 0.5 }]
      };
      
      return new Response(
        JSON.stringify(fallbackResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in detect-language function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
