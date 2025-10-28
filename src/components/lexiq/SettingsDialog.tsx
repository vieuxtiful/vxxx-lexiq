import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { HotMatchModeSettings } from './HotMatchModeSettings';
import { TermValidatorSettings } from './TermValidatorSettings';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Hot Match settings
  hotMatchModeEnabled: boolean;
  onHotMatchToggle: (enabled: boolean) => void;
  lqaCompatible: boolean;
  onLQAToggle: (enabled: boolean) => void;
  // Term Validator settings
  renderValidatedAsNormal: boolean;
  onValidatedRenderToggle: (enabled: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onOpenChange,
  hotMatchModeEnabled,
  onHotMatchToggle,
  lqaCompatible,
  onLQAToggle,
  renderValidatedAsNormal,
  onValidatedRenderToggle,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure application behavior and feature settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="hot-match" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hot-match">Hot Match</TabsTrigger>
            <TabsTrigger value="term-validator">Term Validator</TabsTrigger>
          </TabsList>

          <TabsContent value="hot-match" className="space-y-4 mt-4">
            <HotMatchModeSettings
              isEnabled={hotMatchModeEnabled}
              onToggle={onHotMatchToggle}
              lqaCompatible={lqaCompatible}
              onLQAToggle={onLQAToggle}
            />
          </TabsContent>

          <TabsContent value="term-validator" className="space-y-4 mt-4">
            <TermValidatorSettings
              renderValidatedAsNormal={renderValidatedAsNormal}
              onToggle={onValidatedRenderToggle}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
