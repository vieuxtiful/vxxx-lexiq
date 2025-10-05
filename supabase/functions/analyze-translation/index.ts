import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Extract the full sentence containing a term
 */
function extractFullSentence(text: string, startPos: number, endPos: number): string {
  if (!text || startPos < 0 || endPos > text.length) {
    return text.substring(Math.max(0, startPos - 30), Math.min(text.length, endPos + 30)).trim();
  }

  // Find the start of the sentence
  let sentenceStart = startPos;
  for (let i = startPos; i >= 0; i--) {
    if (text[i] === '.' || text[i] === '!' || text[i] === '?' || text[i] === '\n') {
      sentenceStart = i + 1;
      break;
    }
    if (i === 0) {
      sentenceStart = 0;
      break;
    }
  }

  // Find the end of the sentence
  let sentenceEnd = endPos;
  for (let i = endPos; i < text.length; i++) {
    if (text[i] === '.' || text[i] === '!' || text[i] === '?' || text[i] === '\n') {
      sentenceEnd = i + 1;
      break;
    }
    if (i === text.length - 1) {
      sentenceEnd = text.length;
      break;
    }
  }

  let sentence = text.substring(sentenceStart, sentenceEnd).trim();
  
  // Clean up the sentence - remove extra whitespace
  sentence = sentence.replace(/\s+/g, ' ').trim();
  
  // If sentence is too long, provide a reasonable excerpt around the term
  if (sentence.length > 200) {
    const termLength = endPos - startPos;
    const targetContext = 100; // characters around the term
    
    let excerptStart = Math.max(0, startPos - targetContext);
    let excerptEnd = Math.min(text.length, endPos + targetContext);
    
    // Try to align with word boundaries
    while (excerptStart > 0 && !/\s/.test(text[excerptStart])) excerptStart--;
    while (excerptEnd < text.length && !/\s/.test(text[excerptEnd])) excerptEnd++;
    
    sentence = text.substring(excerptStart, excerptEnd).trim();
    
    // Add ellipsis if we truncated
    if (excerptStart > 0) sentence = '...' + sentence;
    if (excerptEnd < text.length) sentence = sentence + '...';
  }

  return sentence;
}

interface AnalysisRequest {
  translationContent: string;
  glossaryContent: string;
  language: string;
  domain: string;
  checkGrammar?: boolean;
  checkSpelling?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { translationContent, glossaryContent, language, domain, checkGrammar = false, checkSpelling = true } = await req.json() as AnalysisRequest;

    console.log('=== Edge Function: Starting Analysis ===');
    console.log(`Parameters: language=${language}, domain=${domain}, checkGrammar=${checkGrammar}, checkSpelling=${checkSpelling}`);
    console.log(`Content sizes: Translation=${translationContent.length} chars, Glossary=${glossaryContent.length} chars`);

