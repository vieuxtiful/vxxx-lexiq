import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, language: string, domain: string) => void;
}

const languages = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Spanish', flag: '🇪🇸' },
  { value: 'fr', label: 'French', flag: '🇫🇷' },
  { value: 'de', label: 'German', flag: '🇩🇪' },
  { value: 'it', label: 'Italian', flag: '🇮🇹' },
  { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { value: 'ko', label: 'Korean', flag: '🇰🇷' },
  { value: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { value: 'th', label: 'Thai', flag: '🇹🇭' },
];

const domains = [
  { value: 'general', label: 'General', icon: '📝' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'medical', label: 'Medical', icon: '🏥' },
  { value: 'legal', label: 'Legal', icon: '⚖️' },
  { value: 'finance', label: 'Finance', icon: '💰' },
  { value: 'academic', label: 'Academic', icon: '🎓' },
  { value: 'marketing', label: 'Marketing', icon: '📈' },
  { value: 'engineering', label: 'Engineering', icon: '🔧' }
];

export const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [projectName, setProjectName] = useState('');
  const [language, setLanguage] = useState('en');
  const [domain, setDomain] = useState('general');
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
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover z-[100]">
                  {languages.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.flag} {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger id="domain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover z-[100]">
                  {domains.map(dom => (
                    <SelectItem key={dom.value} value={dom.value}>
                      {dom.icon} {dom.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
