import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, FileText, Play, TrendingUp, CheckCircle, 
  AlertCircle, BarChart3, Activity, BookOpen, Zap, ArrowLeft 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import lexiqLogo from '@/assets/lexiq-logo.png';
import middleburyLogo from '@/assets/middlebury-logo.png';

interface MainInterfaceProps {
  onReturn?: () => void;
}

export function MainInterface({ onReturn }: MainInterfaceProps) {
  const [translationFile, setTranslationFile] = useState<File | null>(null);
  const [glossaryFile, setGlossaryFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [engineReady, setEngineReady] = useState(true);
  const [activeTab, setActiveTab] = useState('live');
  const translationInputRef = useRef<HTMLInputElement>(null);
  const glossaryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    } else {
      setGlossaryFile(file);
    }

    toast({
      title: "File Uploaded",
      description: `${type} file "${file.name}" uploaded successfully.`,
    });
  };

  const runAnalysis = async () => {
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
      { message: "🔬 Assessing contextual relationships...", duration: 4500 },
      { message: "📊 Getting your stats...", duration: 5500 },
      { message: "✨ Generating recommendations", duration: 2000 },
      { message: "✅ Analysis complete", duration: 1000 }
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisStep(steps[i].message);
      setAnalysisProgress(((i + 1) / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
    }

    setIsAnalyzing(false);
    setAnalysisComplete(true);
    
    // Auto-switch to Results tab after 1 second
    setTimeout(() => {
      setActiveTab('results');
    }, 1000);
    
    toast({
      title: "Analysis Complete",
      description: "LexiQ has successfully processed your files and generated comprehensive insights.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
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
              <Badge 
                variant="outline" 
                className={`${engineReady ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
              >
                <Activity className="h-3 w-3 mr-1" />
                {engineReady ? 'Engine Ready' : 'Engine Not Ready'}
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                LocWorld54 Demo
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Panel - File Upload and Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Translation File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Translation File</span>
                </CardTitle>
                <CardDescription>
                  Upload your translation document for analysis
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

            {/* Analysis Controls */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={() => { if (!isAnalyzing) runAnalysis(); }}
                  disabled={!translationFile || !glossaryFile}
                  className={`w-full bg-primary hover:bg-primary/80 text-primary-foreground font-bold py-3 transition-none focus-visible:ring-0 active:opacity-100 ${isAnalyzing ? 'opacity-100 cursor-wait [aria-busy=true]:opacity-100 [aria-busy=true]:text-primary-foreground [aria-busy=true]:bg-primary' : ''}`}
                  aria-busy={isAnalyzing}
                  style={isAnalyzing ? { transition: 'none', filter: 'none' } : { transition: 'none' }}
                >
                  <span className="inline-flex items-center transition-none">
                    {isAnalyzing ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Start QA
                      </>
                    )}
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span>Live Analysis Results & Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="live">🔍 Live Analysis</TabsTrigger>
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
                          <span className="text-sm text-muted-foreground">Progress</span>
                          <span className="text-sm font-medium">{Math.round(analysisProgress)}%</span>
                        </div>
                        <Progress value={analysisProgress} className="h-2" />
                        <div className="flex items-center justify-center">
                          <span className="text-sm font-medium transition-opacity duration-300">{analysisStep}</span>
                        </div>
                      </div>
                    ) : analysisComplete ? (
                      <div className="text-center space-y-4">
                        <CheckCircle className="h-16 w-16 text-success mx-auto" />
                        <h3 className="text-2xl font-bold text-success">Analysis Complete!</h3>
                        <p className="text-muted-foreground">
                          Your files have been processed successfully. Check the Results and Statistics tabs for detailed insights.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center space-y-4 py-12">
                        <Zap className="h-16 w-16 text-primary/50 mx-auto" />
                        <h3 className="text-xl font-semibold text-muted-foreground">LexiQ (Demo Version) - LocWorld54</h3>
                        <p className="text-muted-foreground">
                          Upload your files and click "Start QA" to begin advanced terminology analysis.
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="results" className="mt-6">
                    <div className="space-y-4">
                      {analysisComplete ? (
                        <>
                          <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Analysis completed successfully. Found 247 terminology instances with 89% accuracy rate.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Validated Terms</span>
                                  <Badge className="bg-success text-success-foreground">Valid</Badge>
                                </div>
                                <div className="text-2xl font-bold text-success mt-2">89%</div>
                                <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
                                  <div className="text-xs border-b border-border pb-2 mb-2 font-semibold grid grid-cols-3 gap-2">
                                    <span>Source</span>
                                    <span>Target</span>
                                    <span>Status</span>
                                  </div>
                                  {[
                                    { source: "mitochondria", target: "mitochondria", status: "valid" },
                                    { source: "photosynthesis", target: "photosynthesis", status: "valid" },
                                    { source: "crystallography", target: "crystallography", status: "valid" },
                                    { source: "thermodynamics", target: "thermodynamics", status: "valid" },
                                    { source: "neurotransmitter", target: "neurotransmitter", status: "valid" }
                                  ].map((item, idx) => (
                                    <div key={idx} className="text-xs grid grid-cols-3 gap-2 py-1">
                                      <span className="truncate">{item.source}</span>
                                      <span className="truncate">{item.target}</span>
                                      <Badge variant="outline" className="text-xs h-4 bg-success/10 text-success">{item.status}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Flagged Items</span>
                                  <Badge className="bg-warning text-warning-foreground">Review</Badge>
                                </div>
                                <div className="text-2xl font-bold text-warning mt-2">27</div>
                                <div className="mt-4 max-h-40 overflow-y-auto space-y-2">
                                  <div className="text-xs border-b border-border pb-2 mb-2 font-semibold grid grid-cols-3 gap-2">
                                    <span>Source</span>
                                    <span>Target</span>
                                    <span>Status</span>
                                  </div>
                                  {[
                                    { source: "genomics", target: "genetics", status: "review" },
                                    { source: "biochemistry", target: "biological chemistry", status: "review" },
                                    { source: "proteomics", target: "protein analysis", status: "review" },
                                    { source: "bioinformatics", target: "computational biology", status: "review" }
                                  ].map((item, idx) => (
                                    <div key={idx} className="text-xs grid grid-cols-3 gap-2 py-1">
                                      <span className="truncate">{item.source}</span>
                                      <span className="truncate">{item.target}</span>
                                      <Badge variant="outline" className="text-xs h-4 bg-warning/10 text-warning">{item.status}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-muted-foreground">Results will appear here after analysis</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="gatv" className="mt-6">
                    <div className="space-y-4">
                      <Alert>
                        <Activity className="h-4 w-4" />
                        <AlertDescription>
                          GATV (Glossary-Anchored Terminology Validation) system ready for analysis.
                        </AlertDescription>
                      </Alert>
                      
                      {analysisComplete ? (
                        <div className="space-y-4">
                          <h4 className="font-semibold">GATV Analysis Results</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                              <span className="text-sm">Terminology consistency</span>
                              <Badge className="bg-success text-success-foreground">95%</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                              <span className="text-sm">Context validation</span>
                              <Badge className="bg-warning text-warning-foreground">78%</Badge>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-muted-foreground">GATV analysis will appear here after processing</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="statistics" className="mt-6">
                    <div className="space-y-4">
                      {analysisComplete ? (
                        <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-3xl font-bold text-primary">247</div>
                              <div className="text-sm text-muted-foreground">Total Terms</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-3xl font-bold text-success">2.3s</div>
                              <div className="text-sm text-muted-foreground">Processing Time</div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4 text-center">
                              <div className="text-3xl font-bold text-accent">89%</div>
                              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <Card>
                          <CardContent className="p-4">
                            <h4 className="font-semibold mb-4">All Assessed Terms</h4>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              <div className="text-xs border-b border-border pb-2 mb-2 font-semibold grid grid-cols-3 gap-2">
                                <span>Term</span>
                                <span>Status</span>
                                <span>Accuracy</span>
                              </div>
                              {[
                                { term: "mitochondria", status: "valid", accuracy: "98%" },
                                { term: "photosynthesis", status: "valid", accuracy: "96%" },
                                { term: "crystallography", status: "valid", accuracy: "94%" },
                                { term: "thermodynamics", status: "valid", accuracy: "97%" },
                                { term: "neurotransmitter", status: "valid", accuracy: "95%" },
                                { term: "genomics", status: "review", accuracy: "82%" },
                                { term: "biochemistry", status: "review", accuracy: "78%" },
                                { term: "proteomics", status: "review", accuracy: "85%" },
                                { term: "bioinformatics", status: "review", accuracy: "80%" },
                                { term: "cytoplasm", status: "valid", accuracy: "99%" },
                                { term: "ribosomes", status: "valid", accuracy: "97%" },
                                { term: "chromosomes", status: "valid", accuracy: "98%" }
                              ].map((item, idx) => (
                                <div key={idx} className="text-xs grid grid-cols-3 gap-2 py-1">
                                  <span className="truncate">{item.term}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs h-4 ${
                                      item.status === 'valid' 
                                        ? 'bg-success/10 text-success' 
                                        : 'bg-warning/10 text-warning'
                                    }`}
                                  >
                                    {item.status}
                                  </Badge>
                                  <span className="font-medium">{item.accuracy}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                          <p className="text-muted-foreground">Statistics will be generated after analysis</p>
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