    // Enhanced validation with better error messages
    if (translationContent.length > 50000) {
      return new Response(
        JSON.stringify({ 
          error: `Text too large (${translationContent.length} characters). Maximum allowed is 50,000 characters. Please split into smaller sections.` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (translationContent.length < 10) {
      return new Response(
        JSON.stringify({ error: "Text is too short for meaningful analysis (minimum 10 characters)." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ENHANCED PROMPT with stronger language enforcement
    const prompt = `CRITICAL LANGUAGE REQUIREMENT: ALL output text, suggestions, rationale, and context MUST be in ${language}. Never provide English suggestions for ${language} text.

ANALYSIS CONTEXT:
- Target Language: ${language}
- Domain: ${domain}
- Grammar Checking: ${checkGrammar ? 'ENABLED' : 'DISABLED'}

GLOSSARY TERMS (authoritative reference):
${glossaryContent}

TRANSLATION TEXT TO ANALYZE:
${translationContent}

CLASSIFICATION RULES (STRICT ENFORCEMENT):

1. VALID (green): Exact glossary match (case-insensitive for Latin scripts, exact for CJK)
2. REVIEW (yellow): Fuzzy match (plurals, conjugations, minor variations)  
3. CRITICAL (red): Inconsistent with glossary OR significantly better alternative exists
${checkSpelling ? '4. SPELLING: Obvious typos/misspellings (ONLY if checkSpelling=true)' : ''}
${checkGrammar ? '5. GRAMMAR: Grammar issues (subject-verb agreement, tense errors, etc.) (ONLY if checkGrammar=true)' : ''}

LANGUAGE CHECK PARAMETERS:
- checkSpelling: ${checkSpelling} - ${checkSpelling ? 'Flag spelling issues' : 'DO NOT flag spelling issues'}
- checkGrammar: ${checkGrammar} - ${checkGrammar ? 'Flag grammar issues' : 'DO NOT flag grammar issues'}

LANGUAGE COMPLIANCE RULES:
- ALL suggestions MUST be in ${language}
- ALL rationale/notes MUST be in ${language} 
- ALL context descriptions MUST be in ${language}
- NEVER suggest English terms for ${language} content
- If glossary has multiple languages, prioritize ${language} terms

SEMANTIC TYPES - MANDATORY FOR EVERY TERM:
Assign ONE type to EVERY analyzed term. MUST include ui_information with color_code.

- Entity: People, places, organizations, objects
  → ui_information: { "category": "Entity", "color_code": "#2196F3", "display_name": "Entity", "description": "Named entities" }

- Action: Verbs, processes, operations
  → ui_information: { "category": "Action", "color_code": "#4CAF50", "display_name": "Action", "description": "Actions and processes" }

- Quality: Adjectives, properties, attributes
  → ui_information: { "category": "Quality", "color_code": "#FF9800", "display_name": "Quality", "description": "Qualities and attributes" }

- Concept: Abstract ideas, principles
  → ui_information: { "category": "Concept", "color_code": "#9C27B0", "display_name": "Concept", "description": "Abstract concepts" }

- Technical: Technical terms, jargon
  → ui_information: { "category": "Technical", "color_code": "#00BCD4", "display_name": "Technical", "description": "Technical terminology" }

CRITICAL: Every term MUST have semantic_type.ui_information.color_code. NO EXCEPTIONS.

REQUIRED JSON FORMAT (all text in ${language}):
{
  "terms": [
    {
      "text": "found term",
      "startPosition": number,
      "endPosition": number,
      "classification": "valid|review|critical|spelling|grammar",
      "score": 0-100,
      "frequency": number,
      "context": "COMPLETE SENTENCE where term appears (${language})",
      "rationale": "why this classification (${language})",
      "suggestions": ["alt1 (${language})", "alt2 (${language})"],
      "semantic_type": {
        "semantic_type": "Entity|Action|Quality|Concept|Technical",
        "confidence": 0-100,
        "ui_information": {
          "category": "semantic category",
          "color_code": "#hexcolor",
          "description": "brief description (${language})",
          "display_name": "display name (${language})"
        }
      }${checkGrammar ? `,
      "grammar_issues": [
        {
          "rule": "grammar rule name",
          "severity": "low|medium|high",
          "suggestion": "correction (${language})"
        }
      ]` : ''}
    }
  ],
  "statistics": {
    "totalTerms": number,
    "validTerms": number,
    "reviewTerms": number,
    "criticalTerms": number,
    "spellingIssues": number,
    ${checkGrammar ? '"grammarIssues": number,' : ''}
    "qualityScore": 0-100,
    "averageConfidence": 0-100,
    "coverage": 0-100
  }
}

CRITICAL REQUIREMENTS:
1. ONLY analyze terms that appear in both glossary AND text
2. ALL text output (suggestions, rationale, context) MUST be in ${language}
3. Return valid JSON with exact field names above
4. Provide specific, actionable suggestions in ${language}
5. Include semantic type for every term`;

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
    
    // Remove markdown code blocks if present (robust approach)
    if (cleanContent.startsWith('```')) {
      console.log("Detected markdown code block, stripping...");
      cleanContent = cleanContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    }
    
    // Remove any leading/trailing whitespace and quotes
    cleanContent = cleanContent.trim().replace(/^["']|["']$/g, '');
    
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
      
      // Normalize term fields with enhanced context extraction
      analysisResult.terms = analysisResult.terms.map((term: any) => {
        const startPos = Array.isArray(term.pos) ? term.pos[0] : term.startPosition;
        const endPos = Array.isArray(term.pos) ? term.pos[1] : term.endPosition;
        const existingContext = term.ctx || term.context || '';
        
        // Enhance context if it seems incomplete
        const enhancedContext = existingContext.length > 20 && existingContext.includes('.') 
          ? existingContext 
          : extractFullSentence(translationContent, startPos, endPos);
        
        return {
          text: term.text,
          startPosition: startPos,
          endPosition: endPos,
          classification: term.class || term.classification,
          score: term.score,
          frequency: term.freq || term.frequency || 1,
          context: enhancedContext,
          rationale: term.note || term.rationale || '',
          suggestions: term.sugg || term.suggestions || [],
          grammar_issues: term.gram_issues || [],
          semantic_type: term.semantic_type || term.sem_type || undefined
        };
      });

      // Fallback: Ensure all terms have ui_information with color_code
      const colorMap: Record<string, { color: string; category: string; description: string }> = {
        'entity': { color: '#2196F3', category: 'Entity', description: 'Named entities' },
        'action': { color: '#4CAF50', category: 'Action', description: 'Actions and processes' },
        'quality': { color: '#FF9800', category: 'Quality', description: 'Qualities and attributes' },
        'concept': { color: '#9C27B0', category: 'Concept', description: 'Abstract concepts' },
        'technical': { color: '#00BCD4', category: 'Technical', description: 'Technical terminology' },
      };

      analysisResult.terms = analysisResult.terms.map((term: any) => {
        // If semantic_type exists but ui_information is missing or incomplete
        if (term.semantic_type && (!term.semantic_type.ui_information || !term.semantic_type.ui_information.color_code)) {
          const typeKey = term.semantic_type.semantic_type?.toLowerCase() || 'concept';
          const colorInfo = colorMap[typeKey] || colorMap['concept'];
          
          console.log(`⚠️ Missing ui_information for term "${term.text}" - applying fallback color: ${colorInfo.color}`);
          
          term.semantic_type.ui_information = {
            category: colorInfo.category,
            color_code: colorInfo.color,
            description: colorInfo.description,
            display_name: colorInfo.category
          };
        }
        
        return term;
      });
      
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
        
        // Simplified normalization for fallback with enhanced context
        analysisResult.terms = analysisResult.terms.map((term: any) => {
          const startPos = Array.isArray(term.pos) ? term.pos[0] : term.startPosition;
          const endPos = Array.isArray(term.pos) ? term.pos[1] : term.endPosition;
          const existingContext = term.ctx || term.context || '';
          
          // Enhance context if it seems incomplete
          const enhancedContext = existingContext.length > 20 && existingContext.includes('.') 
            ? existingContext 
            : extractFullSentence(translationContent, startPos, endPos);
          
          return {
            text: term.text,
            startPosition: startPos,
            endPosition: endPos,
            classification: term.class || term.classification,
            score: term.score,
            frequency: term.freq || term.frequency || 1,
            context: enhancedContext,
            rationale: term.note || term.rationale || '',
            suggestions: term.sugg || term.suggestions || [],
            grammar_issues: term.gram_issues || [],
            semantic_type: term.semantic_type || term.sem_type || undefined
          };
        });
        
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

    // Log analysis completion with classification breakdown
    const classificationBreakdown = analysisResult.terms.reduce((acc: any, term: any) => {
      acc[term.classification] = (acc[term.classification] || 0) + 1;
      return acc;
    }, {});
    
    const spellCount = analysisResult.terms.filter((t: any) => t.classification === 'spelling').length;
    const grammarCount = analysisResult.terms.filter((t: any) => t.classification === 'grammar').length;
    
    // Log semantic type color status
    const termsWithColors = analysisResult.terms.filter((t: any) => 
      t.semantic_type?.ui_information?.color_code
    ).length;
    const termsWithoutColors = analysisResult.terms.length - termsWithColors;

    // Validate and fix statistics counts
    const actualSpellingCount = analysisResult.terms.filter((t: any) => t.classification === 'spelling').length;
    const actualGrammarCount = analysisResult.terms.filter((t: any) => t.classification === 'grammar').length;

    if (actualSpellingCount !== (analysisResult.statistics.spellingIssues ?? 0)) {
      console.warn(`⚠️ Spelling count mismatch: statistics=${analysisResult.statistics.spellingIssues}, actual=${actualSpellingCount}`);
      analysisResult.statistics.spellingIssues = actualSpellingCount;
    }

    if (actualGrammarCount !== (analysisResult.statistics.grammarIssues ?? 0)) {
      console.warn(`⚠️ Grammar count mismatch: statistics=${analysisResult.statistics.grammarIssues}, actual=${actualGrammarCount}`);
      analysisResult.statistics.grammarIssues = actualGrammarCount;
    }

    console.log('=== Edge Function: Analysis Complete ===');
    console.log(`Total terms analyzed: ${analysisResult.terms.length}`);
    console.log('Classification breakdown:', classificationBreakdown);
    console.log(`📊 Statistics breakdown:
  - Terminology: ${analysisResult.statistics.validTerms} valid, ${analysisResult.statistics.reviewTerms} review, ${analysisResult.statistics.criticalTerms} critical
  - Language: ${analysisResult.statistics.spellingIssues} spelling, ${analysisResult.statistics.grammarIssues} grammar
  - Quality Score: ${analysisResult.statistics.qualityScore.toFixed(2)}`);
    console.log(`Semantic types: ${termsWithColors} with colors, ${termsWithoutColors} without colors`);

    if (termsWithoutColors > 0) {
      console.warn(`⚠️ ${termsWithoutColors} terms are missing color codes - fallback colors applied`);
    }

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
