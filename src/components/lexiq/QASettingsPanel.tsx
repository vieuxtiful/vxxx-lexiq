import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, FileCheck, Database } from 'lucide-react';

interface QASettingsProps {
  consistencyChecksEnabled: boolean;
  onConsistencyToggle: (enabled: boolean) => void;
  structuralValidationEnabled: boolean;
  onStructuralToggle: (enabled: boolean) => void;
  customRulesEnabled: boolean;
  onCustomRulesToggle: (enabled: boolean) => void;
  tmConsistencyEnabled: boolean;
  onTMConsistencyToggle: (enabled: boolean) => void;
}

export const QASettingsPanel: React.FC<QASettingsProps> = ({
  consistencyChecksEnabled,
  onConsistencyToggle,
  structuralValidationEnabled,
  onStructuralToggle,
  customRulesEnabled,
  onCustomRulesToggle,
  tmConsistencyEnabled,
  onTMConsistencyToggle,
}) => {
  return (
    <div className="space-y-4">
      {/* Consistency Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            Consistency Checks
          </CardTitle>
          <CardDescription>
            Segment/term/case/punctuation consistency validation.
            Controlled by LQA selection in the main dropdown (no separate toggle).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Enabled automatically when LQA mode is selected (LQA or Both).
          </p>
        </CardContent>
      </Card>

      {/* Structural Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="h-5 w-5 text-green-500" />
            Structural Validation
          </CardTitle>
          <CardDescription>
            Numbers, tags, URLs/emails, whitespace, length ratio, special characters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="structural-enabled" className="text-base font-medium">
                Enable Structural Validation
              </Label>
              <p className="text-sm text-muted-foreground">
                Requires Source and Target content for best results.
              </p>
            </div>
            <Switch
              id="structural-enabled"
              checked={structuralValidationEnabled}
              onCheckedChange={onStructuralToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom QA Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Custom QA Rules
          </CardTitle>
          <CardDescription>
            User-defined regex patterns, forbidden terms, required terms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="custom-rules-enabled" className="text-base font-medium">
                Enable Custom Rules
              </Label>
              <p className="text-sm text-muted-foreground">
                Manage rules in the Rules tab.
              </p>
            </div>
            <Switch
              id="custom-rules-enabled"
              checked={customRulesEnabled}
              onCheckedChange={onCustomRulesToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* TM Consistency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-purple-500" />
            TM Consistency
          </CardTitle>
          <CardDescription>
            Flags differences from high-similarity TM matches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="tm-consistency-enabled" className="text-base font-medium">
                Enable TM Consistency Checks
              </Label>
              <p className="text-sm text-muted-foreground">
                Requires Source and Target content.
              </p>
            </div>
            <Switch
              id="tm-consistency-enabled"
              checked={tmConsistencyEnabled}
              onCheckedChange={onTMConsistencyToggle}
            />
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="text-sm">
          These toggles control additional backend validations merged into Results under the QA tab.
        </AlertDescription>
      </Alert>
    </div>
  );
};

