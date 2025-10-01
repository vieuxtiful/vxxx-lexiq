import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  terms: any[];
  statistics: any;
  format: 'json' | 'csv' | 'html';
  language: string;
  domain: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { terms, statistics, format, language, domain } = await req.json() as ReportRequest;

    console.log(`Generating ${format} report with ${terms.length} terms`);

    let content: string;
    let contentType: string;

    switch (format) {
      case 'csv':
        // Generate CSV report
        const csvHeaders = 'Term,Classification,Score,Frequency,Context,Rationale\n';
        const csvRows = terms.map(term => 
          `"${term.text}","${term.classification}",${term.score},${term.frequency},"${term.context.replace(/"/g, '""')}","${term.rationale.replace(/"/g, '""')}"`
        ).join('\n');
        content = csvHeaders + csvRows;
        contentType = 'text/csv';
        break;

      case 'html':
        // Generate HTML report
        content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>LexiQ Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .stats { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat { display: inline-block; margin: 10px 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #4a90e2; color: white; }
    .valid { background: #d4edda; }
    .review { background: #fff3cd; }
    .critical { background: #f8d7da; }
    .spelling { background: #fce4ec; }
  </style>
</head>
<body>
  <h1>LexiQ Terminology Analysis Report</h1>
  <div class="stats">
    <div class="stat"><strong>Domain:</strong> ${domain}</div>
    <div class="stat"><strong>Language:</strong> ${language}</div>
    <div class="stat"><strong>Total Terms:</strong> ${statistics.totalTerms}</div>
    <div class="stat"><strong>Quality Score:</strong> ${statistics.qualityScore}%</div>
    <div class="stat"><strong>Valid:</strong> ${statistics.validTerms}</div>
    <div class="stat"><strong>Review:</strong> ${statistics.reviewTerms}</div>
    <div class="stat"><strong>Critical:</strong> ${statistics.criticalTerms}</div>
  </div>
  <h2>Detailed Term Analysis</h2>
  <table>
    <thead>
      <tr>
        <th>Term</th>
        <th>Classification</th>
        <th>Score</th>
        <th>Frequency</th>
        <th>Context</th>
        <th>Rationale</th>
      </tr>
    </thead>
    <tbody>
      ${terms.map(term => `
        <tr class="${term.classification}">
          <td>${term.text}</td>
          <td>${term.classification}</td>
          <td>${term.score}</td>
          <td>${term.frequency}</td>
          <td>${term.context}</td>
          <td>${term.rationale}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
        contentType = 'text/html';
        break;

      case 'json':
      default:
        // Generate JSON report
        content = JSON.stringify({
          metadata: {
            generatedAt: new Date().toISOString(),
            language,
            domain,
          },
          statistics,
          terms,
        }, null, 2);
        contentType = 'application/json';
        break;
    }

    console.log(`Report generated successfully: ${content.length} bytes`);

    return new Response(content, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="lexiq-report.${format}"`,
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
