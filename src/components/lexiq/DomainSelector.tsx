import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Heart, Scale, Cpu, GraduationCap, Home, Wrench, Palette, ArrowLeft } from 'lucide-react';

interface DomainSelectorProps {
  onSelect: (domain: string) => void;
  selectedLanguage: string;
  onBack: () => void;
}

const DOMAINS = [
  { id: 'medical', name: 'Medical & Healthcare', icon: Heart, color: 'text-red-500' },
  { id: 'legal', name: 'Legal', icon: Scale, color: 'text-blue-500' },
  { id: 'technical', name: 'Technical & Engineering', icon: Cpu, color: 'text-purple-500' },
  { id: 'business', name: 'Business & Finance', icon: Briefcase, color: 'text-green-500' },
  { id: 'academic', name: 'Academic & Research', icon: GraduationCap, color: 'text-yellow-500' },
  { id: 'general', name: 'General Translation', icon: Home, color: 'text-gray-500' },
  { id: 'manufacturing', name: 'Manufacturing & Industrial', icon: Wrench, color: 'text-orange-500' },
  { id: 'creative', name: 'Creative & Marketing', icon: Palette, color: 'text-pink-500' },
];

export const DomainSelector: React.FC<DomainSelectorProps> = ({ onSelect, selectedLanguage, onBack }) => {
  return (
    <div className="h-full relative flex items-center justify-center p-6">
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      
      <Card className="w-full max-w-4xl animate-fade-in relative z-10">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-3xl">Select Your Working Domain</CardTitle>
          <CardDescription className="text-base">
            This is the field to which your sector belongs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* General Translation - Full Width */}
            {(() => {
              const generalDomain = DOMAINS.find(d => d.id === 'general');
              if (!generalDomain) return null;
              const Icon = generalDomain.icon;
              return (
                <Button
                  key={generalDomain.id}
                  variant="outline"
                  className="w-full h-28 flex flex-col items-center justify-center space-y-3 hover:bg-primary/10 hover:border-primary transition-all group"
                  onClick={() => onSelect(generalDomain.id)}
                >
                  <Icon className={`h-8 w-8 ${generalDomain.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-sm font-medium text-center">{generalDomain.name}</span>
                </Button>
              );
            })()}
            
            {/* Remaining Domains - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DOMAINS.filter(d => d.id !== 'general').map((domain) => {
                const Icon = domain.icon;
                return (
                  <Button
                    key={domain.id}
                    variant="outline"
                    className="h-28 flex flex-col items-center justify-center space-y-3 hover:bg-primary/10 hover:border-primary transition-all group"
                    onClick={() => onSelect(domain.id)}
                  >
                    <Icon className={`h-8 w-8 ${domain.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-sm font-medium text-center">{domain.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
