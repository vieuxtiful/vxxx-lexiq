import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, FileText, Play, TrendingUp, CheckCircle, 
  AlertCircle, BarChart3, Activity, BookOpen, Zap, ArrowLeft,
  Globe, Building, Settings, Palette
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnhancedLiveAnalysisPanel } from './EnhancedLiveAnalysisPanel';
import lexiqLogo from '@/assets/lexiq-logo.png';
import middleburyLogo from '@/assets/middlebury-logo.png';

interface EnhancedMainInterfaceProps {
  onReturn?: () => void;
  onReturnToWelcome?: () => void;
  selectedLanguage?: string;
  selectedDomain?: string;
}

// Mock data for enhanced features demonstration
const mockEnhancedAnalysisResults = {
  terms: [
    {
      text: "cybersecurity",
      startPosition: 4,
      endPosition: 17,
      classification: "valid",
      score: 0.95,
      frequency: 1,
      context: "The cybersecurity framework implementation",
      rationale: "High confidence term with semantic type: Entity",
      suggestions: ["information security", "cyber defense", "digital security"],
      semantic_type: {
        semantic_type: "Entity",
        ui_information: {
          category: "noun",
          color_code: "#4CAF50",
          description: "Concrete or abstract objects, people, places, or concepts",
          display_name: "Entity"
        }
      },
      ui_metadata: {
        confidence_level: "high",
        has_grammar_issues: false,
        grammar_severity: "none"
      }
    },
    {
      text: "implementation",
      startPosition: 28,
      endPosition: 42,
      classification: "review",
      score: 0.75,
      frequency: 1,
      context: "framework implementation requires comprehensive",
      rationale: "Medium confidence term requiring review. Type: Event",
      suggestions: ["deployment", "execution", "realization"],
      semantic_type: {
        semantic_type: "Event",
        ui_information: {
          category: "verb",
          color_code: "#FF9800",
          description: "Actions, processes, or states that occur over time",
          display_name: "Event"
        }
      },
      ui_metadata: {
        confidence_level: "medium",
        has_grammar_issues: false,
        grammar_severity: "none"
      }
    },
    {
      text: "requires",
      startPosition: 43,
      endPosition: 51,
      classification: "grammar",
      score: 0.60,
      frequency: 1,
      context: "implementation requires comprehensive validation",
      rationale: "Grammar issues detected: subject_verb_agreement",
      suggestions: ["require", "necessitates", "demands"],
      grammar_issues: [
        {
          rule: "subject_verb_agreement",
          severity: "medium",
          suggestion: "Check subject-verb agreement"
        }
      ],
      ui_metadata: {
        confidence_level: "medium",
        has_grammar_issues: true,
        grammar_severity: "medium"
      }
    },
    {
      text: "comprehensiv",
      startPosition: 52,
      endPosition: 64,
      classification: "spelling",
      score: 0.30,
      frequency: 1,
      context: "requires comprehensiv validation and testing",
      rationale: "Very low confidence - possible spelling error or unknown term",
      suggestions: ["comprehensive", "comprehensible", "complete"],
      ui_metadata: {
        confidence_level: "low",
        has_grammar_issues: false,
        grammar_severity: "none"
      }
    }
  ],
  statistics: {
    totalTerms: 4,
    validTerms: 1,
    reviewTerms: 1,
    criticalTerms: 0,
    qualityScore: 65.0,
    confidenceMin: 0.30,
    confidenceMax: 0.95,
    coverage: 25.0,
    grammarScore: 85.0,
    grammarIssues: 1,
    spellingIssues: 1
  },
  grammar_analysis: {
    text: "The cybersecurity framework implementation requires comprehensive validation and testing procedures.",
    language: "en",
    issues: [
      {
        rule: "subject_verb_agreement",
        severity: "medium",
        start_pos: 43,
        end_pos: 51,
        matched_text: "requires",
        suggestion: "Check subject-verb agreement"
      }
    ],
    grammar_score: 85.0,
    total_issues: 1
  }
};

