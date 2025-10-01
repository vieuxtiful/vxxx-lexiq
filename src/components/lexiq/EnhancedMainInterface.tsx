import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, ArrowLeft, Download, FileText, Settings, Loader2, FileUp, Type, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiveAnalysisPanel } from './LiveAnalysisPanel';
import { StatisticsPanel } from './StatisticsPanel';
import { DataPanel } from './DataPanel';
import { EnhancedStatisticsTab } from './EnhancedStatisticsTab';
import { DataManagementTab } from './DataManagementTab';
import { QAChatPanel } from './QAChatPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Progress } from '@/components/ui/progress';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { useAnalysisEngine, AnalyzedTerm, AnalysisStatistics } from '@/hooks/useAnalysisEngine';
import { useReportGenerator, ReportFormat } from '@/hooks/useReportGenerator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import lexiqLogo from '@/assets/lexiq-logo.png';

interface EnhancedMainInterfaceProps {
  onReturn: () => void;
  onReturnToWelcome: () => void;
  selectedLanguage: string;
  selectedDomain: string;
}

export const EnhancedMainInterface: React.FC<EnhancedMainInterfaceProps> = ({
  onReturn,
  onReturnToWelcome,
  selectedLanguage,
  selectedDomain,
}) => {
  const { toast } = useToast();
  const { processFile, isProcessing } = useFileProcessor();
  const { analyzeTranslation, isAnalyzing, progress } = useAnalysisEngine();
  const { generateReport } = useReportGenerator();
  
  const [translationInputMethod, setTranslationInputMethod] = useState<'paste' | 'file'>('paste');
  const [pastedTranslation, setPastedTranslation] = useState("");
  const [translationFile, setTranslationFile] = useState<File | null>(null);
  const [glossaryFile, setGlossaryFile] = useState<File | null>(null);
  const [translationContent, setTranslationContent] = useState("");
  const [glossaryContent, setGlossaryContent] = useState("");
  const [content, setContent] = useState("");
  const [analysisComplete, setAnalysisComplete] = useState(false);
  
  const [analyzedTerms, setAnalyzedTerms] = useState<AnalyzedTerm[]>([]);
  const [statistics, setStatistics] = useState<AnalysisStatistics | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'edit' | 'statistics' | 'data'>('edit');
  
  const translationInputRef = useRef<HTMLInputElement>(null);
  const glossaryInputRef = useRef<HTMLInputElement>(null);

  // Language code to name mapping
  const LANGUAGE_NAMES: Record<string, string> = {
    'EN': 'English',
    'ES': 'Spanish',
    'FR': 'French',
    'DE': 'German',
    'IT': 'Italian',
    'PT': 'Portuguese',
    'RU': 'Russian',
    'ZH': 'Chinese',
    'JA': 'Japanese',
    'KO': 'Korean',
  };

  // Enhanced language detection based on character scripts
  const detectLanguage = (text: string): string | null => {
    // Use a larger sample for better accuracy
    const sampleText = text.slice(0, 1000);
    const totalChars = sampleText.length;
    
    if (totalChars < 10) return null; // Too short to determine
    
    // Count characters by script - more comprehensive patterns
    const japaneseChars = (sampleText.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
    const hanChars = (sampleText.match(/[\u4E00-\u9FFF]/g) || []).length; // CJK Unified Ideographs
    const koreanChars = (sampleText.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
    const cyrillicChars = (sampleText.match(/[\u0400-\u04FF]/g) || []).length;
    const arabicChars = (sampleText.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (sampleText.match(/[A-Za-zÀ-ÿ]/g) || []).length;
    
    // Calculate percentages
    const japanesePercent = (japaneseChars + hanChars) / totalChars;
    const koreanPercent = koreanChars / totalChars;
    const hanOnlyPercent = hanChars / totalChars;
    const cyrillicPercent = cyrillicChars / totalChars;
    const arabicPercent = arabicChars / totalChars;
    const latinPercent = latinChars / totalChars;
    
    console.log('Language detection:', {
      sample: sampleText.substring(0, 50),
      japanesePercent,
      koreanPercent,
      hanOnlyPercent,
      cyrillicPercent,
      latinPercent
    });
    
    // Require at least 30% of text to be in the detected script for confidence
    const THRESHOLD = 0.3;
    
    // Japanese has hiragana/katakana which are unique
    if (japaneseChars > 0 && japanesePercent > THRESHOLD) return 'JA';
    
    // Korean has unique hangul characters
    if (koreanPercent > THRESHOLD) return 'KO';
    
    // Chinese uses only Han characters (no hiragana/katakana)
    if (hanOnlyPercent > THRESHOLD && japaneseChars === 0) return 'ZH';
    
    // Russian uses Cyrillic
    if (cyrillicPercent > THRESHOLD) return 'RU';
    
    // Arabic script
    if (arabicPercent > THRESHOLD) return null; // We don't have specific language support yet
    
    // Latin-based languages (English, Spanish, German, French, etc.)
    if (latinPercent > 0.5) {
      // We can't distinguish between Latin-based languages without advanced NLP
      // Return null to skip validation for Latin-based scripts
      return null;
    }
    
    return null; // Unable to determine with confidence
  };

  const validateLanguage = (text: string, type: 'translation' | 'glossary') => {
    if (type === 'glossary') return true; // Skip validation for glossary
    
    const detectedLangCode = detectLanguage(text);
    const expectedLangCode = selectedLanguage;
    const expectedLangName = LANGUAGE_NAMES[expectedLangCode] || expectedLangCode;
    
    console.log('Validation:', { detectedLangCode, expectedLangCode, expectedLangName });
    
    // If we can't detect with confidence, allow it
    if (!detectedLangCode) {
      return true;
    }
    
    // Check if detected language matches selected language
    if (detectedLangCode !== expectedLangCode) {
      const detectedLangName = LANGUAGE_NAMES[detectedLangCode] || detectedLangCode;
      toast({
        title: "Language mismatch detected",
        description: `The provided text appears to be written in ${detectedLangName}, but you selected ${expectedLangName}.`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'translation' | 'glossary') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 50KB for translation files to avoid truncation)
    if (type === 'translation' && file.size > 50000) {
      toast({
        title: "File too large",
        description: "Translation files should be under 50KB to ensure accurate analysis. Please try a smaller file or use copy-paste for large texts.",
        variant: "destructive",
      });
      return;
    }

    const result = await processFile(file, type);
    if (!result) return;

    // Validate language for translation files
    if (type === 'translation' && !validateLanguage(result.content, type)) {
      return;
    }

    if (type === 'translation') {
      setTranslationFile(file);
      setTranslationContent(result.content);
      setContent(result.content);
    } else {
      setGlossaryFile(file);
      setGlossaryContent(result.content);
    }
  };

  const handleStartAnalysis = async () => {
    let transContent = "";
    
    // Get translation content from either paste or file
    if (translationInputMethod === 'paste') {
      if (!pastedTranslation.trim()) {
        toast({
          title: "No translation text",
          description: "Please paste your translation text",
          variant: "destructive",
        });
        return;
      }
      transContent = pastedTranslation;
      
      // Check content size for paste method too
      if (transContent.length > 15000) {
        toast({
          title: "Text too large",
          description: "Please limit your translation to 15,000 characters for optimal analysis. Consider splitting it into smaller sections.",
          variant: "destructive",
        });
        return;
      }
      
      setTranslationContent(transContent);
      setContent(transContent);
    } else {
      if (!translationContent) {
        toast({
          title: "No translation file",
          description: "Please upload a translation file",
          variant: "destructive",
        });
        return;
      }
      transContent = translationContent;
    }

    // Check glossary
    if (!glossaryContent) {
      toast({
        title: "No glossary",
        description: "Please upload a glossary file",
        variant: "destructive",
      });
      return;
    }

    await startAnalysis(transContent, glossaryContent);
  };

  const startAnalysis = async (transContent: string, glossContent: string) => {
    const result = await analyzeTranslation(
      transContent,
      glossContent,
      selectedLanguage,
      selectedDomain
    );

    if (result) {
      setAnalyzedTerms(result.terms);
      setStatistics(result.statistics);
      setAnalysisComplete(true);
    }
  };

  const handleReanalyze = async (newContent: string) => {
    console.log('Re-analyzing edited content...');
    const result = await analyzeTranslation(
      newContent,
      glossaryContent,
      selectedLanguage,
      selectedDomain
    );

    if (result) {
      setAnalyzedTerms(result.terms);
      setStatistics(result.statistics);
      setContent(newContent);
    }
  };

  const handleExport = async (format: ReportFormat = 'json') => {
    if (!statistics || analyzedTerms.length === 0) {
      toast({
        title: "No analysis data",
        description: "Please complete an analysis first",
        variant: "destructive",
      });
      return;
    }

    await generateReport(analyzedTerms, statistics, format, selectedLanguage, selectedDomain);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onReturn}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img 
                src={lexiqLogo} 
                alt="LexiQ" 
                className="h-8 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={onReturnToWelcome}
                title="Return to Welcome Screen"
              />
              <div className="hidden sm:block">
                <div className="text-xs text-muted-foreground">
                  {selectedLanguage.toUpperCase()} • {selectedDomain}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!analysisComplete}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('html')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export as HTML
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Processing Progress */}
        {(isProcessing || isAnalyzing) && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="font-medium">
                    {isProcessing ? 'Processing files...' : 'Prepping for LQA'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Input Section */}
        {!analysisComplete && (
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Translation Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Translation Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={translationInputMethod} onValueChange={(v) => setTranslationInputMethod(v as 'paste' | 'file')}>
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="paste" className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      Paste Text
                    </TabsTrigger>
                    <TabsTrigger value="file" className="flex items-center gap-2">
                      <FileUp className="h-4 w-4" />
                      Upload File
                    </TabsTrigger>
                  </TabsList>
                  
                   <TabsContent value="paste" className="mt-0">
                    <Textarea
                      placeholder="Paste your translation text here..."
                      value={pastedTranslation}
                      onChange={(e) => setPastedTranslation(e.target.value)}
                      onPaste={(e) => {
                        // Validate language on paste
                        const pastedText = e.clipboardData.getData('text');
                        setTimeout(() => {
                          if (pastedText && !validateLanguage(pastedText, 'translation')) {
                            setPastedTranslation('');
                          }
                        }, 0);
                      }}
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {pastedTranslation.length} characters
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="file" className="mt-0">
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => translationInputRef.current?.click()}
                    >
                      {translationFile ? (
                        <>
                          <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                          <p className="font-medium mb-2">{translationFile.name}</p>
                          <p className="text-xs text-success">File loaded successfully</p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="font-medium mb-2">Upload Translation File</p>
                          <p className="text-sm text-muted-foreground">
                            Supports .txt, .docx, .pdf, .csv, .xlsx (max 50KB)
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      ref={translationInputRef}
                      type="file"
                      accept=".txt,.doc,.docx,.pdf,.csv,.xlsx"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'translation')}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Glossary Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Glossary File
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => glossaryInputRef.current?.click()}
                >
                  {glossaryFile ? (
                    <>
                      <FileText className="h-12 w-12 mx-auto mb-4 text-primary" />
                      <p className="font-medium mb-2">{glossaryFile.name}</p>
                      <p className="text-xs text-success">File loaded successfully</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium mb-2">Upload Glossary</p>
                      <p className="text-sm text-muted-foreground">
                        Supports .txt, .csv, .xlsx, .docx, .pdf
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={glossaryInputRef}
                  type="file"
                  accept=".txt,.csv,.xlsx,.doc,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'glossary')}
                />

                {/* Start Analysis Button */}
                <Button 
                  onClick={handleStartAnalysis}
                  disabled={isProcessing || isAnalyzing}
                  className="w-full mt-4"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Start Analysis'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Analysis Interface with Tabs */}
        {analysisComplete && (
          <div className="space-y-4">
            {/* Modern Tab Navigation */}
            <div className="flex items-center gap-2 border-b">
              <button
                onClick={() => setActiveMainTab('edit')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeMainTab === 'edit'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveMainTab('statistics')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeMainTab === 'statistics'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Statistics
              </button>
              <button
                onClick={() => setActiveMainTab('data')}
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  activeMainTab === 'data'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Data Management
              </button>
            </div>

            {/* Tab Content */}
            <div className="h-[calc(100vh-250px)]">
              {activeMainTab === 'edit' && (
                <ResizablePanelGroup direction="horizontal" className="rounded-lg border h-full">
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full p-4">
                      <LiveAnalysisPanel
                        content={content}
                        flaggedTerms={analyzedTerms.map(term => ({
                          text: term.text,
                          start: term.startPosition,
                          end: term.endPosition,
                          score: term.score,
                          hits: term.frequency,
                          rationale: term.rationale,
                          classification: term.classification,
                        }))}
                        onContentChange={setContent}
                        onReanalyze={handleReanalyze}
                        glossaryContent={glossaryContent}
                      />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full flex flex-col p-4 gap-4">
                      {/* Statistics Panel - 30% */}
                      <div className="h-[30%] overflow-hidden">
                        {statistics && <StatisticsPanel stats={statistics} />}
                      </div>

                      {/* Term Analytics Panel - 35% with internal scroll */}
                      <div className="h-[35%] overflow-hidden">
                        <DataPanel
                          data={analyzedTerms.map(term => ({
                            id: `${term.startPosition}-${term.endPosition}`,
                            currentTerm: term.text,
                            targetTerm: term.suggestions?.[0] || term.text,
                            classification: term.classification,
                            score: term.score,
                            frequency: term.frequency,
                            context: term.context,
                          }))}
                        />
                      </div>

                      {/* QA Chat Panel - 35% */}
                      <div className="h-[35%] overflow-hidden">
                        <QAChatPanel 
                          analysisContext={JSON.stringify({
                            terms: analyzedTerms.slice(0, 10),
                            statistics,
                            language: selectedLanguage,
                            domain: selectedDomain,
                          })}
                        />
                      </div>
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}

              {activeMainTab === 'statistics' && statistics && (
                <div className="h-full overflow-auto">
                  <EnhancedStatisticsTab statistics={statistics} />
                </div>
              )}

              {activeMainTab === 'data' && (
                <div className="h-full overflow-auto">
                  <DataManagementTab terms={analyzedTerms} glossaryContent={glossaryContent} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
