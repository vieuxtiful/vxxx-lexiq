import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  translationContent: string;
  glossaryContent: string;
  language: string;
  domain: string;
  checkGrammar?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { translationContent, glossaryContent, language, domain, checkGrammar = false } = await req.json() as AnalysisRequest;

    console.log(`Starting analysis: language=${language}, domain=${domain}, checkGrammar=${checkGrammar}`);
    console.log(`Translation length: ${translationContent.length}, Glossary length: ${glossaryContent.length}`);

    // Validate input sizes to prevent truncation issues
    if (translationContent.length > 5000) {
      console.error(`Translation too large: ${translationContent.length} characters`);
      return new Response(
        JSON.stringify({ error: "Translation text is too large. Please use chunking for files over 5,000 characters." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Streamlined efficient prompt
    const prompt = `Analyze translation against glossary. Return compact JSON.

Language: ${language} | Domain: ${domain}${checkGrammar ? ' | Grammar: ON' : ''}

GLOSSARY:
${glossaryContent}

TEXT:
${translationContent}

RULES:
1. Find glossary terms in text only (don't analyze terms not in glossary)
2. Classifications:
   - valid: Exact match to glossary
   - review: Similar/variant (plurals, conjugations)
   - critical: Wrong term or missing from glossary
   - spelling: Obvious typo${checkGrammar ? `
   - grammar: Grammar error` : ''}

3. Keep ALL strings brief (context max 40 chars, note max 20 chars)
4. ALL text fields in ${language}
5. Only return terms found in text

JSON (minified):
{
  "terms": [
    {
      "text": "term",
      "pos": [start, end],
      "class": "valid|review|critical|spelling",
      "score": 0-100,
      "ctx": "brief context",
      "note": "brief reason",
      "sugg": ["alt1", "alt2"]
    }
  ],
  "stats": {
    "total": num,
    "valid": num,
    "review": num,
    "critical": num,
    "quality": 0-100
  }
}

CRITICAL: Return ONLY terms found in text. Keep response minimal.`;

    // Call Lovable AI with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
    
    console.log("Calling Lovable AI API...");
    
    let response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `Return compact minified JSON only. No markdown. Brief text fields. All content in ${language}.` },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 40000,
        }),
      });
      clearTimeout(timeoutId);
      console.log("AI API responded with status:", response.status);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("AI API timeout after 90 seconds");
        throw new Error("Analysis timeout - please try with smaller files");
      }
      console.error("AI API fetch error:", fetchError);
      throw fetchError;
    }

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Too many requests - please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to your Lovable workspace to continue analysis." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    console.log("Parsing AI response...");
    let aiResponse;
    try {
      aiResponse = await response.json();
      console.log("AI response structure received, extracting content...");
    } catch (jsonError) {
      console.error("Failed to parse AI response as JSON:", jsonError);
      throw new Error("Invalid JSON response from AI gateway");
    }

    const content = aiResponse.choices?.[0]?.message?.content;
    console.log(`Content extracted, length: ${content?.length || 0}`);

    if (!content) {
      console.error("AI response structure:", JSON.stringify(aiResponse).substring(0, 500));
      throw new Error("No content in AI response");
    }

    // Check for response size issues
    if (content.length > 50000) {
      console.warn(`Large response detected: ${content.length} chars - may indicate truncation risk`);
    }

    // Parse JSON response with robust markdown stripping
    let analysisResult;
    let cleanContent = content.trim();
    
    // Remove markdown code blocks if present
    if (cleanContent.startsWith('```')) {
      console.log("Detected markdown code block, stripping...");
      // Find the first newline after the opening ```
      const firstNewline = cleanContent.indexOf('\n');
      if (firstNewline !== -1) {
        cleanContent = cleanContent.substring(firstNewline + 1);
      }
      
      // Remove the closing ```
      const lastTripleBacktick = cleanContent.lastIndexOf('```');
      if (lastTripleBacktick !== -1) {
        cleanContent = cleanContent.substring(0, lastTripleBacktick);
      }
      
      cleanContent = cleanContent.trim();
    }
    
    // SOLUTION 1: Enhanced JSON sanitization to handle malformed AI responses
    console.log("Applying comprehensive JSON sanitization...");
    
    // Remove trailing commas before closing brackets/braces
    cleanContent = cleanContent.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove extra newlines between JSON elements
    cleanContent = cleanContent.replace(/\n\s*\n/g, '\n');
    
    // Normalize whitespace around colons and commas (but preserve strings)
    cleanContent = cleanContent.replace(/:\s+/g, ':').replace(/,\s+/g, ',');
    
    console.log(`Attempting to parse cleaned content (${cleanContent.length} chars)...`);
    
    // Check for truncated JSON (unterminated strings are common sign)
    if (cleanContent.length > 10000 && !cleanContent.endsWith('}')) {
      console.error("Response appears truncated - doesn't end with '}'");
      throw new Error(`AI response was truncated (${cleanContent.length} chars). The text may be too long. Try analyzing smaller sections (500-1000 words at a time) or simplify the glossary to reduce analysis complexity.`);
    }
    
    try {
      analysisResult = JSON.parse(cleanContent);
      console.log("Successfully parsed AI response");
      console.log(`Terms found: ${analysisResult.terms?.length || 0}`);
      console.log(`Statistics present: ${!!analysisResult.stats || !!analysisResult.statistics}`);
      
      // Handle both old and new field names
      if (!analysisResult.terms || !Array.isArray(analysisResult.terms)) {
        throw new Error("Invalid response structure: missing or invalid 'terms' array");
      }
      
      // Normalize stats field (accept both 'stats' and 'statistics')
      if (!analysisResult.stats && !analysisResult.statistics) {
        throw new Error("Invalid response structure: missing statistics");
      }
      if (analysisResult.stats && !analysisResult.statistics) {
        analysisResult.statistics = {
          totalTerms: analysisResult.stats.total,
          validTerms: analysisResult.stats.valid,
          reviewTerms: analysisResult.stats.review,
          criticalTerms: analysisResult.stats.critical,
          qualityScore: analysisResult.stats.quality,
          confidenceMin: 0,
          confidenceMax: 100,
          coverage: analysisResult.stats.coverage
        };
      }
      
      // Normalize term fields - simplified without semantic types
      analysisResult.terms = analysisResult.terms.map((term: any) => ({
        text: term.text,
        startPosition: Array.isArray(term.pos) ? term.pos[0] : term.startPosition,
        endPosition: Array.isArray(term.pos) ? term.pos[1] : term.endPosition,
        classification: term.class || term.classification,
        score: term.score,
        frequency: term.freq || term.frequency || 1,
        context: term.ctx || term.context || '',
        rationale: term.note || term.rationale || '',
        suggestions: term.sugg || term.suggestions || [],
        grammar_issues: term.gram_issues || []
      }));
      
    } catch (parseError) {
      console.error("Initial parse failed, attempting aggressive cleanup...");
      console.error("Parse error:", parseError);
      console.error("First 1000 chars:", cleanContent.substring(0, 1000));
      console.error("Last 500 chars:", cleanContent.substring(Math.max(0, cleanContent.length - 500)));
      
      // SOLUTION 1: Fallback parsing - strip ALL newlines as last resort
      try {
        const aggressiveClean = cleanContent.replace(/\n/g, '').replace(/\s+/g, ' ');
        console.log("Trying aggressive cleanup (no newlines)...");
        analysisResult = JSON.parse(aggressiveClean);
        console.log("Aggressive cleanup succeeded!");
        
        // Simplified normalization for fallback
        analysisResult.terms = analysisResult.terms.map((term: any) => ({
          text: term.text,
          startPosition: Array.isArray(term.pos) ? term.pos[0] : term.startPosition,
          endPosition: Array.isArray(term.pos) ? term.pos[1] : term.endPosition,
          classification: term.class || term.classification,
          score: term.score,
          frequency: term.freq || term.frequency || 1,
          context: term.ctx || term.context || '',
          rationale: term.note || term.rationale || '',
          suggestions: term.sugg || term.suggestions || [],
          grammar_issues: term.gram_issues || []
        }));
        
      } catch (secondError) {
        // Both parsing attempts failed
        console.error("Aggressive cleanup also failed:", secondError);
        
        // Provide specific guidance based on error type
        if (parseError instanceof Error && parseError.message.includes('Unterminated')) {
          throw new Error("Response was truncated due to size. Please use smaller files or analyze in sections.");
        }
        throw new Error(`JSON parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
    }

    console.log(`Analysis complete: ${analysisResult.terms.length} terms, quality score: ${analysisResult.statistics.qualityScore}`);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
