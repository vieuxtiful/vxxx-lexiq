import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Extract the full sentence containing a term
 */
function extractFullSentence(text: string, startPos: number, endPos: number): string {
  // Defensive checks for undefined/null/invalid positions
  if (!text || typeof startPos !== 'number' || typeof endPos !== 'number' || 
      startPos < 0 || endPos > text.length || startPos >= endPos) {
    console.warn(`⚠️ Invalid position data: startPos=${startPos}, endPos=${endPos}, textLength=${text?.length || 0}`);
    return text?.substring(0, Math.min(100, text.length)) || '';
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
  sourceTextOnly?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { translationContent, glossaryContent = '', language, domain, checkGrammar = false, checkSpelling = true, sourceTextOnly = false } = await req.json() as AnalysisRequest;

    console.log('=== Edge Function: Starting Analysis ===');
    console.log(`Parameters: language=${language}, domain=${domain}, checkGrammar=${checkGrammar}, checkSpelling=${checkSpelling}, sourceTextOnly=${sourceTextOnly}`);
    console.log(`Content sizes: Translation=${translationContent?.length || 0} chars, Glossary=${glossaryContent?.length || 0} chars`);

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

    // Extract numbers, tags, and check whitespace issues (only if glossaryContent exists)
    const sourceNumbers = glossaryContent ? ((glossaryContent.match(/\d+\.?\d*/g) || []).join(',')) : '';
    const targetNumbers = (translationContent.match(/\d+\.?\d*/g) || []).join(',');
    const sourceTags = glossaryContent ? ((glossaryContent.match(/<[^>]+>/g) || []).join(' ')) : '';
    const targetTags = (translationContent.match(/<[^>]+>/g) || []).join(' ');
    const hasLeadingTrailingSpace = /^\s|\s$/.test(translationContent);
    const hasDoubleSpace = /\s{2,}/.test(translationContent);

    // SOURCE-ONLY ANALYSIS: When sourceTextOnly is true, skip terminology validation
    if (sourceTextOnly) {
      const sourceOnlyPrompt = `You are analyzing SOURCE TEXT for grammar and spelling issues ONLY.

CRITICAL LANGUAGE REQUIREMENT: ALL output text, suggestions, rationale, and context MUST be in ${language}.

ANALYSIS CONTEXT:
- Target Language: ${language}
- Grammar Checking: ${checkGrammar ? 'ENABLED' : 'DISABLED'}
- Spelling Checking: ${checkSpelling ? 'ENABLED' : 'DISABLED'}
- Mode: SOURCE TEXT ONLY (no terminology validation)

SOURCE TEXT TO ANALYZE:
${translationContent}

${checkSpelling ? 'SPELLING VALIDATION:\n- Check EVERY word against standard ' + language + ' dictionaries\n- Flag words that are:\n  * Non-existent in standard dictionaries\n  * Character transpositions (e.g., "teh" → "the")\n  * Missing/extra letters (e.g., "temperture" → "temperature")\n  * Typos that create plausible-looking but incorrect words\n- DO NOT flag:\n  * Proper nouns\n  * Domain-specific technical terms\n' : ''}

${checkGrammar ? 'GRAMMAR VALIDATION:\n- Subject-Verb Agreement:\n  * SINGULAR subjects take SINGULAR verbs: "The control IS" (not "are")\n  * PLURAL subjects take PLURAL verbs: "The processes ARE" (not "is")\n- Article-Noun Number Agreement:\n  * "a/an" (singular articles) must be followed by SINGULAR nouns\n  * ❌ "a solutions treatment" → GRAMMAR ERROR (singular article + plural noun)\n  * ✅ "a solution treatment" → CORRECT\n- Mass Nouns (No Plural Forms):\n  * "quenching" → ❌ "quenchings" (GRAMMAR ERROR)\n  * "information" → ❌ "informations" (GRAMMAR ERROR)\n' : ''}

REQUIRED JSON FORMAT (all text in ${language}):
{
  "terms": [
    {
      "text": "exact text of the issue as it appears in source",
      "startPosition": number,
      "endPosition": number,
      "classification": "${checkGrammar && checkSpelling ? 'spelling|grammar' : checkGrammar ? 'grammar' : 'spelling'}",
      "score": 0-100,
      "frequency": 1,
      "context": "COMPLETE SENTENCE where issue appears (${language})",
      "rationale": "why this is an issue (${language})",
      "suggestions": ["correction (${language})"],
      "semantic_type": {
        "semantic_type": "Quality",
        "confidence": 80,
        "ui_information": {
          "category": "Quality",
          "color_code": "#FF9800",
          "description": "Language quality issue",
          "display_name": "Quality"
        }
      }
    }
  ],
  "statistics": {
    "totalTerms": number,
    "validTerms": 0,
    "reviewTerms": 0,
    "criticalTerms": 0,
    "spellingIssues": number,
    "grammarIssues": number,
    "qualityScore": 0-100,
    "averageConfidence": 0-100,
    "coverage": 100
  }
}

CRITICAL POSITION REQUIREMENTS:
1. startPosition and endPosition MUST be exact zero-indexed character positions in the source text
2. The substring sourceText.substring(startPosition, endPosition) MUST EXACTLY equal the "text" field
3. Count positions carefully - include all characters (letters, spaces, punctuation)

EXAMPLE:
For source text: "Hello! I have a issue that needs fixing."
The phrase "a issue" appears at character positions 14-21 (zero-indexed).
Verification: "Hello! I have a issue that needs fixing.".substring(14, 21) === "a issue" ✓

Correct JSON:
{
  "text": "a issue",
  "startPosition": 14,
  "endPosition": 21,
  "classification": "grammar",
  "score": 70,
  "frequency": 1,
  "context": "Hello! I have a issue that needs fixing.",
  "rationale": "Article-noun agreement error: 'a' should be 'an' before vowel sounds",
  "suggestions": ["an issue"]
}

CRITICAL: Only return grammar and/or spelling issues. Do NOT analyze terminology or glossary compliance.`;

      // Call Lovable AI for source-only analysis
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      console.log("Calling Lovable AI API for source-only analysis...");
      
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
              { role: "user", content: sourceOnlyPrompt }
            ],
            response_format: { type: "json_object" },
            max_tokens: 20000,
          }),
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error("Analysis timeout - please try with smaller files");
        }
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
        throw new Error("AI analysis failed");
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in AI response");
      }

      let cleanContent = content.trim();
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      }
      cleanContent = cleanContent.trim().replace(/^["']|["']$/g, '');

      const analysisResult = JSON.parse(cleanContent);
      
      console.log('=== Source-Only Analysis Complete ===');
      console.log(`Total issues found: ${analysisResult.terms?.length || 0}`);
      
      return new Response(
        JSON.stringify({ analysis: analysisResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ENHANCED PROMPT with stronger language enforcement
    const prompt = `CRITICAL LANGUAGE REQUIREMENT: ALL output text, suggestions, rationale, and context MUST be in ${language}. Never provide English suggestions for ${language} text.

ANALYSIS CONTEXT:
- Target Language: ${language}
- Domain: ${domain}
- Grammar Checking: ${checkGrammar ? 'ENABLED' : 'DISABLED'}
- Spelling Checking: ${checkSpelling ? 'ENABLED' : 'DISABLED'}

ADDITIONAL QA CHECKS:
- Number Validation: Source numbers [${sourceNumbers}] vs Target numbers [${targetNumbers}] - FLAG CRITICAL if mismatch
- Tag Preservation: Source tags [${sourceTags}] vs Target tags [${targetTags}] - FLAG CRITICAL if missing/extra
- Whitespace Issues: Leading/trailing=${hasLeadingTrailingSpace}, Double spaces=${hasDoubleSpace} - FLAG REVIEW if present

GLOSSARY TERMS (authoritative reference):
${glossaryContent}

TRANSLATION TEXT TO ANALYZE:
${translationContent}

CLASSIFICATION HIERARCHY (STRICT PRIORITY ORDER):
When a term matches multiple classifications, assign the HIGHEST priority classification:

${checkSpelling ? 'PRIORITY 1 - SPELLING:\n  - Obvious typos, misspellings\n  - Non-existent words not in standard dictionaries\n  - Character transpositions, missing/extra letters\n  - Incorrect plurals that create non-existent words\n' : ''}
${checkGrammar ? 'PRIORITY 2 - GRAMMAR:\n  - Subject-verb agreement errors (singular/plural mismatch)\n  - Article-noun number agreement (a/an + plural noun)\n  - Incorrect pluralizations of mass nouns (e.g., "quenchings" → "quenching")\n  - Tense inconsistencies\n  - Article misuse (a/an/the)\n  - Preposition errors\n  - Wrong word forms even if term appears in glossary\n' : ''}
PRIORITY 3 - CRITICAL:
  - Number mismatches between source and target
  - Missing or extra HTML/XML tags
  - Terms completely inconsistent with glossary
  - Significantly better alternatives exist
  - Context-inappropriate terminology
  - Empty translations
  - URL or email modifications

PRIORITY 4 - REVIEW:
  - Leading or trailing whitespace
  - Double spaces or formatting issues
  - Valid variations (conjugations of count nouns, declensions)
  - Acceptable synonyms requiring review
  - Minor stylistic improvements
  - Significant length mismatches

PRIORITY 5 - VALID:
  - Exact glossary matches
  - Correct usage

⚠️ CRITICAL RULES:
- If a term appears in the glossary BUT is used incorrectly (wrong form, wrong context), it is GRAMMAR or CRITICAL, NOT REVIEW
- "quenchings" is GRAMMAR (incorrect mass noun plural), NOT REVIEW
- Mass nouns (quenching, tempering, information, equipment) do NOT pluralize - flag additions of "-s" as GRAMMAR errors

${checkGrammar ? `
GRAMMAR DETECTION RULES (Language: ${language}) - when checkGrammar=true:

Apply the grammatical rules NATIVE to ${language}. Analyze for language-appropriate errors:

1. AGREEMENT ERRORS:
   - Noun-verb agreement (subject-predicate number/person)
   - Noun-adjective agreement (gender, number, case where applicable)
   - Article-noun agreement (definiteness, gender, number)
   - Determiner-noun agreement
   - Pronoun-antecedent agreement

2. WORD FORM ERRORS:
   - Incorrect verb conjugations (tense, person, number, aspect, mood)
   - Incorrect noun declensions (case, number, gender)
   - Incorrect adjective declensions (gender, number, case)
   - Incorrect pluralization (including mass/uncountable nouns that don't pluralize in ${language})
   - Gender mismatches (for gendered languages)
   - Case errors (for languages with case systems)

3. SYNTAX ERRORS:
   - Incorrect word order for ${language}
   - Missing required grammatical particles or markers
   - Tense/aspect/mood inconsistencies
   - Incorrect use of grammatical constructions

LANGUAGE-FAMILY-SPECIFIC PATTERNS:

${(() => {
  // Romance languages (French, Spanish, Italian, Portuguese, Romanian, Catalan)
  if (['fr', 'es', 'it', 'pt', 'ro', 'ca'].includes(language)) {
    return `Romance Language (${language}) - Focus on:
   - Article-noun GENDER agreement (masculine/feminine)
     * French: un/une, le/la, ce/cette (un échange ✓, une échange ✗)
     * Spanish: el/la, un/una (el problema ✓, la problema ✗)
     * Italian: il/la, un/una (il problema ✓, la problema ✗)
   - Article-noun NUMBER agreement (singular/plural)
   - Adjective-noun gender AND number agreement
   - Verb conjugation patterns (person, number, tense, mood)
   - Common irregular forms and exceptions`;
  }
  
  // Germanic languages (German, Dutch, Swedish, Norwegian, Danish)
  if (['de', 'nl', 'sv', 'no', 'da'].includes(language)) {
    return `Germanic Language (${language}) - Focus on:
   - Article-noun GENDER (der/die/das, de/het, etc.)
   - Case declensions (German: nominative, accusative, dative, genitive)
   - Compound word formation correctness
   - Verb position rules (V2 word order)
   - Separable prefix verbs`;
  }
  
  // Slavic languages (Russian, Polish, Ukrainian, Czech, Bulgarian, Serbian)
  if (['ru', 'pl', 'uk', 'cs', 'bg', 'sr'].includes(language)) {
    return `Slavic Language (${language}) - Focus on:
   - Case system (nominative, genitive, dative, accusative, instrumental, locative)
   - Gender agreement (masculine, feminine, neuter)
   - Aspect pairs (perfective/imperfective verbs)
   - Declension patterns for nouns, adjectives, pronouns
   - Noun-numeral agreement`;
  }
  
  // East Asian languages (Chinese, Japanese, Korean)
  if (['zh', 'ja', 'ko'].includes(language)) {
    return `East Asian Language (${language}) - Focus on:
   - Particle usage and placement (Japanese: は、が、を、に、で、と、へ、から、まで)
   - Counter classifiers (correct classifier for noun type)
   - Honorific forms and register appropriateness
   - Character/script correctness (kanji vs. kana, hanja, hanzi)
   - Topic-comment structure`;
  }
  
  // Semitic languages (Arabic, Hebrew)
  if (['ar', 'he'].includes(language)) {
    return `Semitic Language (${language}) - Focus on:
   - Root-pattern morphology correctness
   - Definiteness marking (al-, ha-)
   - Gender agreement (masculine/feminine)
   - Plural patterns (sound plurals, broken plurals in Arabic)
   - Construct state (idafa in Arabic, smikhut in Hebrew)`;
  }
  
  // Agglutinative languages (Turkish, Finnish, Hungarian)
  if (['tr', 'fi', 'hu'].includes(language)) {
    return `Agglutinative Language (${language}) - Focus on:
   - Suffix ordering and combinations
   - Vowel harmony rules
   - Case suffixes (multiple cases)
   - Possessive suffix usage
   - Question particle placement`;
  }
  
  // Default for other languages
  return `Apply ${language} grammar rules:
   - Check agreement patterns native to ${language}
   - Verify correct word forms for ${language}
   - Validate syntax patterns specific to ${language}`;
})()}

For each grammar error found:
- Identify the incorrect form used
- Provide the correct form in ${language}
- Explain why it's incorrect using ${language} grammatical concepts
- Assign severity: HIGH for agreement/conjugation errors, MEDIUM for minor form variations
` : ''}

${checkSpelling ? `
SPELLING VALIDATION (Language: ${language}, Script: ${(() => {
  if (['zh', 'ja'].includes(language)) return 'Han/CJK';
  if (['ar', 'he'].includes(language)) return 'Arabic/Hebrew';
  if (['ru', 'uk', 'bg', 'sr'].includes(language)) return 'Cyrillic';
  if (['el'].includes(language)) return 'Greek';
  if (['th'].includes(language)) return 'Thai';
  if (['ko'].includes(language)) return 'Hangul';
  if (['hi'].includes(language)) return 'Devanagari';
  return 'Latin';
})()}) - when checkSpelling=true:

Validate words against ${language} dictionaries and orthographic rules. Flag:

1. NON-EXISTENT WORDS in ${language}:
   - Words not found in standard ${language} dictionaries
   - Verify against ${language} lexicon, not English or other languages
   ${language === 'fr' ? '- Example: "journale" ✗ (correct: "journal")' : ''}
   ${language === 'es' ? '- Example: "problemo" ✗ (correct: "problema")' : ''}
   ${language === 'de' ? '- Example: "Hause" in wrong context ✗ (correct: "Haus" or "Hause" with preposition)' : ''}

2. CHARACTER/LETTER ERRORS:
   - Transpositions (wrong character order)
   - Missing or extra letters
   - Wrong characters that create non-words
   ${['fr', 'es', 'it', 'pt', 'ca'].includes(language) ? '- Diacritical mark errors (é/è/ê/ë, á/à, ñ, ç, etc.)' : ''}
   ${['de', 'sv', 'no', 'da', 'fi'].includes(language) ? '- Umlaut/special character errors (ä/ö/ü, å, ø, etc.)' : ''}
   ${['ru', 'uk', 'bg', 'sr'].includes(language) ? '- Incorrect Cyrillic letters (е/ё, и/й confusion)' : ''}
   ${['ja'].includes(language) ? '- Wrong kanji readings, incorrect kana usage' : ''}
   ${['zh'].includes(language) ? '- Incorrect hanzi characters, simplified vs. traditional' : ''}
   ${['ar'].includes(language) ? '- Wrong Arabic letter forms (initial/medial/final/isolated)' : ''}

3. TYPOS CREATING PLAUSIBLE BUT INCORRECT WORDS:
   - Real words in ${language} but wrong in context
   - Confused homophones or near-homophones in ${language}

DO NOT flag as spelling errors:
- Proper nouns (names, places, brands)
- Domain-specific technical terms from the glossary
- Correct morphological variations (conjugations, declensions) of glossary terms
- Loanwords commonly used in ${language}

For each spelling error:
- Provide the misspelled word
- Suggest the correct ${language} spelling
- Include character positions in the text
- Brief explanation in ${language}
` : ''}

LANGUAGE CHECK PARAMETERS:
- checkSpelling: ${checkSpelling} - ${checkSpelling ? 'Flag spelling issues with PRIORITY 1' : 'DO NOT flag spelling issues'}
- checkGrammar: ${checkGrammar} - ${checkGrammar ? 'Flag grammar issues with PRIORITY 2' : 'DO NOT flag grammar issues'}

NUMBER VALIDATION:
- Compare all numbers in source vs target
- Flag as CRITICAL if numbers don't match (dates, amounts, percentages, quantities)
- Ignore formatting differences (1,000 vs 1000 is OK)

TAG PRESERVATION:
- Extract all HTML/XML tags from source and target
- Flag as CRITICAL if tags are missing, extra, or mismatched
- Examples: <b>, <code>, <a href="">, {variables}

WHITESPACE CHECKS:
- Flag as REVIEW if leading/trailing whitespace detected
- Flag as REVIEW if double spaces found

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
5. Include semantic type for every term
6. CRITICAL: Check EACH occurrence of a word independently - if "an" appears 5 times and only 1 is incorrect (e.g., "an process" vs "an element"), ONLY flag the incorrect instance with its specific character position
7. Grammar/spelling errors must include EXACT character positions - do not flag all instances of a word if only one instance is wrong
8. Context matters: "an element" is correct, "an process" is incorrect - analyze each occurrence separately`;

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
        const startPos = Array.isArray(term.pos) ? term.pos[0] : (term.startPosition ?? term.start);
        const endPos = Array.isArray(term.pos) ? term.pos[1] : (term.endPosition ?? term.end);
        const existingContext = term.ctx || term.context || '';
        
        // Validate positions before extracting context
        let enhancedContext = existingContext;
        if (typeof startPos === 'number' && typeof endPos === 'number' && startPos >= 0 && endPos <= translationContent.length) {
          enhancedContext = existingContext.length > 20 && existingContext.includes('.') 
            ? existingContext 
            : extractFullSentence(translationContent, startPos, endPos);
        } else {
          console.warn(`⚠️ Invalid term positions for "${term.text}": startPos=${startPos}, endPos=${endPos}`);
        }
        
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
          const startPos = Array.isArray(term.pos) ? term.pos[0] : (term.startPosition ?? term.start);
          const endPos = Array.isArray(term.pos) ? term.pos[1] : (term.endPosition ?? term.end);
          const existingContext = term.ctx || term.context || '';
          
          // Validate positions before extracting context
          let enhancedContext = existingContext;
          if (typeof startPos === 'number' && typeof endPos === 'number' && startPos >= 0 && endPos <= translationContent.length) {
            enhancedContext = existingContext.length > 20 && existingContext.includes('.') 
              ? existingContext 
              : extractFullSentence(translationContent, startPos, endPos);
          } else {
            console.warn(`⚠️ Invalid term positions for "${term.text}": startPos=${startPos}, endPos=${endPos}`);
          }
          
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
