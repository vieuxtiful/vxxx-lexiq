import React, { useState } from 'react';
import { Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageCombobox } from '@/components/ui/language-combobox';
import { DomainCombobox } from '@/components/ui/domain-combobox';

interface ProjectSetupWizardProps {
  isOpen: boolean;
  onComplete: (projectName: string, language: string, domain: string) => void;
  onSkip?: () => void;
}

export const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  isOpen,
  onComplete,
  onSkip
}) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('My Translation Project');
  const [language, setLanguage] = useState('en');
  const [domain, setDomain] = useState('general');

  const handleComplete = () => {
    onComplete(projectName, language, domain);
    // Reset for next time
    setStep(1);
    setProjectName('My Translation Project');
    setLanguage('en');
    setDomain('general');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Rocket className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">
              {step === 1 && 'Welcome to LexiQ!'}
              {step === 2 && 'Choose Your Language'}
              {step === 3 && 'Select Domain'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {step === 1 && "Let's set up your first project to get started."}
              {step === 2 && 'What language will you be working with?'}
              {step === 3 && 'What domain best describes your content?'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex items-center ${
                  stepNumber > 1 ? 'flex-1' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    stepNumber === step
                      ? 'bg-primary text-primary-foreground'
                      : stepNumber < step
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-colors ${
                      stepNumber < step ? 'bg-green-500' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Project Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="project-name" className="text-sm font-medium">
                  Project Name
                </Label>
                <Input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="mt-2"
                  placeholder="Enter project name..."
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full"
                disabled={!projectName.trim()}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Language Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="language" className="text-sm font-medium">
                  Primary Language
                </Label>
                <LanguageCombobox
                  value={language}
                  onValueChange={setLanguage}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Domain Selection */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="domain" className="text-sm font-medium">
                  Content Domain
                </Label>
                <DomainCombobox
                  value={domain}
                  onValueChange={setDomain}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  This helps tailor the analysis to your specific content type.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Create Project
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
