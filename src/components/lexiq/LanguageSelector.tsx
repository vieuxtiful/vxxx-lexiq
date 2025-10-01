import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Globe, ArrowLeft } from 'lucide-react';

interface LanguageSelectorProps {
  onSelect: (language: string) => void;
  onBack: () => void;
}

const LANGUAGES = [
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'FR', name: 'French', flag: '🇫🇷' },
  { code: 'DE', name: 'German', flag: '🇩🇪' },
  { code: 'IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'PT', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'ZH', name: 'Chinese', flag: '🇨🇳' },
  { code: 'JA', name: 'Japanese', flag: '🇯🇵' },
  { code: 'KO', name: 'Korean', flag: '🇰🇷' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect, onBack }) => {
  return (
    <div className="h-full relative flex items-center justify-center p-6">
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      
      <Card className="w-full max-w-3xl animate-fade-in relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Globe className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Select Your Working Language</CardTitle>
          <CardDescription className="text-base">
            This is the language you'll be working in for translation QA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {LANGUAGES.map((lang) => (
              <Button
                key={lang.code}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-1 hover:bg-primary/10 hover:border-primary transition-all"
                onClick={() => onSelect(lang.code)}
              >
                <span className="text-3xl">{lang.flag}</span>
                <span className="text-sm font-medium -mt-3">{lang.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
