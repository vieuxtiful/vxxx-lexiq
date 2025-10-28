import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckSquare, Info } from 'lucide-react';

interface TermValidatorSettingsProps {
  renderValidatedAsNormal: boolean;
  onToggle: (enabled: boolean) => void;
}

export const TermValidatorSettings: React.FC<TermValidatorSettingsProps> = ({
  renderValidatedAsNormal,
  onToggle,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          Term Validator Settings
        </CardTitle>
        <CardDescription>
          Configure how validated terms are displayed in the editor
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="render-normal" className="text-base font-medium">
              Render Validated Terms as Normal Text
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, validated terms will appear as regular text instead of maintaining green highlighting
            </p>
          </div>
          <Switch
            id="render-normal"
            checked={renderValidatedAsNormal}
            onCheckedChange={onToggle}
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>Enabled:</strong> Validated terms blend into surrounding text for a clean, distraction-free experience</li>
              <li><strong>Disabled (Default):</strong> Validated terms retain green highlighting to show they've been approved</li>
              <li>This setting applies immediately to all validated terms in the current document</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