export function EnhancedMainInterface({ 
  onReturn, 
  onReturnToWelcome,
  selectedLanguage: initialLanguage = 'en',
  selectedDomain: initialDomain = 'general'
}: EnhancedMainInterfaceProps) {
  const [translationFile, setTranslationFile] = useState<File | null>(null);
  const [glossaryFile, setGlossaryFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [engineReady, setEngineReady] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const [grammarCheckingEnabled, setGrammarCheckingEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedDomain, setSelectedDomain] = useState(initialDomain);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [currentContent, setCurrentContent] = useState('The cybersecurity framework implementation requires comprehensiv validation and testing procedures.');
  
  const translationInputRef = useRef<HTMLInputElement>(null);
  const glossaryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const languages = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'es', label: 'Spanish', flag: '🇪🇸' },
    { value: 'fr', label: 'French', flag: '🇫🇷' },
    { value: 'de', label: 'German', flag: '🇩🇪' },
    { value: 'it', label: 'Italian', flag: '🇮🇹' },
    { value: 'pt', label: 'Portuguese', flag: '🇵🇹' },
    { value: 'ja', label: 'Japanese', flag: '🇯🇵' },
    { value: 'zh', label: 'Chinese', flag: '🇨🇳' }
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

  const validateFile = (file: File): boolean => {
    const validExtensions = ['.txt', '.docx', '.json', '.csv', '.xml', '.po', '.tmx', '.xliff', '.xlf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    return validExtensions.includes(fileExtension);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'translation' | 'glossary') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateFile(file)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a supported file format (TXT, DOCX, JSON, CSV, XML, PO, TMX, XLIFF).",
        variant: "destructive",
      });
      return;
    }

    if (type === 'translation') {
      setTranslationFile(file);
      // Load file content for demonstration
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCurrentContent(content);
      };
      reader.readAsText(file);
    } else {
      setGlossaryFile(file);
    }

    toast({
      title: "File Uploaded",
      description: `${type} file "${file.name}" uploaded successfully.`,
    });
  };

  const runEnhancedAnalysis = async () => {
    if (!translationFile || !glossaryFile) {
      toast({
        title: "Missing Files",
        description: "Please upload both translation and glossary files.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisComplete(false);

    const steps = [
      { message: "🔬 Analyzing semantic types and context...", duration: 3000 },
      { message: "📝 Checking grammar and syntax...", duration: grammarCheckingEnabled ? 2500 : 1000 },
      { message: "🎯 Validating terminology consistency...", duration: 3500 },
      { message: "📊 Generating enhanced statistics...", duration: 2000 },
      { message: "✨ Preparing recommendations...", duration: 1500 },
      { message: "✅ Enhanced analysis complete", duration: 1000 }
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisStep(steps[i].message);
      setAnalysisProgress(((i + 1) / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
    }

    // Set mock results for demonstration
    setAnalysisResults(mockEnhancedAnalysisResults);
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    
    setTimeout(() => {
      setActiveTab('results');
    }, 1000);
    
    toast({
      title: "Enhanced Analysis Complete",
      description: `Analysis completed with ${grammarCheckingEnabled ? 'grammar checking' : 'standard checking'} for ${selectedLanguage} in ${selectedDomain} domain.`,
    });
  };

  const handleReanalyze = (content: string) => {
    console.log('Re-analyzing content with enhanced engine:', content);
    toast({
      title: "Re-analysis Triggered",
      description: "Content changes detected. Re-analyzing with enhanced engine...",
    });
  };

  const getSelectedLanguageInfo = () => {
    return languages.find(lang => lang.value === selectedLanguage);
  };

  const getSelectedDomainInfo = () => {
    return domains.find(domain => domain.value === selectedDomain);
  };

  const getClassificationColor = (classification: string): string => {
    switch (classification) {
      case 'valid':
        return '#22c55e';
      case 'review':
        return '#eab308';
      case 'critical':
        return '#ef4444';
      case 'spelling':
        return '#f97316';
      case 'grammar':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Enhanced Header */}
      <div className="bg-card border-b border-border/40 shadow-lexiq">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={onReturn}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                <img 
                  src={lexiqLogo} 
                  alt="LexiQ Logo" 
                  className="h-12 w-auto" 
                />
              </button>
              <img 
                src={middleburyLogo} 
                alt="Middlebury Institute Logo" 
                className="h-12 w-auto" 
              />
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Language and Domain Indicators */}
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {getSelectedLanguageInfo()?.flag} {getSelectedLanguageInfo()?.label}
                </Badge>
                <Building className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  {getSelectedDomainInfo()?.icon} {getSelectedDomainInfo()?.label}
                </Badge>
              </div>
              
              <Badge 
                variant="outline" 
                className={`${engineReady ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
              >
                <Activity className="h-3 w-3 mr-1" />
                {engineReady ? 'Enhanced Engine Ready' : 'Engine Not Ready'}
              </Badge>
              
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                Enhanced Demo
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel - Enhanced File Upload and Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Language and Domain Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <span>Analysis Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure language and domain for enhanced analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="language-select">Language</Label>
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger id="language-select">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="domain-select">Domain</Label>
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger id="domain-select">
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.value} value={domain.value}>
                          <div className="flex items-center gap-2">
                            <span>{domain.icon}</span>
                            <span>{domain.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="grammar-check"
                    checked={grammarCheckingEnabled}
                    onCheckedChange={setGrammarCheckingEnabled}
                  />
                  <Label htmlFor="grammar-check" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Enable Grammar Checking
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Translation File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Translation File</span>
                </CardTitle>
                <CardDescription>
                  Upload your translation document for enhanced analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => translationInputRef.current?.click()}
                >
                  {translationFile ? (
                    <>
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success animate-[scale-in_0.5s_ease-out]" />
                      <p className="text-xs text-success font-medium mb-2 animate-fade-in">File loaded successfully</p>
                    </>
                  ) : (
                    <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground mb-2">
                    {translationFile ? translationFile.name : 'Click to upload translation file'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported: TXT, DOCX, JSON, CSV, XML, PO, TMX, XLIFF
                  </p>
                </div>
                <input
                  ref={translationInputRef}
                  type="file"
                  accept=".txt,.docx,.json,.csv,.xml,.po,.tmx,.xliff,.xlf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'translation')}
                />
              </CardContent>
            </Card>

            {/* Glossary File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <span>Glossary File</span>
                </CardTitle>
                <CardDescription>
                  Upload your reference glossary for validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent/50 transition-colors cursor-pointer"
                  onClick={() => glossaryInputRef.current?.click()}
                >
                  {glossaryFile ? (
                    <>
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success animate-[scale-in_0.5s_ease-out]" />
                      <p className="text-xs text-success font-medium mb-2 animate-fade-in">File loaded successfully</p>
                    </>
                  ) : (
                    <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground mb-2">
                    {glossaryFile ? glossaryFile.name : 'Click to upload glossary file'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported: TXT, DOCX, JSON, CSV, XML, XLSX
                  </p>
                </div>
                <input
                  ref={glossaryInputRef}
                  type="file"
                  accept=".txt,.docx,.json,.csv,.xml,.xlsx"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'glossary')}
                />
              </CardContent>
            </Card>

            {/* Enhanced Analysis Controls */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={runEnhancedAnalysis}
                  disabled={!translationFile || !glossaryFile || isAnalyzing}
                  className="w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-3"
                >
                  {isAnalyzing ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Enhanced Analysis...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start Enhanced QA
                    </>
                  )}
                </Button>
                
                {grammarCheckingEnabled && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Grammar checking enabled
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Enhanced Results */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>Enhanced Live Analysis & Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="live">🔍 Enhanced Live</TabsTrigger>
                    <TabsTrigger value="results">📊 Results</TabsTrigger>
                    <TabsTrigger value="gatv">🛡️ GATV Analysis</TabsTrigger>
                    <TabsTrigger value="statistics">📈 Statistics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="live" className="mt-6">
                    {isAnalyzing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center mb-6">
                          <div className="relative">
                            <div 
                              className="w-16 h-16 rounded-full border-4"
                              style={{ borderColor: 'hsl(var(--loading-circle))' }}
                            ></div>
                            <div 
                              className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent loading-flare"
                              style={{ 
                                borderTopColor: 'hsl(var(--loading-flare-start))',
                                borderRightColor: 'hsl(var(--loading-flare-end))'
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Enhanced Analysis Progress</span>
                          <span className="text-sm font-medium">{Math.round(analysisProgress)}%</span>
                        </div>
                        <Progress value={analysisProgress} className="h-2" />
                        <div className="flex items-center justify-center">
                          <span className="text-sm font-medium transition-opacity duration-300">{analysisStep}</span>
                        </div>
                      </div>
                    ) : (
                      <EnhancedLiveAnalysisPanel
                        content={currentContent}
                        flaggedTerms={analysisResults?.terms || []}
                        onContentChange={setCurrentContent}
                        onReanalyze={handleReanalyze}
                        grammarCheckingEnabled={grammarCheckingEnabled}
                        onGrammarCheckingToggle={setGrammarCheckingEnabled}
                        selectedLanguage={selectedLanguage}
                        selectedDomain={selectedDomain}
                      />
                    )}
                  </TabsContent>
                  
                  <TabsContent value="results" className="mt-6">
                    <div className="space-y-4">
                      {analysisComplete && analysisResults ? (
                        <>
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Enhanced analysis completed successfully. Found {analysisResults.statistics.totalTerms} terms with {Math.round(analysisResults.statistics.qualityScore)}% quality score.
                              {grammarCheckingEnabled && ` Grammar score: ${Math.round(analysisResults.statistics.grammarScore)}%.`}
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Valid Terms</span>
                                  <Badge className="bg-success text-success-foreground">Valid</Badge>
                                </div>
                                <div className="text-2xl font-bold text-success mt-2">
                                  {Math.round((analysisResults.statistics.validTerms / analysisResults.statistics.totalTerms) * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {analysisResults.statistics.validTerms} of {analysisResults.statistics.totalTerms} terms
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Review Needed</span>
                                  <Badge variant="secondary">Review</Badge>
                                </div>
                                <div className="text-2xl font-bold text-yellow-600 mt-2">
                                  {analysisResults.statistics.reviewTerms}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Terms requiring attention
                                </div>
                              </CardContent>
                            </Card>
                            
                            {grammarCheckingEnabled && (
                              <Card>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Grammar Score</span>
                                    <Badge variant="outline" className="text-purple-600 border-purple-500">
                                      <Zap className="h-3 w-3 mr-1" />
                                      Grammar
                                    </Badge>
                                  </div>
                                  <div className="text-2xl font-bold text-purple-600 mt-2">
                                    {Math.round(analysisResults.statistics.grammarScore)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {analysisResults.statistics.grammarIssues} issues found
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                          
                          {/* Enhanced Term Breakdown */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Enhanced Term Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {analysisResults.terms.slice(0, 5).map((term: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <Badge 
                                        style={{ backgroundColor: getClassificationColor(term.classification) }}
                                        className="text-white"
                                      >
                                        {term.classification}
                                      </Badge>
                                      <span className="font-medium">{term.text}</span>
                                      {term.semantic_type?.ui_information && (
                                        <div className="flex items-center gap-1">
                                          <div 
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: term.semantic_type.ui_information.color_code }}
                                          ></div>
                                          <span className="text-xs text-muted-foreground">
                                            {term.semantic_type.ui_information.display_name}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {Math.round(term.score * 100)}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <div className="text-center space-y-4 py-12">
                          <Palette className="h-16 w-16 text-primary/50 mx-auto" />
                          <h3 className="text-xl font-semibold text-muted-foreground">Enhanced LexiQ Analysis</h3>
                          <p className="text-muted-foreground">
                            Upload your files and run enhanced analysis to see detailed results with semantic types and grammar checking.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="gatv" className="mt-6">
                    <div className="text-center space-y-4 py-12">
                      <BarChart3 className="h-16 w-16 text-primary/50 mx-auto" />
                      <h3 className="text-xl font-semibold text-muted-foreground">GATV Analysis</h3>
                      <p className="text-muted-foreground">
                        Advanced GATV (Grammar, Accuracy, Terminology, Validation) analysis will be displayed here after enhanced analysis completion.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="statistics" className="mt-6">
                    <div className="space-y-4">
                      {analysisResults ? (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-primary">
                                  {analysisResults.statistics.totalTerms}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Terms</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-success">
                                  {Math.round(analysisResults.statistics.qualityScore)}%
                                </div>
                                <div className="text-sm text-muted-foreground">Quality Score</div>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {Math.round(analysisResults.statistics.coverage)}%
                                </div>
                                <div className="text-sm text-muted-foreground">Coverage</div>
                              </CardContent>
                            </Card>
                            {grammarCheckingEnabled && (
                              <Card>
                                <CardContent className="p-4 text-center">
                                  <div className="text-2xl font-bold text-purple-600">
                                    {Math.round(analysisResults.statistics.grammarScore)}%
                                  </div>
                                  <div className="text-sm text-muted-foreground">Grammar</div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="text-center space-y-4 py-12">
                          <TrendingUp className="h-16 w-16 text-primary/50 mx-auto" />
                          <h3 className="text-xl font-semibold text-muted-foreground">Enhanced Statistics</h3>
                          <p className="text-muted-foreground">
                            Detailed statistics with grammar metrics and semantic type analysis will appear here after analysis.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EnhancedMainInterface;
