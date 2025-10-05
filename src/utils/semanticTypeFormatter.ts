// Utility to properly format semantic type classifications
// Handles abbreviations and title case formatting

const ABBREVIATIONS = new Set([
  'IT', 'AI', 'ML', 'API', 'UI', 'UX', 'SQL', 'HTML', 'CSS', 'JSON', 
  'XML', 'HTTP', 'HTTPS', 'REST', 'SOAP', 'PDF', 'CSV', 'ID', 'URL',
  'URI', 'CPU', 'GPU', 'RAM', 'SSD', 'HDD', 'USB', 'GPS', 'NFC',
  'RFID', 'OCR', 'QR', 'SMS', 'MMS', 'VPN', 'DNS', 'IP', 'TCP',
  'UDP', 'FTP', 'SSH', 'SSL', 'TLS', 'ISO', 'ANSI', 'IEEE', 'EU',
  'US', 'UK', 'UN', 'WHO', 'FDA', 'EPA', 'OSHA', 'HIPAA', 'GDPR',
  'HR', 'PR', 'CEO', 'CTO', 'CFO', 'CIO', 'VP', 'SVP', 'EVP',
  'R&D', 'B2B', 'B2C', 'P2P', 'SaaS', 'PaaS', 'IaaS', 'CRM', 'ERP',
  'KPI', 'ROI', 'NPS', 'MRR', 'ARR', 'LTV', 'CAC', 'EBITDA'
]);

/**
 * Formats semantic type text with proper capitalization
 * - Every word capitalized (title case)
 * - Known abbreviations in all caps
 * - Handles forward slashes (e.g., "Ethical/Legal")
 * 
 * @param text - The semantic type text to format
 * @returns Properly formatted text
 */
export const formatSemanticType = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  
  // Handle text with forward slashes (e.g., "ethical/legal" -> "Ethical/Legal")
  if (text.includes('/')) {
    return text
      .split('/')
      .map(part => formatSemanticType(part.trim()))
      .join('/');
  }
  
  // Split into words and process each
  return text
    .split(/\s+/)
    .map(word => {
      const upperWord = word.toUpperCase();
      
      // Check if it's a known abbreviation
      if (ABBREVIATIONS.has(upperWord)) {
        return upperWord;
      }
      
      // Handle hyphenated words (e.g., "data-driven" -> "Data-Driven")
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => {
            const upperPart = part.toUpperCase();
            return ABBREVIATIONS.has(upperPart) 
              ? upperPart 
              : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('-');
      }
      
      // Standard title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
