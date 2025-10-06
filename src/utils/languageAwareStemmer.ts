/**
 * Language-aware stemming and lemmatization for term deduplication
 * Supports morphological variations across different languages
 */

// Simple stemming rules for various languages
const STEMMING_RULES: Record<string, { suffixes: string[]; minLength: number }> = {
  // English
  'en': {
    suffixes: ['ing', 'ed', 'es', 's', 'ly', 'er', 'est', 'ness', 'ment', 'tion', 'sion'],
    minLength: 3
  },
  // Spanish
  'es': {
    suffixes: ['ando', 'iendo', 'ado', 'ido', 'ar', 'er', 'ir', 'ción', 'sión', 'dad', 'tad', 'mente', 'os', 'as', 'es'],
    minLength: 3
  },
  // French
  'fr': {
    suffixes: ['ement', 'ation', 'ition', 'isme', 'iste', 'eur', 'euse', 'ant', 'ent', 'ais', 'ait', 'aient', 'és', 'ées', 'aux', 'eaux'],
    minLength: 3
  },
  // German
  'de': {
    suffixes: ['ung', 'heit', 'keit', 'schaft', 'chen', 'lein', 'lich', 'isch', 'bar', 'sam', 'end', 'ern', 'sten'],
    minLength: 3
  },
  // Italian
  'it': {
    suffixes: ['zione', 'amento', 'imento', 'mente', 'ista', 'tore', 'trice', 'oso', 'osa', 'are', 'ere', 'ire', 'ati', 'iti'],
    minLength: 3
  },
  // Portuguese
  'pt': {
    suffixes: ['ção', 'mento', 'dade', 'mente', 'ista', 'dor', 'dora', 'oso', 'osa', 'ar', 'er', 'ir', 'ado', 'ido'],
    minLength: 3
  },
  // Russian
  'ru': {
    suffixes: ['ость', 'ение', 'ание', 'ство', 'ний', 'ого', 'его', 'ому', 'ему', 'ами', 'ями'],
    minLength: 3
  },
  // Dutch
  'nl': {
    suffixes: ['ing', 'heid', 'lijk', 'baar', 'en', 'er', 'st', 'ere', 'ste'],
    minLength: 3
  },
  // Polish
  'pl': {
    suffixes: ['ość', 'enie', 'anie', 'stwo', 'acja', 'cja', 'ami', 'ymi', 'ach'],
    minLength: 3
  },
  // Swedish
  'sv': {
    suffixes: ['ning', 'het', 'lig', 'bar', 'are', 'ast', 'erna', 'arna'],
    minLength: 3
  },
  // Danish
  'da': {
    suffixes: ['ning', 'hed', 'lig', 'bar', 'ere', 'est', 'erne', 'ene'],
    minLength: 3
  },
  // Norwegian
  'no': {
    suffixes: ['ning', 'het', 'lig', 'bar', 'ere', 'est', 'ene', 'ene'],
    minLength: 3
  },
  // Czech
  'cs': {
    suffixes: ['ost', 'ení', 'ání', 'ství', 'ový', 'ová', 'ami', 'ích'],
    minLength: 3
  },
  // Turkish
  'tr': {
    suffixes: ['lik', 'lık', 'luk', 'lük', 'lar', 'ler', 'ması', 'mesi'],
    minLength: 3
  },
  // Japanese (romanized)
  'ja': {
    suffixes: ['masu', 'mashita', 'masen', 'tai', 'tari', 'teru', 'teiru'],
    minLength: 2
  },
  // Chinese (pinyin)
  'zh': {
    suffixes: ['le', 'guo', 'zhe', 'men'],
    minLength: 2
  },
  // Arabic (romanized)
  'ar': {
    suffixes: ['tion', 'at', 'een', 'oon', 'iya'],
    minLength: 3
  },
  // Korean (romanized)
  'ko': {
    suffixes: ['seumnida', 'hamnida', 'habnida', 'euro', 'ro'],
    minLength: 2
  }
};

/**
 * Normalize text using Unicode NFD and basic cleanup
 */
export const normalizeText = (text: string): string => {
  // Normalize Unicode to decompose accented characters (NFD)
  let normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Basic normalization: lowercase, trim, normalize punctuation spacing
  normalized = normalized.toLowerCase().trim();
  normalized = normalized.replace(/([.,;:!?])(\S)/g, '$1 $2');
  
  return normalized;
};

/**
 * Apply language-specific stemming to a word
 */
export const stemWord = (word: string, language: string): string => {
  const rules = STEMMING_RULES[language] || STEMMING_RULES['en'];
  const normalized = normalizeText(word);
  
  // Don't stem very short words
  if (normalized.length <= rules.minLength) {
    return normalized;
  }
  
  // Try to remove known suffixes
  for (const suffix of rules.suffixes) {
    if (normalized.endsWith(suffix) && normalized.length - suffix.length >= rules.minLength) {
      return normalized.slice(0, -suffix.length);
    }
  }
  
  return normalized;
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
export const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = (s1: string, s2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };
  
  const distance = editDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

/**
 * Check if two terms are similar considering morphological variations
 */
export const areTermsSimilar = (
  term1: string, 
  term2: string, 
  language: string,
  threshold: number = 0.9
): boolean => {
  // Normalize both terms
  const normalized1 = normalizeText(term1);
  const normalized2 = normalizeText(term2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return true;
  
  // Stem both words for the given language
  const stem1 = stemWord(term1, language);
  const stem2 = stemWord(term2, language);
  
  // Check if stems match
  if (stem1 === stem2) return true;
  
  // Fall back to similarity calculation
  const similarity = calculateSimilarity(normalized1, normalized2);
  return similarity > threshold;
};

/**
 * Get language-specific deduplication threshold
 * Some languages need higher thresholds due to complex morphology
 */
export const getDeduplicationThreshold = (language: string): number => {
  const strictLanguages = ['de', 'ru', 'pl', 'cs', 'tr', 'ar']; // Languages with complex morphology
  return strictLanguages.includes(language) ? 0.85 : 0.9;
};
