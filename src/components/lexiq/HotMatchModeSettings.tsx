import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import HotMatchIconColor from './HotMatchIcon(Color).png';

interface HotMatchModeSettingsProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  lqaCompatible: boolean;
  onLQAToggle: (enabled: boolean) => void;
}

export const HotMatchModeSettings: React.FC<HotMatchModeSettingsProps> = ({
  isEnabled,
  onToggle,
  lqaCompatible,
  onLQAToggle,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <img src={HotMatchIconColor} alt="Hot Match" className="h-5 w-5" />
          Hot Match Mode
          <Badge variant="outline" className="ml-2">Beta</Badge>
        </CardTitle>
        <CardDescription>
          Domain-specific translation enhancement powered by our Python backend
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="hotmatch-enabled" className="text-base font-medium">
              Enable Hot Match Mode
            </Label>
            <p className="text-sm text-muted-foreground">
              Replace GTV flagging with Hot Match recommendations
            </p>
          </div>
          <Switch
            id="hotmatch-enabled"
            checked={isEnabled}
            onCheckedChange={onToggle}
          />
        </div>

        {isEnabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>GTV mode will be disabled</strong> while Hot Match is active. 
              Your previous GTV settings will be restored when you disable Hot Match.
            </AlertDescription>
          </Alert>
        )}

        {isEnabled && (
          <div className="flex items-center justify-between space-x-2 pt-2 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="hotmatch-lqa" className="text-base font-medium">
                LQA Compatibility
              </Label>
              <p className="text-sm text-muted-foreground">
                Keep spelling and grammar checks alongside Hot Match
              </p>
            </div>
            <Switch
              id="hotmatch-lqa"
              checked={lqaCompatible}
              onCheckedChange={onLQAToggle}
            />
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>Leverages community-driven term preferences</li>
              <li>Provides context-aware recommendations</li>
              <li>Visual effects: hot pink gradient with animated flares</li>
              <li>Performance optimized for mobile devices</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};