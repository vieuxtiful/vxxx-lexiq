import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { HotMatchModeSettings } from './HotMatchModeSettings';
import { TermValidatorSettings } from './TermValidatorSettings';
import { QASettingsPanel } from './QASettingsPanel';
import { CustomRulesManager } from './CustomRulesManager';
import { TMPanel } from './TMPanel';
import { BatchProcessor } from './BatchProcessor';

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
  // QA engines (optional-safe)
  consistencyChecksEnabled?: boolean;
  onConsistencyToggle?: (enabled: boolean) => void;
  structuralValidationEnabled?: boolean;
  onStructuralToggle?: (enabled: boolean) => void;
  customRulesEnabled?: boolean;
  onCustomRulesToggle?: (enabled: boolean) => void;
  tmConsistencyEnabled?: boolean;
  onTMConsistencyToggle?: (enabled: boolean) => void;
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
  consistencyChecksEnabled = false,
  onConsistencyToggle = () => {},
  structuralValidationEnabled = false,
  onStructuralToggle = () => {},
  customRulesEnabled = false,
  onCustomRulesToggle = () => {},
  tmConsistencyEnabled = false,
  onTMConsistencyToggle = () => {},
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure application behavior and feature settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qa-settings" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="qa-settings">QA Engines</TabsTrigger>
            {customRulesEnabled && (
              <TabsTrigger value="custom-rules">Rules</TabsTrigger>
            )}
            <TabsTrigger value="tm">TM</TabsTrigger>
            <TabsTrigger value="batch">Batch</TabsTrigger>
            <TabsTrigger value="hot-match">Hot Match</TabsTrigger>
            <TabsTrigger value="term-validator">Terms</TabsTrigger>
          </TabsList>

          <TabsContent value="qa-settings" className="space-y-4 mt-4">
            <QASettingsPanel
              consistencyChecksEnabled={consistencyChecksEnabled}
              onConsistencyToggle={onConsistencyToggle}
              structuralValidationEnabled={structuralValidationEnabled}
              onStructuralToggle={onStructuralToggle}
              customRulesEnabled={customRulesEnabled}
              onCustomRulesToggle={onCustomRulesToggle}
              tmConsistencyEnabled={tmConsistencyEnabled}
              onTMConsistencyToggle={onTMConsistencyToggle}
            />
          </TabsContent>

          {customRulesEnabled && (
            <TabsContent value="custom-rules" className="space-y-4 mt-4">
              <CustomRulesManager />
            </TabsContent>
          )}

          <TabsContent value="tm" className="space-y-4 mt-4">
            <TMPanel />
          </TabsContent>

          <TabsContent value="batch" className="space-y-4 mt-4">
            <BatchProcessor />
          </TabsContent>

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
