import React, { useState } from 'react';
import { Hand, Languages, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { LanguageCombobox } from '@/components/ui/language-combobox';
import { DomainCombobox } from '@/components/ui/domain-combobox';
import { useAuth } from '@/hooks/useAuth';

interface ProjectSetupWizardProps {
  isOpen: boolean;
  onComplete: (projectName: string, language: string, domain: string, projectType: 'monolingual' | 'bilingual', sourceLanguage?: string) => void;
  onSkip?: () => void;
}

export const ProjectSetupWizard: React.FC<ProjectSetupWizardProps> = ({
  isOpen,
  onComplete,
  onSkip
}) => {
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState<'monolingual' | 'bilingual'>('monolingual');
  const [projectName, setProjectName] = useState('My Translation Project');
  const [language, setLanguage] = useState('en');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [domain, setDomain] = useState('general');
  const { signOut } = useAuth();

  const handleComplete = () => {
    onComplete(projectName, language, domain, projectType, projectType === 'bilingual' ? sourceLanguage : undefined);
    // Reset for next time
    setStep(1);
    setProjectType('monolingual');
    setProjectName('My Translation Project');
    setLanguage('en');
    setSourceLanguage('en');
    setDomain('general');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onSkip?.()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6">
          {/* Header with Step-Specific Icons */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                {step === 1 && (
                  <Hand className="w-12 h-12 text-primary animate-wave" />
                )}
                {step === 2 && (
                  <FileText className="w-12 h-12 text-primary" />
                )}
                {step === 3 && (
                  <Languages className="w-12 h-12 text-primary" />
                )}
                {step === 4 && (
                  <Languages className="w-12 h-12 text-primary" />
                )}
              </div>
            </div>
            <h2 className="text-2xl font-bold">
              {step === 1 && 'Welcome to LexiQ!'}
              {step === 2 && 'Choose Project Type'}
              {step === 3 && 'Choose Your Language'}
              {step === 4 && 'Select Domain'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {step === 1 && "Let's set up your first project to get started."}
              {step === 2 && 'Will you be working with source and target text?'}
              {step === 3 && projectType === 'bilingual' ? 'Select source and target languages' : 'What language will you be working with?'}
              {step === 4 && 'What domain best describes your content?'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center mb-8">
            {[1, 2, 3, 4].map((stepNumber) => (
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
                {stepNumber < 4 && (
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

          {/* Step 2: Project Type Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">Project Type</Label>
              
              <Card 
                className={`cursor-pointer transition-all ${projectType === 'monolingual' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setProjectType('monolingual')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-semibold">Monolingual Project</h4>
                      <p className="text-sm text-muted-foreground">
                        I only have target text (translation output)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formats: .txt, .doc, .docx, .odt, .json, .yml, .csv, .xlsx
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all ${projectType === 'bilingual' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setProjectType('bilingual')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Languages className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-semibold">Bilingual Project</h4>
                      <p className="text-sm text-muted-foreground">
                        I have both source and target text
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formats: .sdlxliff, .xliff, .tmx, .po, .mqxliff, .txlf, .csv, .xlsx
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

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

          {/* Step 3: Language Selection */}
          {step === 3 && (
            <div className="space-y-4">
              {projectType === 'bilingual' ? (
                <>
                  <div>
                    <Label htmlFor="source-language" className="text-sm font-medium">
                      Source Language
                    </Label>
                    <LanguageCombobox
                      value={sourceLanguage}
                      onValueChange={setSourceLanguage}
                      placeholder="Select source language..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="target-language" className="text-sm font-medium">
                      Target Language
                    </Label>
                    <LanguageCombobox
                      value={language}
                      onValueChange={setLanguage}
                      placeholder="Select target language..."
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="language" className="text-sm font-medium">
                    Target Language
                  </Label>
                  <LanguageCombobox
                    value={language}
                    onValueChange={setLanguage}
                  />
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Domain Selection */}
          {step === 4 && (
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
                  onClick={() => setStep(3)}
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
        
        {/* Return to Home Link */}
        <div className="text-center pb-6">
          <button
            onClick={() => signOut()}
            className="text-sm text-foreground/40 hover:text-foreground/60 transition-colors underline"
          >
            Return to Home
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};