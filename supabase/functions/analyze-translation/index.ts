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
    if (translationContent.length > 15000) {
      console.error(`Translation too large: ${translationContent.length} characters`);
      return new Response(
        JSON.stringify({ error: "Translation text is too large. Please limit to 15,000 characters or split into smaller sections for analysis." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Enhanced prompt with optional grammar checking
    const prompt = `Analyze translation terminology against glossary. Return JSON only.

Domain: ${domain} | Language: ${language}${checkGrammar ? ' | Grammar Check: ENABLED' : ''}

GLOSSARY (authoritative source):
${glossaryContent}

TRANSLATION TO ANALYZE:
${translationContent}

CRITICAL CLASSIFICATION RULES (MUST FOLLOW EXACTLY):

1. VALID (green): 
   - Term is an EXACT match to glossary (case-insensitive for Latin, exact for CJK)
   - This classification is INDEPENDENT of whether better alternatives exist
   - If term appears in glossary, it MUST be marked as VALID

2. REVIEW (yellow):
   - Term is a FUZZY match to glossary (plurals, conjugations, minor variations)
   - OR term is a fuzzy match based on LLM contextual analysis
   - Use when term is close but not exact match

3. CRITICAL (red):
   - Term is inconsistent with or non-existent in glossary
   - OR a significantly better "hot match" exists based on LLM analysis
   - These conditions are evaluated INDEPENDENTLY

4. SPELLING: Obvious typos, misspellings (dotted orange underline)

${checkGrammar ? `5. GRAMMAR: Grammar issues like subject-verb agreement, tense errors, etc. (wavy purple underline)` : ''}

IMPORTANT: Exact glossary matches are ALWAYS valid, regardless of potential improvements.

SEMANTIC TYPE CLASSIFICATION (for ALL terms):
Identify the semantic type of each term:
- Entity: People, places, organizations, objects
- Event: Actions, processes, states over time
- Property: Attributes, qualities, characteristics
- Concept: Abstract ideas, theories
- Relation: Connections between entities
- Unknown: Cannot determine

JSON format - keep all fields short:
{
  "terms": [
    {
      "text": "exact term text",
      "pos": [start_position, end_position],
      "class": "valid|review|critical|spelling${checkGrammar ? '|grammar' : ''}",
      "score": 0-100,
      "freq": occurrence_count,
      "ctx": "surrounding context max 50 chars",
      "note": "brief reason max 30 chars",
      "sugg": ["glossary_term", "alternative1", "alternative2"],
      "sem_type": {
        "type": "Entity|Event|Property|Concept|Relation|Unknown",
        "conf": 0.0-1.0,
        "ui": {
          "cat": "entity|event|property|concept|relation|unknown",
          "color": "#hex_color",
          "desc": "brief description",
          "name": "Display Name"
        }
      }${checkGrammar ? `,
      "gram_issues": [
        {
          "rule": "rule_name",
          "sev": "low|medium|high",
          "sugg": "suggestion text"
        }
      ]` : ''}
    }
  ],
  "stats": {
    "total": num,
    "valid": num,
    "review": num,
    "critical": num,
    "quality": 0-100,
    "coverage": 0-100${checkGrammar ? `,
    "spelling": num,
    "grammar": num` : ''}
  }
}

Color scheme: Entity=#2196F3, Event=#FF9800, Property=#4CAF50, Concept=#9C27B0, Relation=#F44336, Unknown=#757575
For suggestions array: First item should ALWAYS be the correct glossary term if available, followed by alternatives.
Focus on major technical terms only. Keep responses minimal.`;

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
            { role: "system", content: "Return only valid JSON. Be concise. No markdown." },
            { role: "user", content: prompt }
          ],
          max_tokens: 8000, // Limit response size to prevent truncation
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
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
    
    console.log(`Attempting to parse cleaned content (${cleanContent.length} chars)...`);
    
    // Check for truncated JSON (unterminated strings are common sign)
    if (cleanContent.length > 10000 && !cleanContent.endsWith('}')) {
      console.error("Response appears truncated - doesn't end with '}'");
      throw new Error("AI response was truncated. Please try with smaller files or fewer terms.");
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
      
      // Normalize term fields with enhanced data
      analysisResult.terms = analysisResult.terms.map((term: any) => {
        const normalized: any = {
          text: term.text,
          startPosition: Array.isArray(term.pos) ? term.pos[0] : term.startPosition,
          endPosition: Array.isArray(term.pos) ? term.pos[1] : term.endPosition,
          classification: term.class || term.classification,
          score: term.score,
          frequency: term.freq || term.frequency,
          context: term.ctx || term.context,
          rationale: term.note || term.rationale,
          suggestions: term.sugg || term.suggestions || []
        };
        
        // Add semantic type if present
        if (term.sem_type) {
          normalized.semantic_type = {
            semantic_type: term.sem_type.type,
            confidence: term.sem_type.conf,
            ui_information: term.sem_type.ui ? {
              category: term.sem_type.ui.cat,
              color_code: term.sem_type.ui.color,
              description: term.sem_type.ui.desc,
              display_name: term.sem_type.ui.name
            } : undefined
          };
        }
        
        // Add grammar issues if present
        if (term.gram_issues) {
          normalized.grammar_issues = term.gram_issues.map((issue: any) => ({
            rule: issue.rule,
            severity: issue.sev,
            suggestion: issue.sugg
          }));
        }
        
        // Add UI metadata
        if (term.sem_type || term.gram_issues) {
          normalized.ui_metadata = {
            confidence_level: term.sem_type?.conf >= 0.8 ? 'high' : term.sem_type?.conf >= 0.5 ? 'medium' : 'low',
            has_grammar_issues: !!term.gram_issues && term.gram_issues.length > 0,
            grammar_severity: term.gram_issues?.[0]?.sev || 'none'
          };
        }
        
        return normalized;
      });
      
    } catch (parseError) {
      console.error("Failed to parse cleaned content");
      console.error("First 1000 chars:", cleanContent.substring(0, 1000));
      console.error("Last 500 chars:", cleanContent.substring(Math.max(0, cleanContent.length - 500)));
      console.error("Parse error:", parseError);
      
      // Provide specific guidance based on error type
      if (parseError instanceof Error && parseError.message.includes('Unterminated')) {
        throw new Error("Response was truncated due to size. Please use smaller files or analyze in sections.");
      }
      throw new Error(`JSON parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
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
