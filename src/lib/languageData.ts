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
}

export const LANGUAGES: Language[] = [
  // Germanic Languages
  { code: 'en', name: 'English', nativeName: 'English', locale: 'en-US', bcp47: 'en-US', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇺🇸', popular: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', locale: 'de-DE', bcp47: 'de-DE', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇩🇪', popular: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', locale: 'nl-NL', bcp47: 'nl-NL', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', locale: 'sv-SE', bcp47: 'sv-SE', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', locale: 'no-NO', bcp47: 'no-NO', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', locale: 'da-DK', bcp47: 'da-DK', family: 'Germanic', script: 'Latin', rtl: false, flag: '🇩🇰' },

  // Romance Languages
  { code: 'es', name: 'Spanish', nativeName: 'Español', locale: 'es-ES', bcp47: 'es-ES', family: 'Romance', script: 'Latin', rtl: false, flag: '🇪🇸', popular: true },
  { code: 'fr', name: 'French', nativeName: 'Français', locale: 'fr-FR', bcp47: 'fr-FR', family: 'Romance', script: 'Latin', rtl: false, flag: '🇫🇷', popular: true },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', locale: 'it-IT', bcp47: 'it-IT', family: 'Romance', script: 'Latin', rtl: false, flag: '🇮🇹', popular: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', locale: 'pt-PT', bcp47: 'pt-PT', family: 'Romance', script: 'Latin', rtl: false, flag: '🇵🇹', popular: true },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', locale: 'ro-RO', bcp47: 'ro-RO', family: 'Romance', script: 'Latin', rtl: false, flag: '🇷🇴' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', locale: 'ca-ES', bcp47: 'ca-ES', family: 'Romance', script: 'Latin', rtl: false, flag: '' },

  // Slavic Languages
  { code: 'ru', name: 'Russian', nativeName: 'Русский', locale: 'ru-RU', bcp47: 'ru-RU', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇷🇺', popular: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', locale: 'pl-PL', bcp47: 'pl-PL', family: 'Slavic', script: 'Latin', rtl: false, flag: '🇵🇱' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', locale: 'uk-UA', bcp47: 'uk-UA', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇺🇦' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', locale: 'cs-CZ', bcp47: 'cs-CZ', family: 'Slavic', script: 'Latin', rtl: false, flag: '🇨🇿' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', locale: 'bg-BG', bcp47: 'bg-BG', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇧🇬' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', locale: 'sr-RS', bcp47: 'sr-RS', family: 'Slavic', script: 'Cyrillic', rtl: false, flag: '🇷🇸' },

  // East Asian Languages
  { code: 'zh', name: 'Chinese', nativeName: '中文', locale: 'zh-CN', bcp47: 'zh-CN', family: 'Sino-Tibetan', script: 'Han', rtl: false, flag: '🇨🇳', popular: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', locale: 'ja-JP', bcp47: 'ja-JP', family: 'Japonic', script: 'Kanji/Hiragana', rtl: false, flag: '🇯🇵', popular: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', locale: 'ko-KR', bcp47: 'ko-KR', family: 'Koreanic', script: 'Hangul', rtl: false, flag: '🇰🇷', popular: true },

  // Other Languages
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', locale: 'ar-SA', bcp47: 'ar-SA', family: 'Semitic', script: 'Arabic', rtl: true, flag: '🇸🇦', popular: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', locale: 'he-IL', bcp47: 'he-IL', family: 'Semitic', script: 'Hebrew', rtl: true, flag: '🇮🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', locale: 'tr-TR', bcp47: 'tr-TR', family: 'Turkic', script: 'Latin', rtl: false, flag: '🇹🇷' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', locale: 'hi-IN', bcp47: 'hi-IN', family: 'Indo-Aryan', script: 'Devanagari', rtl: false, flag: '🇮🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', locale: 'th-TH', bcp47: 'th-TH', family: 'Tai-Kadai', script: 'Thai', rtl: false, flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', locale: 'vi-VN', bcp47: 'vi-VN', family: 'Austroasiatic', script: 'Latin', rtl: false, flag: '🇻🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', locale: 'id-ID', bcp47: 'id-ID', family: 'Austronesian', script: 'Latin', rtl: false, flag: '🇮🇩' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', locale: 'ms-MY', bcp47: 'ms-MY', family: 'Austronesian', script: 'Latin', rtl: false, flag: '🇲🇾' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', locale: 'fi-FI', bcp47: 'fi-FI', family: 'Uralic', script: 'Latin', rtl: false, flag: '🇫🇮' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', locale: 'hu-HU', bcp47: 'hu-HU', family: 'Uralic', script: 'Latin', rtl: false, flag: '🇭🇺' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', locale: 'el-GR', bcp47: 'el-GR', family: 'Hellenic', script: 'Greek', rtl: false, flag: '🇬🇷' },
];

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
