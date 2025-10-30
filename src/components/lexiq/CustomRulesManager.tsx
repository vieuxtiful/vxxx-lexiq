import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit, Save, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { lexiqApi } from '@/lib/lexiqApiClient';

interface Rule {
  rule_id: string;
  name: string;
  rule_type: string;
  severity: string;
  enabled: boolean;
  config: any;
}

export const CustomRulesManager: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // New rule form state
  const [newRule, setNewRule] = useState({
    rule_id: '',
    name: '',
    rule_type: 'regex',
    severity: 'medium',
    pattern: '',
    should_match: false,
    forbidden_terms: '',
    required_terms: '',
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const response = await lexiqApi.listCustomRules();
      setRules(response.rules || []);
    } catch (error) {
      console.error('Failed to load rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom rules',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.rule_id || !newRule.name) {
      toast({
        title: 'Validation Error',
        description: 'Rule ID and Name are required',
        variant: 'destructive',
      });
      return;
    }

    const ruleConfig: any = {
      rule_id: newRule.rule_id,
      name: newRule.name,
      rule_type: newRule.rule_type,
      severity: newRule.severity,
      config: {},
    };

    // Build config based on rule type
    if (newRule.rule_type === 'regex') {
      ruleConfig.config = {
        pattern: newRule.pattern,
        should_match: newRule.should_match,
        case_sensitive: true,
        apply_to: 'target',
      };
    } else if (newRule.rule_type === 'forbidden_term') {
      ruleConfig.config = {
        forbidden_terms: newRule.forbidden_terms.split(',').map((t) => t.trim()),
        case_sensitive: false,
        whole_word_only: true,
      };
    } else if (newRule.rule_type === 'required_term') {
      ruleConfig.config = {
        required_terms: newRule.required_terms.split(',').map((t) => t.trim()),
        case_sensitive: false,
        require_all: true,
      };
    }

    try {
      await lexiqApi.addCustomRule(ruleConfig);
      toast({
        title: 'Success',
        description: `Rule "${newRule.name}" created successfully`,
      });
      setIsCreating(false);
      resetForm();
      loadRules();
    } catch (error) {
      console.error('Failed to create rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create rule',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await lexiqApi.deleteCustomRule(ruleId);
      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
      });
      loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setNewRule({
      rule_id: '',
      name: '',
      rule_type: 'regex',
      severity: 'medium',
      pattern: '',
      should_match: false,
      forbidden_terms: '',
      required_terms: '',
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Custom QA Rules</strong> - Create domain-specific validation rules with regex patterns, forbidden terms, and required terms.
        </AlertDescription>
      </Alert>

      {/* Create New Rule Button */}
      {!isCreating && (
        <Button onClick={() => setIsCreating(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create New Rule
        </Button>
      )}

      {/* Create Rule Form */}
      {isCreating && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Create New Rule</CardTitle>
            <CardDescription>Define a custom validation rule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-id">Rule ID *</Label>
                <Input
                  id="rule-id"
                  placeholder="e.g., no_abbreviations"
                  value={newRule.rule_id}
                  onChange={(e) => setNewRule({ ...newRule, rule_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-name">Rule Name *</Label>
                <Input
                  id="rule-name"
                  placeholder="e.g., No Abbreviations"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-type">Rule Type</Label>
                <Select value={newRule.rule_type} onValueChange={(value) => setNewRule({ ...newRule, rule_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regex">Regex Pattern</SelectItem>
                    <SelectItem value="forbidden_term">Forbidden Terms</SelectItem>
                    <SelectItem value="required_term">Required Terms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select value={newRule.severity} onValueChange={(value) => setNewRule({ ...newRule, severity: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rule-type specific fields */}
            {newRule.rule_type === 'regex' && (
              <div className="space-y-2">
                <Label htmlFor="pattern">Regex Pattern</Label>
                <Input
                  id="pattern"
                  placeholder="e.g., \\b[A-Z]{2,}\\b"
                  value={newRule.pattern}
                  onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">Pattern to match (or avoid if should_match is false)</p>
              </div>
            )}

            {newRule.rule_type === 'forbidden_term' && (
              <div className="space-y-2">
                <Label htmlFor="forbidden-terms">Forbidden Terms (comma-separated)</Label>
                <Textarea
                  id="forbidden-terms"
                  placeholder="e.g., utilize, leverage, utilize"
                  value={newRule.forbidden_terms}
                  onChange={(e) => setNewRule({ ...newRule, forbidden_terms: e.target.value })}
                />
              </div>
            )}

            {newRule.rule_type === 'required_term' && (
              <div className="space-y-2">
                <Label htmlFor="required-terms">Required Terms (comma-separated)</Label>
                <Textarea
                  id="required-terms"
                  placeholder="e.g., disclaimer, copyright notice"
                  value={newRule.required_terms}
                  onChange={(e) => setNewRule({ ...newRule, required_terms: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreateRule} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Active Rules ({rules.length})</h3>
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading rules...
            </CardContent>
          </Card>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No custom rules defined. Create your first rule to get started.
            </CardContent>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.rule_id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{rule.name}</h4>
                      <Badge variant="outline">{rule.rule_type}</Badge>
                      <Badge className={getSeverityColor(rule.severity)}>{rule.severity}</Badge>
                      {rule.enabled ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">Rule ID: {rule.rule_id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.rule_id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
