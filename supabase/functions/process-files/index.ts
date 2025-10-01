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
    const { fileName, fileContent, fileSize, type: fileType } = await req.json();

    if (!fileName || !fileContent) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${fileType} file: ${fileName}, size: ${fileSize} bytes`);

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

    return new Response(
      JSON.stringify({
        content: normalized,
        fileName,
        fileSize,
        characterCount: normalized.length,
        wordCount: normalized.split(/\s+/).length
      }),
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
