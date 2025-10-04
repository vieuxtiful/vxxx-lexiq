import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Star, Sparkles } from 'lucide-react';
import { DOMAINS, DOMAIN_CATEGORIES, getDomainById, searchDomains } from '@/lib/domainData';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';
import { Badge } from '@/components/ui/badge';
import { getLanguageByCode } from '@/lib/languageData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DomainSelectorProps {
  onSelect: (domain: string) => void;
  selectedLanguage: string;
  onBack: () => void;
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({ 
  onSelect, 
  selectedLanguage,
  onBack 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('popular');
  const { defaults, recordDomainUse } = useSmartDefaults();

  const language = getLanguageByCode(selectedLanguage);

  const filteredDomains = useMemo(() => {
    if (searchQuery) {
      return searchDomains(searchQuery);
    }
    
    if (selectedTab === 'popular') {
      return DOMAINS.filter(d => d.popular);
    }
    
    if (selectedTab === 'all') {
      return DOMAINS;
    }
    
    // Category-based filtering
    return DOMAIN_CATEGORIES[selectedTab as keyof typeof DOMAIN_CATEGORIES]?.domains || [];
  }, [searchQuery, selectedTab]);

  const handleSelect = async (domainId: string) => {
    await recordDomainUse(domainId);
    onSelect(domainId);
  };

  const generalDomain = DOMAINS.find(d => d.id === 'general');

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
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Select Your Domain</CardTitle>
          <CardDescription className="text-base">
            Choose the specialized area for your {language?.name} translation work.
            {defaults.lastDomain && (
              <Badge variant="secondary" className="ml-2">
                <Star className="h-3 w-3 mr-1" />
                Last used: {getDomainById(defaults.lastDomain)?.name}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* General Translation - Always Visible */}
          {generalDomain && !searchQuery && (
            <Button
              variant="outline"
              className="w-full h-16 flex items-center justify-start gap-4 hover:bg-primary/10 hover:border-primary transition-all relative"
              onClick={() => handleSelect(generalDomain.id)}
            >
              {generalDomain.id === defaults.lastDomain && (
                <Star className="absolute top-2 right-2 h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
              <generalDomain.icon className={`h-8 w-8 ${generalDomain.color}`} />
              <div className="flex flex-col items-start">
                <span className="text-lg font-medium">{generalDomain.name}</span>
                <span className="text-xs text-muted-foreground">{generalDomain.description}</span>
              </div>
            </Button>
          )}

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="specialized">Specialized</TabsTrigger>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="creative">Creative</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              <TooltipProvider>
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredDomains
                    .filter(d => d.id !== 'general') // Exclude general from grid since it's always shown
                    .map((domain) => (
                      <Tooltip key={domain.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-28 flex flex-col items-center justify-center space-y-2 hover:bg-primary/10 hover:border-primary transition-all relative p-4"
                            onClick={() => handleSelect(domain.id)}
                          >
                            {domain.id === defaults.lastDomain && (
                              <Star className="absolute top-2 right-2 h-3 w-3 text-yellow-500 fill-yellow-500" />
                            )}
                            <domain.icon className={`h-8 w-8 ${domain.color}`} />
                            <span className="text-sm font-medium text-center">{domain.name}</span>
                          </Button>
                        </TooltipTrigger>
                        {domain.description && (
                          <TooltipContent 
                            side="top" 
                            className="max-w-xs p-3 text-sm animate-in fade-in-0 zoom-in-95"
                          >
                            {domain.description}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                </div>
              </TooltipProvider>
              {filteredDomains.filter(d => d.id !== 'general').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No domains found matching "{searchQuery}"
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
