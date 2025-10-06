import { Globe } from 'lucide-react';

export interface Language {
  code: string;           // ISO 639-1 (e.g., "en")
  name: string;           // Display name
  nativeName: string;     // Native script name
  locale: string;         // Full locale (e.g., "en-US")
  bcp47: string;          // BCP-47 tag
  family: string;         // Language family
  script: string;         // Writing system
  rtl: boolean;           // Right-to-left
  flag: string;           // Emoji flag
  popular?: boolean;      // Commonly used language
  region: string;         // Geographic region
}

export const LANGUAGES: Language[] = [
  // North America
  { code: 'en', name: 'English', nativeName: 'English', locale: 'en-US', bcp47: 'en-US', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇺🇸', popular: true, region: 'North America' },
  { code: 'es', name: 'Spanish (Latin America)', nativeName: 'Español', locale: 'es-MX', bcp47: 'es-MX', family: 'Romance', script: 'Latin', rtl: false, flag: '🇲🇽', popular: true, region: 'North America' },
  { code: 'fr', name: 'French (Canada)', nativeName: 'Français', locale: 'fr-CA', bcp47: 'fr-CA', family: 'Romance', script: 'Latin', rtl: false, flag: '🇨🇦', popular: true, region: 'North America' },

  // Europe
  { code: 'de', name: 'German', nativeName: 'Deutsch', locale: 'de-DE', bcp47: 'de-DE', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇩🇪', popular: true, region: 'Europe' },
  { code: 'fr', name: 'French', nativeName: 'Français', locale: 'fr-FR', bcp47: 'fr-FR', family: 'Romance', script: 'Latin', rtl: false, flag: '🇫🇷', popular: true, region: 'Europe' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', locale: 'it-IT', bcp47: 'it-IT', family: 'Romance', script: 'Latin', rtl: false, flag: '🇮🇹', popular: true, region: 'Europe' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', locale: 'es-ES', bcp47: 'es-ES', family: 'Romance', script: 'Latin', rtl: false, flag: '🇪🇸', popular: true, region: 'Europe' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', locale: 'pt-PT', bcp47: 'pt-PT', family: 'Romance', script: 'Latin', rtl: false, flag: '🇵🇹', popular: true, region: 'Europe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', locale: 'nl-NL', bcp47: 'nl-NL', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇳🇱', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', locale: 'sv-SE', bcp47: 'sv-SE', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇸🇪', region: 'Europe' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', locale: 'no-NO', bcp47: 'no-NO', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇳🇴', region: 'Europe' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', locale: 'da-DK', bcp47: 'da-DK', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇩🇰', region: 'Europe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', locale: 'ru-RU', bcp47: 'ru-RU', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇷🇺', popular: true, region: 'Europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', locale: 'pl-PL', bcp47: 'pl-PL', family: 'Slavic', script: 'Latin', rtl: false, flag: '🇵🇱', region: 'Europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', locale: 'uk-UA', bcp47: 'uk-UA', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇺🇦', region: 'Europe' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', locale: 'cs-CZ', bcp47: 'cs-CZ', family: 'Slavic', script: 'Latin', rtl: false, flag: '🇨🇿', region: 'Europe' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', locale: 'bg-BG', bcp47: 'bg-BG', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇧🇬', region: 'Europe' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', locale: 'sr-RS', bcp47: 'sr-RS', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇷🇸', region: 'Europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', locale: 'ro-RO', bcp47: 'ro-RO', family: 'Romance', script: 'Latin', rtl: false, flag: '🇷🇴', region: 'Europe' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', locale: 'ca-ES', bcp47: 'ca-ES', family: 'Romance', script: 'Latin', rtl: false, flag: '', region: 'Europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', locale: 'fi-FI', bcp47: 'fi-FI', family: 'Uralic', script: 'Latin', rtl: false, flag: '🇫🇮', region: 'Europe' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', locale: 'hu-HU', bcp47: 'hu-HU', family: 'Uralic', script: 'Latin', rtl: false, flag: '🇭🇺', region: 'Europe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', locale: 'el-GR', bcp47: 'el-GR', family: 'Hellenic', script: 'Greek', rtl: false, flag: '🇬🇷', region: 'Europe' },

  // Asia
  { code: 'zh', name: 'Chinese', nativeName: '中文', locale: 'zh-CN', bcp47: 'zh-CN', family: 'Sino-Tibetan', script: 'Han', rtl: false, flag: '🇨🇳', popular: true, region: 'Asia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', locale: 'ja-JP', bcp47: 'ja-JP', family: 'Japonic', script: 'Kanji/Hiragana', rtl: false, flag: '🇯🇵', popular: true, region: 'Asia' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', locale: 'ko-KR', bcp47: 'ko-KR', family: 'Koreanic', script: 'Hangul', rtl: false, flag: '🇰🇷', popular: true, region: 'Asia' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', locale: 'hi-IN', bcp47: 'hi-IN', family: 'Indo-Aryan', script: 'Devanagari', rtl: false, flag: '🇮🇳', region: 'Asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', locale: 'th-TH', bcp47: 'th-TH', family: 'Tai-Kadai', script: 'Thai', rtl: false, flag: '🇹🇭', region: 'Asia' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', locale: 'vi-VN', bcp47: 'vi-VN', family: 'Austroasiatic', script: 'Latin', rtl: false, flag: '🇻🇳', region: 'Asia' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', locale: 'id-ID', bcp47: 'id-ID', family: 'Austronesian', script: 'Latin', rtl: false, flag: '🇮🇩', region: 'Asia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', locale: 'ms-MY', bcp47: 'ms-MY', family: 'Austronesian', script: 'Latin', rtl: false, flag: '🇲🇾', region: 'Asia' },

  // Middle East & Africa
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', locale: 'ar-SA', bcp47: 'ar-SA', family: 'Semitic', script: 'Arabic', rtl: true, flag: '🇸🇦', popular: true, region: 'Middle East & Africa' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', locale: 'he-IL', bcp47: 'he-IL', family: 'Semitic', script: 'Hebrew', rtl: true, flag: '🇮🇱', region: 'Middle East & Africa' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', locale: 'tr-TR', bcp47: 'tr-TR', family: 'Turkic', script: 'Latin', rtl: false, flag: '🇹🇷', region: 'Middle East & Africa' },

  // Latin America
  { code: 'pt', name: 'Portuguese (Brazil)', nativeName: 'Português', locale: 'pt-BR', bcp47: 'pt-BR', family: 'Romance', script: 'Latin', rtl: false, flag: '🇧🇷', popular: true, region: 'Latin America' },

  // Oceania
  { code: 'en', name: 'English (Australia)', nativeName: 'English', locale: 'en-AU', bcp47: 'en-AU', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇦🇺', region: 'Oceania' },
];

// Regional organization replaces family-based organization
export const LANGUAGE_REGIONS = {
  'North America': ['en', 'es', 'fr'],
  'Europe': ['de', 'fr', 'it', 'es', 'pt', 'nl', 'sv', 'no', 'da', 'ru', 'pl', 'uk', 'cs', 'bg', 'sr', 'ro', 'ca', 'fi', 'hu', 'el'],
  'Asia': ['zh', 'ja', 'ko', 'hi', 'th', 'vi', 'id', 'ms'],
  'Middle East & Africa': ['ar', 'he', 'tr'],
  'Latin America': ['pt', 'es'],
  'Oceania': ['en'],
};

// Keep old LANGUAGE_FAMILIES for backwards compatibility but mark as deprecated
export const LANGUAGE_FAMILIES = {
  'Germanic': ['en', 'de', 'nl', 'sv', 'no', 'da'],
  'Romance': ['es', 'fr', 'it', 'pt', 'ro', 'ca'],
  'Slavic': ['ru', 'pl', 'uk', 'cs', 'bg', 'sr'],
  'East Asian': ['zh', 'ja', 'ko'],
  'Semitic': ['ar', 'he'],
  'Other': ['tr', 'hi', 'th', 'vi', 'id', 'ms', 'fi', 'hu', 'el'],
};

export const getLanguageByCode = (code: string): Language | undefined => {
  return LANGUAGES.find(lang => lang.code === code);
};

export const getLanguagesByFamily = (family: string): Language[] => {
  return LANGUAGES.filter(lang => lang.family === family);
};

export const getLanguagesByRegion = (region: string): Language[] => {
  return LANGUAGES.filter(lang => lang.region === region);
};

export const getAllRegions = (): string[] => {
  return Object.keys(LANGUAGE_REGIONS);
};

export const getPopularLanguages = (): Language[] => {
  return LANGUAGES.filter(lang => lang.popular);
};

export const searchLanguages = (query: string): Language[] => {
  const lowerQuery = query.toLowerCase();
  return LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(lowerQuery) ||
    lang.nativeName.toLowerCase().includes(lowerQuery) ||
    lang.code.toLowerCase().includes(lowerQuery)
  );
};
