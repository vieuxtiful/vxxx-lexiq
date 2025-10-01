import React, { useState } from 'react';
import { WelcomeScreen } from '@/components/lexiq/WelcomeScreen';
import { LanguageSelector } from '@/components/lexiq/LanguageSelector';
import { DomainSelector } from '@/components/lexiq/DomainSelector';
import { EnhancedMainInterface } from '@/components/lexiq/EnhancedMainInterface';
import { FloatingBackground } from '@/components/lexiq/FloatingBackground';

type AppStep = 'welcome' | 'language' | 'domain' | 'main';

const Index = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>('welcome');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTransition = (nextStep: AppStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(nextStep);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 400);
  };

  const handleLanguageSelect = (language: string) => {
    setSelectedLanguage(language);
    handleTransition('domain');
  };

  const handleDomainSelect = (domain: string) => {
    setSelectedDomain(domain);
    handleTransition('main');
  };

  const handleReturnToWelcome = () => {
    handleTransition('welcome');
    setSelectedLanguage('');
    setSelectedDomain('');
  };

  const handleReturnToLanguage = () => {
    handleTransition('language');
    setSelectedDomain('');
  };

  const handleReturnToDomain = () => {
    handleTransition('domain');
  };

  return (
    <div 
      className="min-h-screen h-screen relative overflow-hidden" 
      style={currentStep !== 'main' ? { background: 'var(--gradient-welcome)' } : undefined}
    >
      {/* Persistent floating background for welcome, language, and domain steps */}
      {currentStep !== 'main' && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <FloatingBackground />
        </div>
      )}
      
      <div className="relative z-10 h-full">
        <div 
          className={`h-full transition-all duration-500 ease-out ${
            isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          {currentStep === 'welcome' && (
            <WelcomeScreen onEnter={() => handleTransition('language')} />
          )}
          {currentStep === 'language' && (
            <LanguageSelector 
              onSelect={handleLanguageSelect}
              onBack={handleReturnToWelcome}
            />
          )}
          {currentStep === 'domain' && (
            <DomainSelector 
              onSelect={handleDomainSelect} 
              selectedLanguage={selectedLanguage}
              onBack={handleReturnToLanguage}
            />
          )}
          {currentStep === 'main' && (
            <EnhancedMainInterface
              onReturn={handleReturnToDomain}
              onReturnToWelcome={handleReturnToWelcome}
              selectedLanguage={selectedLanguage}
              selectedDomain={selectedDomain}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
