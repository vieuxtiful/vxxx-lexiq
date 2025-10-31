import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConsistencyCheckRequest {
  sourceText: string;
  translationText: string;
  sourceLanguage: string;
  targetLanguage: string;
  glossaryTerms?: Array<{
    id: string;
    source: string;
    target: string;
    domain?: string;
    caseSensitive?: boolean;
    forbidden?: boolean;
  }>;
  customRules?: Array<{
    id: string;
    name: string;
    type: string;
    pattern: string;
    replacement?: string;
    description: string;
    severity: string;
    enabled: boolean;
  }>;
  checkTypes?: string[];
  enableCache?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request = await req.json() as ConsistencyCheckRequest;

    console.log('=== Consistency Check Edge Function ===');
    console.log(`Languages: ${request.sourceLanguage} -> ${request.targetLanguage}`);
    console.log(`Source length: ${request.sourceText?.length || 0}`);
    console.log(`Target length: ${request.translationText?.length || 0}`);

    // Validate input
    if (!request.sourceText || !request.translationText) {
      return new Response(
        JSON.stringify({ error: 'Source and translation text are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Python backend URL from environment
    const PYTHON_BACKEND_URL = Deno.env.get("PYTHON_BACKEND_URL") || "http://localhost:8000";

    console.log(`Calling Python backend at: ${PYTHON_BACKEND_URL}/api/v2/lqa/consistency-check`);

    // Call Python backend for consistency checks
    const backendResponse = await fetch(`${PYTHON_BACKEND_URL}/api/v2/lqa/consistency-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error:', errorText);
      
      // Fallback to basic browser-based checks if backend fails
      console.log('Falling back to basic consistency checks...');
      
      const issues = [];
      
      // Basic whitespace check
      if (request.translationText.startsWith(' ') || request.translationText.endsWith(' ')) {
        issues.push({
          id: 'whitespace-1',
          type: 'whitespace',
          severity: 'minor',
          targetText: request.translationText.trim(),
          startPosition: 0,
          endPosition: request.translationText.length,
          context: request.translationText.substring(0, 50),
          message: 'Leading or trailing whitespace detected',
          rationale: 'Text should not have unnecessary whitespace',
          suggestions: [request.translationText.trim()],
          confidence: 1.0,
          autoFixable: true
        });
      }

      // Basic number check
      const sourceNumbers = request.sourceText.match(/\d+/g) || [];
      const targetNumbers = request.translationText.match(/\d+/g) || [];
      
      if (sourceNumbers.length !== targetNumbers.length) {
        issues.push({
          id: 'number-mismatch',
          type: 'number_format',
          severity: 'major',
          targetText: request.translationText.substring(0, 100),
          startPosition: 0,
          endPosition: request.translationText.length,
          context: request.translationText.substring(0, 100),
          message: `Number count mismatch: ${sourceNumbers.length} vs ${targetNumbers.length}`,
          rationale: 'Number of numeric values differs between source and target',
          suggestions: ['Verify all numbers are correctly translated'],
          confidence: 0.9,
          autoFixable: false
        });
      }

      const statistics = {
        totalIssues: issues.length,
        criticalIssues: 0,
        majorIssues: issues.filter(i => i.severity === 'major').length,
        minorIssues: issues.filter(i => i.severity === 'minor').length,
        infoIssues: 0,
        issuesByType: {},
        qualityScore: Math.max(0, 100 - (issues.length * 10)),
        averageConfidence: issues.length > 0 
          ? issues.reduce((sum, i) => sum + i.confidence, 0) / issues.length 
          : 1.0
      };

      return new Response(
        JSON.stringify({
          success: true,
          issues,
          statistics,
          metadata: {
            fallbackMode: true,
            backendError: errorText
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = await backendResponse.json();

    console.log(`✅ Consistency check complete: ${result.issues?.length || 0} issues found`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Consistency check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Consistency check failed',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
