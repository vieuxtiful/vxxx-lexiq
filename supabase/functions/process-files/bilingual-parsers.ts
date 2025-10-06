// Bilingual file format parsers for LexiQ

export function parseXLIFF(content: string): { source: string; target: string } {
  const sourceSegments: string[] = [];
  const targetSegments: string[] = [];
  
  // Match <source> and <target> tags
  const sourceRegex = /<source[^>]*>(.*?)<\/source>/gs;
  const targetRegex = /<target[^>]*>(.*?)<\/target>/gs;
  
  let sourceMatch;
  while ((sourceMatch = sourceRegex.exec(content)) !== null) {
    sourceSegments.push(sourceMatch[1].trim());
  }
  
  let targetMatch;
  while ((targetMatch = targetRegex.exec(content)) !== null) {
    targetSegments.push(targetMatch[1].trim());
  }
  
  return {
    source: sourceSegments.join('\n'),
    target: targetSegments.join('\n')
  };
}

export function parseTMX(content: string): { source: string; target: string } {
  const sourceSegments: string[] = [];
  const targetSegments: string[] = [];
  
  // Match translation units
  const tuRegex = /<tu[^>]*>(.*?)<\/tu>/gs;
  let tuMatch;
  
  while ((tuMatch = tuRegex.exec(content)) !== null) {
    const tuContent = tuMatch[1];
    const tuvRegex = /<tuv[^>]*lang="([^"]*)"[^>]*>.*?<seg>(.*?)<\/seg>.*?<\/tuv>/gs;
    
    const segments = [];
    let tuvMatch;
    while ((tuvMatch = tuvRegex.exec(tuContent)) !== null) {
      segments.push({ lang: tuvMatch[1], text: tuvMatch[2].trim() });
    }
    
    if (segments.length >= 2) {
      sourceSegments.push(segments[0].text);
      targetSegments.push(segments[1].text);
    }
  }
  
  return {
    source: sourceSegments.join('\n'),
    target: targetSegments.join('\n')
  };
}

export function parsePO(content: string): { source: string; target: string } {
  const sourceSegments: string[] = [];
  const targetSegments: string[] = [];
  
  const msgidRegex = /msgid\s+"([^"]*)"/g;
  const msgstrRegex = /msgstr\s+"([^"]*)"/g;
  
  let msgidMatch;
  while ((msgidMatch = msgidRegex.exec(content)) !== null) {
    if (msgidMatch[1]) sourceSegments.push(msgidMatch[1]);
  }
  
  let msgstrMatch;
  while ((msgstrMatch = msgstrRegex.exec(content)) !== null) {
    if (msgstrMatch[1]) targetSegments.push(msgstrMatch[1]);
  }
  
  return {
    source: sourceSegments.join('\n'),
    target: targetSegments.join('\n')
  };
}
