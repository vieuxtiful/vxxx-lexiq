import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, ArrowLeft, Search, Star } from 'lucide-react';
import { LANGUAGES, LANGUAGE_FAMILIES, getPopularLanguages, searchLanguages } from '@/lib/languageData';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { Badge } from '@/components/ui/badge';

interface LanguageSelectorProps {
  onSelect: (language: string) => void;
  onBack: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onSelect, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('popular');
  const { defaults, recordLanguageUse } = useSmartDefaults();

  const popularLanguages = useMemo(() => getPopularLanguages(), []);

  const filteredLanguages = useMemo(() => {
    if (searchQuery) {
      return searchLanguages(searchQuery);
    }
    
    if (selectedTab === 'popular') {
      return popularLanguages;
    }
    
    if (selectedTab === 'all') {
      return LANGUAGES;
    }
    
    // Family-based filtering
    const familyCodes = LANGUAGE_FAMILIES[selectedTab as keyof typeof LANGUAGE_FAMILIES];
    return LANGUAGES.filter(lang => familyCodes?.includes(lang.code));
  }, [searchQuery, selectedTab, popularLanguages]);

  const handleSelect = async (code: string) => {
    await recordLanguageUse(code);
    onSelect(code);
  };

  return (
    <div className="h-full relative flex items-center justify-center p-6">
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      
      <Card className="w-full max-w-4xl animate-fade-in relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-primary/10">
              <Globe className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Select Your Working Language</CardTitle>
          <CardDescription className="text-base">
            Choose the language you'll be working in for translation QA.
            {defaults.lastLanguage && (
              <Badge variant="secondary" className="ml-2">
                <Star className="h-3 w-3 mr-1" />
                Last used: {LANGUAGES.find(l => l.code === defaults.lastLanguage)?.name}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="Germanic">Germanic</TabsTrigger>
              <TabsTrigger value="Romance">Romance</TabsTrigger>
              <TabsTrigger value="Slavic">Slavic</TabsTrigger>
              <TabsTrigger value="East Asian">Asian</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {filteredLanguages.map((lang) => (
                  <Button
                    key={lang.code}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center space-y-1 hover:bg-primary/10 hover:border-primary transition-all relative"
                    onClick={() => handleSelect(lang.code)}
                  >
                    {lang.code === defaults.lastLanguage && (
                      <Star className="absolute top-1 right-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
                    )}
                    <span className="text-3xl">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                    <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
                  </Button>
                ))}
              </div>
              {filteredLanguages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No languages found matching "{searchQuery}"
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
