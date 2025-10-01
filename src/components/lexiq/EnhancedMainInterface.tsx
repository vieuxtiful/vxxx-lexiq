import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  Upload, FileText, Play, TrendingUp, CheckCircle, 
  AlertCircle, BarChart3, Activity, BookOpen, Zap, ArrowLeft,
  Globe, Building, Download, Undo2, Redo2, Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalysisEngine } from '@/hooks/useAnalysisEngine';
import { transformAnalyzedTermsToFlagged } from '@/utils/analysisDataTransformer';
import { EnhancedLiveAnalysisPanel } from './EnhancedLiveAnalysisPanel';
import { EnhancedStatisticsTab } from './EnhancedStatisticsTab';
import { DataManagementTab } from './DataManagementTab';
import { QAChatPanel } from './QAChatPanel';
import { validateFile } from '@/utils/fileValidation';
import lexiqLogo from '@/assets/lexiq-logo.png';
import middleburyLogo from '@/assets/middlebury-logo.png';

interface EnhancedMainInterfaceProps {
  onReturn?: () => void;
  onReturnToWelcome?: () => void;
  selectedLanguage?: string;
  selectedDomain?: string;
}

interface HistoryState {
  content: string;
  timestamp: number;
}

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
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [engineReady, setEngineReady] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('edit');
  const [grammarCheckingEnabled, setGrammarCheckingEnabled] = useState(false);
  const [selectedLanguage] = useState(initialLanguage);
  const [selectedDomain] = useState(initialDomain);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [translationFileUploaded, setTranslationFileUploaded] = useState(false);
  const [glossaryFileUploaded, setGlossaryFileUploaded] = useState(false);
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const translationInputRef = useRef<HTMLInputElement>(null);
  const glossaryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { analyzeTranslation, isAnalyzing: engineAnalyzing, progress: engineProgress } = useAnalysisEngine();

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

  // Add to history when content changes
  const addToHistory = useCallback((content: string) => {
    const newState: HistoryState = {
      content,
      timestamp: Date.now()
    };
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newState];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCurrentContent(history[historyIndex - 1].content);
    }
  }, [historyIndex, history]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCurrentContent(history[historyIndex + 1].content);
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts for undo/redo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'translation' | 'glossary') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "File Validation Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Additional check for translation file size (character limit)
    if (type === 'translation') {
      try {
        const content = await file.text();
        if (content.length > 15000) {
          toast({
            title: "File Too Large",
            description: `Translation text is ${content.length.toLocaleString()} characters. Please limit to 15,000 characters or split into smaller sections.`,
            variant: "destructive",
          });
          return;
        }
        setCurrentContent(content);
        addToHistory(content);
      } catch (error) {
        toast({
          title: "File Read Error",
          description: "Could not read file content",
          variant: "destructive",
        });
        return;
      }
    }

    if (type === 'translation') {
      setTranslationFile(file);
      setTranslationFileUploaded(true);
      toast({
        title: "Translation File Uploaded",
        description: `${file.name} uploaded successfully`,
      });
    } else {
      setGlossaryFile(file);
      setGlossaryFileUploaded(true);
      toast({
        title: "Glossary Uploaded",
        description: `${file.name} uploaded successfully`,
      });
    }
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

    try {
      const translationContent = await translationFile.text();
      const glossaryContent = await glossaryFile.text();
      
      const result = await analyzeTranslation(
        translationContent,
        glossaryContent,
        selectedLanguage,
        selectedDomain,
        grammarCheckingEnabled
      );

      if (result) {
        setAnalysisResults(result);
        setAnalysisComplete(true);
        setCurrentContent(translationContent);
        setAnalysisProgress(100);
        addToHistory(translationContent);
        
        toast({
          title: "Analysis Complete",
          description: `Analyzed ${result.statistics.totalTerms} terms with ${result.statistics.qualityScore.toFixed(1)}% quality score`,
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleReanalyze = async (content: string) => {
    if (!glossaryFile) {
      toast({
        title: "No Glossary",
        description: "Please upload a glossary file for re-analysis",
        variant: "destructive",
      });
      return;
    }

    try {
      const glossaryContent = await glossaryFile.text();
      
      const result = await analyzeTranslation(
        content,
        glossaryContent,
        selectedLanguage,
        selectedDomain,
        grammarCheckingEnabled
      );

      if (result) {
        setAnalysisResults(result);
        setCurrentContent(content);
        addToHistory(content);
        
        toast({
          title: "Re-analysis Complete",
          description: "Content re-analyzed successfully",
        });
      }
    } catch (error) {
      console.error('Re-analysis failed:', error);
    }
  };

  const handleContentChange = (content: string) => {
    setCurrentContent(content);
    addToHistory(content);
  };

  const handleExport = (format: string) => {
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (format) {
      case 'txt':
        content = currentContent;
        filename = 'translation.txt';
        mimeType = 'text/plain';
        break;
      case 'json':
        content = JSON.stringify({
          content: currentContent,
          analysis: analysisResults,
          metadata: {
            language: selectedLanguage,
            domain: selectedDomain,
            timestamp: new Date().toISOString()
          }
        }, null, 2);
        filename = 'analysis-results.json';
        mimeType = 'application/json';
        break;
      case 'csv':
        if (analysisResults?.terms) {
          const headers = ['Term', 'Classification', 'Score', 'Position', 'Suggestions'];
          const rows = analysisResults.terms.map((t: any) => [
            t.text,
            t.classification,
            t.score,
            `${t.startPosition}-${t.endPosition}`,
            t.suggestions?.join('; ') || ''
          ]);
          content = [headers, ...rows].map(row => row.join(',')).join('\n');
          filename = 'analysis-terms.csv';
          mimeType = 'text/csv';
        }
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Export Successful",
      description: `File exported as ${filename}`,
    });
  };

  const getSelectedLanguageInfo = () => {
    return languages.find(lang => lang.value === selectedLanguage);
  };

  const getSelectedDomainInfo = () => {
    return domains.find(domain => domain.value === selectedDomain);
  };

  const validPercentage = analysisResults?.statistics?.totalTerms > 0 
    ? (analysisResults.statistics.validTerms / analysisResults.statistics.totalTerms) * 100 
    : 0;

  const getGradientColor = (percentage: number) => {
    if (percentage <= 25) return 'from-red-500 to-red-600';
    if (percentage <= 50) return 'from-orange-500 to-yellow-500';
    if (percentage <= 75) return 'from-lime-500 to-green-400';
    return 'from-green-500 to-green-600';
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-card border-b border-border/40 shadow-lexiq sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
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
              
              {/* Download Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={!analysisComplete}>
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleExport('txt')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('json')}>
                    <Database className="h-4 w-4 mr-2" />
                    Export as JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Export Terms as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Badge 
                variant="outline" 
                className={`${engineReady ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
              >
                <Activity className="h-3 w-3 mr-1" />
                {engineReady ? 'Engine Ready' : 'Engine Not Ready'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          {/* Modern Tab Navigation */}
          <TabsList className="bg-card/50 p-1.5 rounded-lg border border-border/50 w-fit h-auto">
            <TabsTrigger 
              value="edit" 
              className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all"
            >
              Edit
            </TabsTrigger>
            <TabsTrigger 
              value="statistics" 
              className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all"
            >
              Statistics
            </TabsTrigger>
            <TabsTrigger 
              value="data" 
              className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all"
            >
              Data Management
            </TabsTrigger>
          </TabsList>

          {/* Edit Tab */}
          <TabsContent value="edit" className="mt-0 space-y-6">
            <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-240px)] rounded-lg border">
              {/* Left Sidebar - Compact Controls */}
              <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
                <div className="h-full overflow-auto p-4 space-y-4">
                  {/* QA Support Panel */}
                  <QAChatPanel analysisContext={currentContent + '\n\nAnalysis: ' + JSON.stringify(analysisResults || {})} />
                  
                  {/* Abbreviated Statistics */}
                  {analysisComplete && analysisResults && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Quality Overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Quality Score</span>
                            <span className="font-bold">{analysisResults.statistics.qualityScore.toFixed(1)}%</span>
                          </div>
                          <Progress value={analysisResults.statistics.qualityScore} className="h-2" />
                        </div>
                        
                        <div className={`bg-gradient-to-r ${getGradientColor(validPercentage)} p-3 rounded-md text-white`}>
                          <div className="text-xs opacity-90">Validated Terms</div>
                          <div className="text-2xl font-bold">
                            {analysisResults.statistics.validTerms}/{analysisResults.statistics.totalTerms}
                          </div>
                          <div className="text-xs opacity-90 mt-1">
                            {validPercentage.toFixed(1)}% Complete
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Compact File Upload */}
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div 
                        onClick={() => translationInputRef.current?.click()}
                        className={`flex items-center justify-between p-3 rounded-md border-2 border-dashed cursor-pointer transition-all hover:border-primary hover:bg-primary/5 ${translationFile ? 'border-success bg-success/5' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs truncate">
                            {translationFile ? translationFile.name : 'Translation File'}
                          </span>
                        </div>
                        {translationFileUploaded ? (
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0 ml-2" />
                        ) : (
                          <Upload className="h-4 w-4 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">
                        Max 15,000 characters · 20MB file size limit
                      </p>
                      <input
                        ref={translationInputRef}
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'translation')}
                        className="hidden"
                        accept=".txt,.docx,.json,.csv,.xml,.po,.tmx,.xliff,.xlf"
                      />

                      <div 
                        onClick={() => glossaryInputRef.current?.click()}
                        className={`flex items-center justify-between p-3 rounded-md border-2 border-dashed cursor-pointer transition-all hover:border-primary hover:bg-primary/5 ${glossaryFile ? 'border-success bg-success/5' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <BookOpen className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs truncate">
                            {glossaryFile ? glossaryFile.name : 'Glossary File'}
                          </span>
                        </div>
                        {glossaryFileUploaded ? (
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0 ml-2" />
                        ) : (
                          <Upload className="h-4 w-4 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">
                        CSV or TXT format · 20MB file size limit
                      </p>
                      <input
                        ref={glossaryInputRef}
                        type="file"
                        onChange={(e) => handleFileUpload(e, 'glossary')}
                        className="hidden"
                        accept=".csv,.txt"
                      />

                      <Button
                        onClick={runEnhancedAnalysis}
                        disabled={!translationFile || !glossaryFile || isAnalyzing}
                        className="w-full"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {isAnalyzing ? 'Analyzing...' : 'Start QA'}
                      </Button>

                      {isAnalyzing && (
                        <Progress value={engineProgress} className="h-2" />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Main Editor Area */}
              <ResizablePanel defaultSize={80}>
                <div className="h-full flex flex-col">
                  {/* Undo/Redo Controls */}
                  <div className="flex items-center justify-between px-6 py-3 border-b bg-card/50">
                    <h3 className="text-lg font-semibold">Editor</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        title="Redo (Ctrl+Shift+Z)"
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ResizablePanelGroup direction="vertical" className="flex-1">
                    {/* Editor Panel */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <div className="h-full overflow-auto p-4">
                        <EnhancedLiveAnalysisPanel
                          content={currentContent}
                          flaggedTerms={analysisResults?.terms ? transformAnalyzedTermsToFlagged(analysisResults.terms) : []}
                          onContentChange={handleContentChange}
                          onReanalyze={handleReanalyze}
                          grammarCheckingEnabled={grammarCheckingEnabled}
                          onGrammarCheckingToggle={setGrammarCheckingEnabled}
                          selectedLanguage={selectedLanguage}
                          selectedDomain={selectedDomain}
                        />
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* QA Analysis Panel */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <div className="h-full overflow-auto p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">QA Analysis</h3>
                        </div>
                        
                        {analysisComplete && analysisResults ? (
                          <div className="space-y-4">
                            {/* Analysis insights and visualizations */}
                            <EnhancedStatisticsTab statistics={analysisResults.statistics} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>Upload files and start QA to see analysis</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics">
            {analysisComplete && analysisResults ? (
              <EnhancedStatisticsTab statistics={analysisResults.statistics} />
            ) : (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No Analysis Data</h3>
                  <p>Complete an analysis in the Edit tab to view detailed statistics</p>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent value="data">
            {analysisComplete && analysisResults ? (
              <DataManagementTab 
                terms={analysisResults.terms || []} 
                glossaryContent={glossaryFile ? '' : ''} 
              />
            ) : (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <Database className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p>Complete an analysis in the Edit tab to manage glossary data</p>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}