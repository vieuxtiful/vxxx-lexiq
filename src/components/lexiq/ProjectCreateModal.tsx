import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageCombobox } from '@/components/ui/language-combobox';
import { DomainCombobox } from '@/components/ui/domain-combobox';
import { useSmartDefaults } from '@/hooks/useSmartDefaults';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, language: string, domain: string) => void;
}

export const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const { defaults } = useSmartDefaults();
  const [projectName, setProjectName] = useState('');
  const [language, setLanguage] = useState(defaults.lastLanguage || 'en');
  const [domain, setDomain] = useState(defaults.lastDomain || 'general');
  const [errors, setErrors] = useState<{ projectName?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (projectName.trim().length < 2) {
      setErrors({ projectName: 'Project name must be at least 2 characters' });
      return;
    }

    onCreate(projectName.trim(), language, domain);
    setProjectName('');
    setLanguage('en');
    setDomain('general');
    setErrors({});
  };

  const handleClose = () => {
    setProjectName('');
    setLanguage('en');
    setDomain('general');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Set up a new translation project with your preferred language and domain settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                setErrors({});
              }}
              placeholder="Enter project name..."
              autoFocus
              className={errors.projectName ? 'border-destructive' : ''}
            />
            {errors.projectName && (
              <p className="text-sm text-destructive">{errors.projectName}</p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <LanguageCombobox
                value={language}
                onValueChange={setLanguage}
                placeholder="Select language..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <DomainCombobox
                value={domain}
                onValueChange={setDomain}
                placeholder="Select domain..."
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Create Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
