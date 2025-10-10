// Phase 8 - Enhanced Main Interface with AuthFlow integration
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { detectLanguageSimple, validateContentLanguage, getLanguageName } from '@/lib/languageDetector';
import { LanguageMismatchDialog } from './LanguageMismatchDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Upload, FileText, Play, TrendingUp, CheckCircle, AlertCircle, BarChart3, Activity, BookOpen, Zap, ArrowLeft, Globe, Building, Download, Undo2, Redo2, Database, Save, User, LogOut, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useChunkedAnalysis } from '@/hooks/useChunkedAnalysis';
import { useAnalysisEngine } from '@/hooks/useAnalysisEngine';
import { useAuth } from '@/hooks/useAuth';
import { useAuthFlow } from '@/contexts/AuthFlowContext';
import { analysisCache } from '@/lib/analysisCache';
import { useProject } from '@/contexts/ProjectContext';
import { useAnalysisSession, AnalysisSession } from '@/hooks/useAnalysisSession';
import { useFileProcessor } from '@/hooks/useFileProcessor';
import { useAuditLog } from '@/hooks/useAuditLog';
import { transformAnalyzedTermsToFlagged } from '@/utils/analysisDataTransformer';
import { EnhancedLiveAnalysisPanel } from './EnhancedLiveAnalysisPanel';
import { EnhancedStatisticsTab } from './EnhancedStatisticsTab';
import { SimplifiedStatisticsPanel } from './SimplifiedStatisticsPanel';
import { DataManagementTab } from './DataManagementTab';
import { QAChatPanel } from './QAChatPanel';
import { SaveVersionsDialog, type SavedVersion } from './SaveVersionsDialog';
import { ProjectSelector } from './ProjectSelector';
import { HistoryPanel } from './HistoryPanel';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { BatchProcessor } from './BatchProcessor';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { ProjectSetupWizard } from './ProjectSetupWizard';
import { SourceEditor } from './SourceEditor';
import { validateFile } from '@/utils/fileValidation';
import lexiqLogo from '@/assets/lexiq-team-logo.png';
import glossaryIcon from '@/assets/glossary-icon.png';
import translationIcon from '@/assets/translation-icon.png';
import qaIcon from '@/assets/qa-support-icon.png';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface EnhancedMainInterfaceProps {
  onReturn?: () => void;
  onReturnToWelcome?: () => void;
  selectedLanguage?: string;
  selectedDomain?: string;
}
interface HistoryState {
  content: string;
  analysisResults: any;
  timestamp: number;
}

// Levenshtein distance-based similarity calculation for accurate content change detection
const calculateLevenshteinSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  // For very long texts, use a sampling approach to avoid performance issues
  const MAX_LENGTH_FOR_DETAILED_CHECK = 10000;
  let text1 = str1;
  let text2 = str2;
  if (str1.length > MAX_LENGTH_FOR_DETAILED_CHECK || str2.length > MAX_LENGTH_FOR_DETAILED_CHECK) {
    // Sample the beginning, middle, and end of the text for efficiency
    const sampleSize = Math.min(3000, Math.min(str1.length, str2.length));
    const start1 = str1.substring(0, sampleSize / 3);
    const middle1 = str1.substring(Math.floor(str1.length / 2 - sampleSize / 6), Math.floor(str1.length / 2 + sampleSize / 6));
    const end1 = str1.substring(str1.length - sampleSize / 3);
    text1 = start1 + middle1 + end1;
    const start2 = str2.substring(0, sampleSize / 3);
    const middle2 = str2.substring(Math.floor(str2.length / 2 - sampleSize / 6), Math.floor(str2.length / 2 + sampleSize / 6));
    const end2 = str2.substring(str2.length - sampleSize / 3);
    text2 = start2 + middle2 + end2;
  }

  // Calculate Levenshtein distance
  const track = Array(text2.length + 1).fill(null).map(() => Array(text1.length + 1).fill(null));
  for (let i = 0; i <= text1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= text2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= text2.length; j += 1) {
    for (let i = 1; i <= text1.length; i += 1) {
      const indicator = text1[i - 1] === text2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(track[j][i - 1] + 1,
      // deletion
      track[j - 1][i] + 1,
      // insertion
      track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  const distance = track[text2.length][text1.length];
  const maxLength = Math.max(text1.length, text2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
};
const calculateContentSimilarity = (content1: string, content2: string): number => {
  if (!content1 || !content2) return 0;
  if (content1 === content2) return 1;

  // Use Levenshtein for more accurate similarity measurement
  return calculateLevenshteinSimilarity(content1, content2);
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
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [engineReady, setEngineReady] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('edit');
  const [grammarCheckingEnabled, setGrammarCheckingEnabled] = useState(() => {
    // Load grammar checking preference from localStorage
    const saved = localStorage.getItem('lexiq-grammar-checking');
    return saved === null ? true : saved === 'true';
  });
  const [spellingCheckingEnabled, setSpellingCheckingEnabled] = useState(() => {
    // Load spelling checking preference from localStorage
    const saved = localStorage.getItem('lexiq-spelling-checking');
    return saved === null ? true : saved === 'true';
  });
  const [sourceGrammarEnabled, setSourceGrammarEnabled] = useState(() => {
    const saved = localStorage.getItem('lexiq-source-grammar-enabled');
    return saved === null ? true : saved === 'true';
  });
  const [sourceSpellingEnabled, setSourceSpellingEnabled] = useState(() => {
    const saved = localStorage.getItem('lexiq-source-spelling-enabled');
    return saved === null ? true : saved === 'true';
  });
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [currentContent, setCurrentContent] = useState('');
  const [sourceContent, setSourceContent] = useState(''); // NEW: For bilingual projects
  const [translationFileUploaded, setTranslationFileUploaded] = useState(false);
  const [glossaryFileUploaded, setGlossaryFileUploaded] = useState(false);
  const [textManuallyEntered, setTextManuallyEntered] = useState(false);
  const [showUploadIconTransition, setShowUploadIconTransition] = useState(false);
  const [showTranslationCheckmark, setShowTranslationCheckmark] = useState(false);
  const [showGlossaryCheckmark, setShowGlossaryCheckmark] = useState(false);
  const [noGlossaryWarningShown, setNoGlossaryWarningShown] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Load dark mode preference from localStorage
    const saved = localStorage.getItem('lexiq-dark-mode');
    return saved === 'true';
  });
  
  // Drag and drop states
  const [isDraggingTranslation, setIsDraggingTranslation] = useState(false);
  const [isDraggingGlossary, setIsDraggingGlossary] = useState(false);

  // Track previous project to detect changes
  const [previousProjectId, setPreviousProjectId] = useState<string | null>(null);

  // Track loading state to prevent race conditions
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save versions
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  // Smart reanalysis state
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState('');
  const [originalAnalyzedContent, setOriginalAnalyzedContent] = useState('');
  const [lastAnalysisParams, setLastAnalysisParams] = useState({
    language: '',
    domain: '',
    grammarChecking: false,
    spellingChecking: true,
    glossaryContent: ''
  });
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  // Track if analysis was performed in current live session (not loaded from storage)
  const [hasLiveAnalysis, setHasLiveAnalysis] = useState(false);
  const translationInputRef = useRef<HTMLInputElement>(null);
  const glossaryInputRef = useRef<HTMLInputElement>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Clear cache when language check toggles change to force fresh analysis
  useEffect(() => {
    if (lastAnalyzedContent && 
        (lastAnalysisParams.spellingChecking !== spellingCheckingEnabled ||
         lastAnalysisParams.grammarChecking !== grammarCheckingEnabled)) {
      console.log('🗑️ Language check toggles changed - clearing analysis cache');
      analysisCache.clear();
    }
  }, [spellingCheckingEnabled, grammarCheckingEnabled, lastAnalyzedContent, lastAnalysisParams]);
  const {
    toast
  } = useToast();
  const {
    analyzeWithChunking,
    cancelAnalysis,
    isAnalyzing: engineAnalyzing,
    progress: engineProgress,
    currentChunk,
    totalChunks
  } = useChunkedAnalysis();
  const {
    currentFullText
  } = useAnalysisEngine();
  const {
    user,
    signOut
  } = useAuth();
  const {
    setSelectedProject
  } = useAuthFlow();
  const {
    currentProject,
    projects,
    requiresProjectSetup,
    setRequiresProjectSetup,
    createProject
  } = useProject();
  const {
    saveAnalysisSession,
    getProjectSessions
  } = useAnalysisSession();
  const {
    processFile
  } = useFileProcessor();
  const {
    logAnalysis,
    logFileUpload,
    logProjectCreated,
    logSessionRestored
  } = useAuditLog();
  const [translationFileId, setTranslationFileId] = useState<string | null>(null);
  const [glossaryFileId, setGlossaryFileId] = useState<string | null>(null);
  const [showProjectSetup, setShowProjectSetup] = useState(false);

  // Source Editor Lock & Sync Mode states
  const [isSourceLocked, setIsSourceLocked] = useState(false);
  const [syncMode, setSyncMode] = useState<'gatv' | 'lqa' | 'both' | 'none'>('gatv');
  const [lqaSyncEnabled, setLqaSyncEnabled] = useState(false);

  // Language validation state
  const [languageValidation, setLanguageValidation] = useState<{
    isOpen: boolean;
    validation: any;
    context: { type: 'file' | 'analysis'; fileName?: string };
    onContinue: () => void;
    onCancel: () => void;
  } | null>(null);

  // Real-time validation state
  const [realTimeValidation, setRealTimeValidation] = useState<{
    isOpen: boolean;
    validation: any;
    expectedLanguage: string;
    onContinue: () => void;
    onCancel: () => void;
  } | null>(null);

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Use current project's language and domain
  const selectedLanguage = currentProject?.language || 'en';
  const selectedDomain = currentProject?.domain || 'general';

  // Centralized language validation
  const validateContentBeforeAction = async (
    content: string, 
    context: { type: 'file' | 'analysis'; fileName?: string }
  ): Promise<boolean> => {
    if (!currentProject || !content.trim()) return true;

    try {
      const validationResult = await validateContentLanguage(content, currentProject.language);
      
      if (!validationResult.canProceed) {
        return new Promise((resolve) => {
          setLanguageValidation({
            isOpen: true,
            validation: validationResult.validation,
            context,
            onContinue: () => {
              setLanguageValidation(null);
              // Log the override (using console for now since logAnalysis has different signature)
              console.log('Language validation override:', {
                detected: validationResult.detectedLanguage,
                expected: currentProject.language,
                confidence: validationResult.validation.confidence,
                context: context.type
              });
              resolve(true);
            },
            onCancel: () => {
              setLanguageValidation(null);
              // Log the cancellation
              console.log('Language validation blocked:', {
                detected: validationResult.detectedLanguage,
                expected: currentProject.language,
                confidence: validationResult.validation.confidence,
                context: context.type
              });
              resolve(false);
            }
          });
        });
      }
      
      return true;
    } catch (error) {
      console.error('Language validation error:', error);
      return true; // Allow proceed on error
    }
  };

  // Comprehensive reset function - project-aware
  const resetMainWindowState = useCallback(() => {
    if (!currentProject) return;
    console.log('🔄 Resetting Main Window state for project:', currentProject.name);

    // Clear project-specific localStorage
    const sessionKey = `lexiq-session-${currentProject.id}`;
    localStorage.removeItem(sessionKey);

    // Reset all state variables
    setTranslationFile(null);
    setGlossaryFile(null);
    setIsAnalyzing(false);
    setAnalysisProgress(0);
    setAnalysisComplete(false);
    setAnalysisResults(null);
    setCurrentContent('');
    setSourceContent(''); // NEW: Reset source content
    setTranslationFileUploaded(false);
    setGlossaryFileUploaded(false);
    setTextManuallyEntered(false);
    setShowUploadIconTransition(false);
    setNoGlossaryWarningShown(false);
    setHasUnsavedChanges(false);
    setHistory([]);
    setHistoryIndex(-1);
    setActiveMainTab('edit');
    setTranslationFileId(null);
    setGlossaryFileId(null);
    setIsLoadingSession(false);
    setHasLiveAnalysis(false); // Reset live analysis flag
    console.log('✅ Main Window state reset complete');
  }, [currentProject]);

  // Reset all state when project changes
  useEffect(() => {
    if (currentProject && currentProject.id !== previousProjectId) {
      console.log('Project changed, resetting Main Window state...');
      resetMainWindowState();
      setPreviousProjectId(currentProject.id);
    }
  }, [currentProject, previousProjectId, resetMainWindowState]);

  // Show project setup wizard when required
  React.useEffect(() => {
    if (requiresProjectSetup && user) {
      setShowProjectSetup(true);
    }
  }, [requiresProjectSetup, user]);

  // Dark mode effect with persistence
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lexiq-dark-mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lexiq-dark-mode', 'false');
    }
  }, [isDarkMode]);

  // Persist grammar checking toggle state
  useEffect(() => {
    localStorage.setItem('lexiq-grammar-checking', String(grammarCheckingEnabled));
  }, [grammarCheckingEnabled]);

  // Persist spelling checking toggle state
  useEffect(() => {
    localStorage.setItem('lexiq-spelling-checking', String(spellingCheckingEnabled));
  }, [spellingCheckingEnabled]);

  // Persist source editor toggle states
  useEffect(() => {
    localStorage.setItem('lexiq-source-grammar-enabled', String(sourceGrammarEnabled));
  }, [sourceGrammarEnabled]);

  useEffect(() => {
    localStorage.setItem('lexiq-source-spelling-enabled', String(sourceSpellingEnabled));
  }, [sourceSpellingEnabled]);

  // Toggle LQA sync based on sync mode
  useEffect(() => {
    setLqaSyncEnabled(syncMode === 'lqa' || syncMode === 'both');
  }, [syncMode]);

  // Real-time language validation with blocking
  useEffect(() => {
    if (!currentProject || !currentContent.trim() || currentContent.length < 30) {
      if (realTimeValidation?.isOpen) {
        setRealTimeValidation(null);
      }
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        console.log('🌍 Real-time language detection triggered:', {
          contentLength: currentContent.length,
          expectedLanguage: currentProject.language
        });

        const validationResult = await validateContentLanguage(currentContent, currentProject.language);
        
        if (!validationResult.canProceed) {
          console.log('🚨 Real-time validation blocking user:', {
            detected: validationResult.detectedLanguage,
            expected: currentProject.language,
            confidence: validationResult.validation.confidence
          });
          
          // Show blocking dialog
          setRealTimeValidation({
            isOpen: true,
            validation: validationResult.validation,
            expectedLanguage: currentProject.language,
            onContinue: () => {
              setRealTimeValidation(null);
              console.log('✅ Real-time validation override by user');
              setTimeout(() => {
                toast({
                  title: "Language mismatch content allowed",
                  description: `Detected: ${getLanguageName(validationResult.detectedLanguage)} | Expected: ${getLanguageName(currentProject.language)}`,
                  variant: "destructive",
                  duration: 3000
                });
              }, 500);
            },
            onCancel: () => {
              setRealTimeValidation(null);
              setCurrentContent('');
              console.log('❌ Real-time validation - content cleared by user');
              toast({
                title: "Content Cleared",
                description: "Language mismatch detected",
                variant: "default",
                duration: 3000
              });
            }
          });
        } else if (realTimeValidation?.isOpen) {
          setRealTimeValidation(null);
        }
      } catch (error) {
        console.error('Real-time language detection error:', error);
      }
    }, 1500); // 1.5 second debounce (more sensitive)

    return () => clearTimeout(timeoutId);
  }, [currentContent, currentProject, toast]);

  // Consolidated session loading with proper priority and race condition prevention
  React.useEffect(() => {
    const loadUserSession = async () => {
      if (!currentProject || !user || isLoadingSession) return;
      setIsLoadingSession(true);
      console.log('🔄 Starting session load for project:', currentProject.name);
      try {
        // 1. FIRST: Check if we already have content (prevent overwrite)
        if (currentContent.trim()) {
          console.log('📝 Content already exists, skipping auto-load');
          setIsLoadingSession(false);
          return;
        }

        // 2. Check localStorage session (project-specific)
        const sessionKey = `lexiq-session-${currentProject.id}`;
        const savedState = localStorage.getItem(sessionKey);
        if (savedState) {
          try {
            const parsed = JSON.parse(savedState);
            console.log('📁 Found localStorage session');

            // Validate this session belongs to current project
            if (parsed.currentContent) {
              setCurrentContent(parsed.currentContent);
              setTextManuallyEntered(parsed.textManuallyEntered || false);
              
              // Restore source content for bilingual projects
              if (currentProject.project_type === 'bilingual' && parsed.sourceContent) {
                setSourceContent(parsed.sourceContent);
                console.log('✅ Restored source content:', parsed.sourceContent.length, 'chars');
              }
              
              // Restore file upload states if files were used
              if (parsed.translationFileId) {
                setTranslationFileId(parsed.translationFileId);
                setTranslationFileUploaded(true);
                console.log('✅ Detected previous translation file upload');
              }
              
              if (parsed.glossaryFileId) {
                setGlossaryFileId(parsed.glossaryFileId);
                setGlossaryFileUploaded(true);
                console.log('✅ Detected previous glossary file upload');
              }
              
              if (parsed.analysisResults) {
                setAnalysisResults(parsed.analysisResults);
                setAnalysisComplete(true);
                // Set the analyzed content to prevent "Content Modified" warnings
                setOriginalAnalyzedContent(parsed.currentContent);
                setLastAnalyzedContent(parsed.currentContent);
              }
              if (parsed.activeMainTab) {
                setActiveMainTab(parsed.activeMainTab);
              }
              // Restore edited terms if available
              if (parsed.editedTerms) {
                sessionStorage.setItem('lexiq-edited-terms', JSON.stringify(parsed.editedTerms));
              }
              // Clear unsaved changes flag since we're loading saved data
              setHasUnsavedChanges(false);
              console.log('✅ Loaded from localStorage session (including edited terms and source content)');
              setIsLoadingSession(false);
              return; // Stop here if we loaded from localStorage
            }
          } catch (error) {
            console.error('❌ Failed to parse localStorage session:', error);
            localStorage.removeItem(sessionKey); // Clear corrupted data
          }
        }

        // 3. Check saved versions (project-specific)
        const versionsKey = `lexiq-saved-versions-${currentProject.id}`;
        const savedVersionsData = localStorage.getItem(versionsKey);
        if (savedVersionsData) {
          try {
            const versions = JSON.parse(savedVersionsData);
            setSavedVersions(versions);
            if (versions.length > 0 && !currentContent.trim()) {
              const mostRecentVersion = versions[0];
              console.log('📚 Loading most recent saved version:', mostRecentVersion.name);
              setCurrentContent(mostRecentVersion.content);
              // Clear unsaved changes flag when loading a saved version
              setHasUnsavedChanges(false);
              toast({
                title: "Version Restored",
                description: `Loaded "${mostRecentVersion.name}" (${mostRecentVersion.wordCount} words)`
              });
              setIsLoadingSession(false);
              return; // Stop here if we loaded a saved version
            }
          } catch (error) {
            console.error('❌ Failed to load saved versions:', error);
            localStorage.removeItem(versionsKey);
          }
        }

        // 4. FINALLY: Load from database (only if nothing else available)
        if (!currentContent.trim()) {
          console.log('🗄️ Checking database for sessions...');
          const sessions = await getProjectSessions(currentProject.id);
          if (sessions.length > 0) {
            // Find the most recent session that has content
            const validSession = sessions.find(session => session.translation_content && session.translation_content.trim().length > 0);
            if (validSession) {
              console.log('✅ Loading database session:', validSession.id);
              setCurrentContent(validSession.translation_content);
              
              // Load source content for bilingual projects
              if (currentProject.project_type === 'bilingual' && validSession.source_content) {
                setSourceContent(validSession.source_content);
                console.log('✅ Restored source content from DB:', validSession.source_content.length, 'chars');
              }
              
              setAnalysisResults({
                terms: validSession.analyzed_terms,
                statistics: validSession.statistics
              });
              setAnalysisComplete(true);

              // Initialize reanalysis state and prevent "Content Modified" warnings
              setLastAnalyzedContent(validSession.translation_content);
              setOriginalAnalyzedContent(validSession.translation_content);
              setLastAnalysisParams({
                language: validSession.language,
                domain: validSession.domain,
                grammarChecking: grammarCheckingEnabled,
                spellingChecking: spellingCheckingEnabled,
                glossaryContent: ''
              });
              // Clear unsaved changes flag since we're loading saved data
              setHasUnsavedChanges(false);
              toast({
                title: "Session Restored",
                description: "Your most recent analysis has been loaded."
              });
              await logSessionRestored(validSession.id);
            }
          }
        }
      } catch (error) {
        console.error('❌ Session loading failed:', error);
      } finally {
        setIsLoadingSession(false);
      }
    };
    loadUserSession();
  }, [currentProject, user]); // Only depend on project and user changes

  // Auto-save functionality - project-specific
  React.useEffect(() => {
    if (!currentProject) return;
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }
    const sessionKey = `lexiq-session-${currentProject.id}`;
    autoSaveIntervalRef.current = setInterval(() => {
      if (currentContent || analysisResults) {
        // Retrieve edited terms from sessionStorage to include in auto-save
        let editedTerms = null;
        try {
          const editedTermsData = sessionStorage.getItem('lexiq-edited-terms');
          if (editedTermsData) {
            editedTerms = JSON.parse(editedTermsData);
          }
        } catch (error) {
          console.error('Failed to retrieve edited terms for auto-save:', error);
        }

        const stateToSave = {
          currentContent,
          sourceContent, // Save source content for bilingual projects
          analysisResults,
          textManuallyEntered,
          activeMainTab,
          editedTerms, // Include edited terms in auto-save
          translationFileId, // Include file IDs for restoration
          glossaryFileId, // Include glossary file ID for restoration
          projectId: currentProject.id,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(sessionKey, JSON.stringify(stateToSave));
        console.log('💾 Auto-saved session:', { 
          hasSourceContent: !!sourceContent, 
          sourceLength: sourceContent?.length || 0,
          contentLength: currentContent?.length || 0,
          hasGlossaryFile: !!glossaryFileId
        });
      }
    }, 5000);
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [currentContent, analysisResults, textManuallyEntered, activeMainTab, currentProject]);
  const languages = [{
    value: 'en',
    label: 'English',
    flag: '🇺🇸'
  }, {
    value: 'es',
    label: 'Spanish',
    flag: '🇪🇸'
  }, {
    value: 'fr',
    label: 'French',
    flag: '🇫🇷'
  }, {
    value: 'de',
    label: 'German',
    flag: '🇩🇪'
  }, {
    value: 'it',
    label: 'Italian',
    flag: '🇮🇹'
  }, {
    value: 'pt',
    label: 'Portuguese',
    flag: '🇵🇹'
  }, {
    value: 'ja',
    label: 'Japanese',
    flag: '🇯🇵'
  }, {
    value: 'zh',
    label: 'Chinese',
    flag: '🇨🇳'
  }, {
    value: 'ko',
    label: 'Korean',
    flag: '🇰🇷'
  }, {
    value: 'ar',
    label: 'Arabic',
    flag: '🇸🇦'
  }, {
    value: 'th',
    label: 'Thai',
    flag: '🇹🇭'
  }];
  const domains = [{
    value: 'general',
    label: 'General',
    icon: '📝'
  }, {
    value: 'technology',
    label: 'Technology',
    icon: '💻'
  }, {
    value: 'medical',
    label: 'Medical',
    icon: '🏥'
  }, {
    value: 'legal',
    label: 'Legal',
    icon: '⚖️'
  }, {
    value: 'finance',
    label: 'Finance',
    icon: '💰'
  }, {
    value: 'academic',
    label: 'Academic',
    icon: '🎓'
  }, {
    value: 'marketing',
    label: 'Marketing',
    icon: '📈'
  }, {
    value: 'engineering',
    label: 'Engineering',
    icon: '🔧'
  }];

  // Add to history when content or analysis changes
  const addToHistory = useCallback((content: string, analysisResults: any = null) => {
    const newState: HistoryState = {
      content,
      analysisResults,
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
      const previousState = history[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
      setCurrentContent(previousState.content);
      setAnalysisResults(previousState.analysisResults);
      
      // Trigger reanalysis button visibility update
      // The EnhancedLiveAnalysisPanel will detect the content change
      console.log('Undo: content changed, reanalyze button state will update');
    }
  }, [historyIndex, history]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
      setCurrentContent(nextState.content);
      setAnalysisResults(nextState.analysisResults);
      
      // Trigger reanalysis button visibility update
      // The EnhancedLiveAnalysisPanel will detect the content change
      console.log('Redo: content changed, reanalyze button state will update');
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
  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, type: 'translation' | 'glossary') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'translation' && !textManuallyEntered) {
      setIsDraggingTranslation(true);
    } else if (type === 'glossary') {
      setIsDraggingGlossary(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent, type: 'translation' | 'glossary') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'translation') {
      setIsDraggingTranslation(false);
    } else {
      setIsDraggingGlossary(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, type: 'translation' | 'glossary') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (type === 'translation') {
      setIsDraggingTranslation(false);
    } else {
      setIsDraggingGlossary(false);
    }

    // Don't allow translation file drop if text was manually entered
    if (type === 'translation' && textManuallyEntered) {
      toast({
        title: "Cannot Upload",
        description: "Clear the text in the editor first to upload a file",
        variant: "destructive"
      });
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    
    // Process the dropped file
    await processDroppedFile(file, type);
  };

  const processDroppedFile = async (file: File, type: 'translation' | 'glossary') => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: "File Validation Error",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    try {
      const fileContent = await file.text();
      
      // Validate language for translation files
      if (type === 'translation' && currentProject) {
        const shouldProceed = await validateContentBeforeAction(fileContent, {
          type: 'file',
          fileName: file.name
        });
        
        if (!shouldProceed) return;
      }

      // Continue with existing processing...
      if (type === 'translation') {
        if (fileContent.length > 50000) {
          toast({
            title: "Large File Detected",
            description: `File has ${fileContent.length.toLocaleString()} characters. It will be automatically split into chunks for analysis.`
          });
        }
        setCurrentContent(fileContent);
        addToHistory(fileContent, null);
      }
    } catch (error) {
      toast({
        title: "File Read Error",
        description: "Could not read file content",
        variant: "destructive"
      });
      return;
    }

    // Upload file to storage if user and project exist
    if (user && currentProject) {
      try {
        const processedFile = await processFile(
          file, 
          type, 
          currentProject.id, 
          user.id,
          { expectedLanguage: currentProject.language } // Pass expected language
        );
        if (processedFile?.fileId) {
          if (type === 'translation') {
            setTranslationFileId(processedFile.fileId);
          } else {
            setGlossaryFileId(processedFile.fileId);
          }
        }
      } catch (error) {
        console.error('Failed to upload file to storage:', error);
        // Continue even if upload fails - file content is already loaded
      }
    }
    
    if (type === 'translation') {
      setTranslationFile(file);
      setTranslationFileUploaded(true);
      setShowTranslationCheckmark(true);
      
      // Transition from checkmark to upload icon after 1 second
      setTimeout(() => {
        setShowTranslationCheckmark(false);
      }, 1000);
      
      toast({
        title: "Translation File Uploaded",
        description: `${file.name} uploaded successfully`
      });
    } else {
      setGlossaryFile(file);
      setGlossaryFileUploaded(true);
      setShowGlossaryCheckmark(true);
      
      // Transition from checkmark to upload icon after 1 second
      setTimeout(() => {
        setShowGlossaryCheckmark(false);
      }, 1000);
      
      setNoGlossaryWarningShown(false);
      toast({
        title: "Glossary Uploaded",
        description: `${file.name} uploaded successfully`
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'translation' | 'glossary') => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processDroppedFile(file, type);
  };
  const runEnhancedAnalysis = async () => {
    console.log('=== Starting Enhanced Analysis ===');
    console.log('Spell Checker: Enabled by default in prompt');
    console.log('Grammar Checker:', grammarCheckingEnabled ? 'ENABLED' : 'DISABLED');

    // For bilingual projects: Both source AND translation must have content
    if (currentProject?.project_type === 'bilingual') {
      if (!sourceContent.trim() || !currentContent.trim()) {
        toast({
          title: "Both Fields Required",
          description: "For bilingual projects, both Source Editor and Term Validator must contain text before analysis.",
          variant: "destructive"
        });
        return;
      }
    }

    // Check if we have either a file or manually entered text
    const hasTranslation = translationFile || textManuallyEntered && currentContent.length > 0;
    if (!hasTranslation || !glossaryFile) {
      toast({
        title: "Missing Files",
        description: !hasTranslation ? "Please upload a translation file or enter text in the editor." : "Please upload a glossary file.",
        variant: "destructive"
      });
      return;
    }

    // FINAL VALIDATION GATE: Check content language before analysis
    if (currentProject && currentContent.trim()) {
      const shouldProceed = await validateContentBeforeAction(currentContent, {
        type: 'analysis'
      });

      if (!shouldProceed) {
        console.log('Analysis cancelled due to language mismatch');
        return;
      }
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisComplete(false);
    setTranslationFileUploaded(false);
    setGlossaryFileUploaded(false);

    // Track processing time
    startTimeRef.current = Date.now();
    try {
      // Use either file content or manually entered content
      const translationContent = translationFile ? await translationFile.text() : currentContent;
      const glossaryContent = await glossaryFile.text();
      console.log('Calling analyzeWithChunking with:', {
        translationLength: translationContent.length,
        glossaryLength: glossaryContent.length,
        language: selectedLanguage,
        domain: selectedDomain,
        checkGrammar: grammarCheckingEnabled
      });
      const result = await analyzeWithChunking(translationContent, glossaryContent, selectedLanguage, selectedDomain, grammarCheckingEnabled);
      
      // If analysis was cancelled, reset to pre-QA state
      if (!result) {
        console.log('🛑 Analysis cancelled or failed - resetting to pre-QA state');
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setAnalysisComplete(false);
        setAnalysisResults(null);
        return;
      }
      
      if (result) {
        // Log specific spell/grammar issues for verification
        const spellTerms = result.terms.filter((t: any) => t.classification === 'spelling');
        const grammarTerms = result.terms.filter((t: any) => t.classification === 'grammar');
        console.log('Analysis completed. Results:', {
          totalTerms: result.statistics.totalTerms,
          spellingIssues: spellTerms.length,
          grammarIssues: grammarTerms.length,
          termsByClassification: result.terms.reduce((acc: any, term: any) => {
            acc[term.classification] = (acc[term.classification] || 0) + 1;
            return acc;
          }, {})
        });
        console.log('Spelling issues found:', spellTerms.length);
        console.log('Grammar issues found:', grammarTerms.length);
        if (spellTerms.length > 0) {
          console.log('Sample spelling issues:', spellTerms.slice(0, 3).map((t: any) => ({
            text: t.text,
            suggestions: t.suggestions
          })));
        }
        if (grammarTerms.length > 0 && grammarCheckingEnabled) {
          console.log('Sample grammar issues:', grammarTerms.slice(0, 3).map((t: any) => ({
            text: t.text,
            grammar_issues: t.grammar_issues
          })));
        }
        const processingTime = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : undefined;

        // Store last analyzed content and parameters for smart reanalysis
        setLastAnalyzedContent(translationContent);
        setLastAnalysisParams({
          language: selectedLanguage,
          domain: selectedDomain,
          grammarChecking: grammarCheckingEnabled,
          spellingChecking: spellingCheckingEnabled,
          glossaryContent
        });

        // Cache the result
        const cacheKey = analysisCache.generateKey(translationContent, selectedLanguage, selectedDomain, grammarCheckingEnabled);
        analysisCache.set(cacheKey, result, translationContent);
        setAnalysisResults(result);
        setAnalysisComplete(true);
        setCurrentContent(translationContent);
        setOriginalAnalyzedContent(translationContent);
        setLastAnalyzedContent(translationContent);
        setHasLiveAnalysis(true); // Mark that live analysis was performed
        setAnalysisProgress(100);
        addToHistory(translationContent, result);

        // Auto-save to database if user and project exist
        if (user && currentProject) {
          try {
            const sourceWordCountValue = sourceContent.trim() ? sourceContent.trim().split(/\s+/).length : 0;
            const session = await saveAnalysisSession(
              currentProject.id, 
              user.id, 
              selectedLanguage, 
              selectedDomain, 
              result, 
              translationContent,
              sourceContent || undefined, // NEW: Source content for bilingual
              sourceWordCountValue || undefined, // NEW: Source word count
              translationFileId || undefined, 
              glossaryFileId || undefined, 
              processingTime
            );

            // Log audit trail
            await logAnalysis(session?.id || '', translationContent.length);
            console.log('Analysis session auto-saved to database');
          } catch (error) {
            console.error('Failed to auto-save analysis session:', error);
            // Don't block user on save failure
          }
        }
        toast({
          title: "Analysis Complete",
          description: `Analyzed ${result.statistics.totalTerms} terms with ${result.statistics.qualityScore.toFixed(1)}% quality score`
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      startTimeRef.current = null;
    }
  };
  // Reanalysis handler - BILINGUAL PROJECTS: Only reanalyzes the Term Validator (currentContent)
  // The Source Editor (sourceContent) is NOT reanalyzed - it's reference text only
  // NOTE: Only available during live sessions (after QA analysis is performed)
  const handleReanalyze = async () => {
    // Only allow reanalysis if analysis was performed in current live session
    if (!hasLiveAnalysis) {
      console.log('⚠️ Reanalysis blocked - no live analysis in current session');
      return;
    }
    
    // Check if we have glossary content available
    const hasGlossaryContent = glossaryFile || glossaryFileUploaded;
    
    if (!hasGlossaryContent) {
      if (!noGlossaryWarningShown) {
        toast({
          title: "No Glossary",
          description: "Please upload a glossary file for re-analysis",
          variant: "destructive",
          duration: Infinity
        });
        setNoGlossaryWarningShown(true);
      }
      return;
    }
    
    setIsReanalyzing(true);
    console.log('🔄 Starting reanalysis of Term Validator content');
    console.log(`Project type: ${currentProject?.project_type || 'unknown'}`);
    console.log(`Analyzing content length: ${currentContent.length} chars`);
    
    try {
      // Use currentContent from state to get the latest edited content from Term Validator
      const content = currentContent;
      
      // Get glossary content - either from file or fetch from storage
      let glossaryContent = '';
      
      if (glossaryFile) {
        glossaryContent = await glossaryFile.text();
      } else if (glossaryFileId) {
        // Fetch from storage using file_uploads table
        console.log('📥 Fetching glossary from storage:', glossaryFileId);
        try {
          const { data: fileData, error: fileError } = await supabase
            .from('file_uploads')
            .select('storage_path')
            .eq('id', glossaryFileId)
            .single();
          
          if (fileError) throw fileError;
          
          const { data: storageData, error: storageError } = await supabase.storage
            .from('glossary-files')
            .download(fileData.storage_path);
          
          if (storageError) throw storageError;
          
          glossaryContent = await storageData.text();
          console.log('✅ Retrieved glossary from storage:', glossaryContent.length, 'chars');
        } catch (error) {
          console.error('Failed to fetch glossary from storage:', error);
          toast({
            title: "Glossary Not Found",
            description: "Please re-upload your glossary file",
            variant: "destructive"
          });
          return;
        }
      }

      // Generate cache key for current content
      const cacheKey = analysisCache.generateKey(content, selectedLanguage, selectedDomain, grammarCheckingEnabled, spellingCheckingEnabled);
      console.log('=== Smart Reanalysis Debug ===');
      console.log('Cache Key:', cacheKey);
      console.log('Current Content Length:', content.length);
      console.log('Last Analyzed Content Length:', lastAnalyzedContent?.length || 0);
      console.log('Has Analysis Results:', !!analysisResults);

      // Check for exact cache hit first
      const cachedResult = analysisCache.get(cacheKey);
      if (cachedResult) {
        console.log('✅ Exact cache hit - using cached results');
        setAnalysisResults(cachedResult);
        setLastAnalyzedContent(content);
        setOriginalAnalyzedContent(content);
        setLastAnalysisParams({
          language: selectedLanguage,
          domain: selectedDomain,
          grammarChecking: grammarCheckingEnabled,
          spellingChecking: spellingCheckingEnabled,
          glossaryContent
        });
        toast({
          title: "Re-analysis Complete (Cached)",
          description: "Using cached analysis results - no changes detected"
        });
        return;
      }
      console.log('❌ No exact cache hit, checking for partial analysis...');

      // Check if we can use partial analysis - ensure we have both previous content and results
      if (lastAnalyzedContent && lastAnalyzedContent.length > 0 && analysisResults) {
        const changes = analysisCache.calculateContentChanges(content, lastAnalyzedContent);
        console.log(`📊 Content changes: ${changes.percentChanged.toFixed(1)}% changed, ${changes.changedSegments.length} segments`);

        // Check if we need to force full analysis for minor language edits
        const hasLanguageCheckEnabled = spellingCheckingEnabled || grammarCheckingEnabled;
        const isMinorEdit = changes.percentChanged < 1 && changes.changedSegments.length <= 2;

        if (hasLanguageCheckEnabled && isMinorEdit) {
          console.log('🔍 Minor edit detected with language checks enabled - forcing full analysis of changed segments');
          analysisCache.clear();
        }

        // If less than 30% changed and we have cached terms, try partial analysis (unless it's a minor edit with language checks)
        if (changes.percentChanged < 30 && changes.changedSegments.length > 0 && !isMinorEdit) {
          try {
            console.log('🔄 Attempting partial re-analysis of changed segments');

            // Analyze only the changed segments (but use full glossary for context)
            const changedContent = changes.changedSegments.map(seg => seg.content).join('\n');
            console.log(`📝 Analyzing ${changedContent.length} characters of changed content`);
            const partialResult = await analyzeWithChunking(changedContent, glossaryContent, selectedLanguage, selectedDomain, grammarCheckingEnabled, spellingCheckingEnabled);
            if (partialResult && partialResult.terms.length > 0) {
              console.log(`✅ Partial analysis successful: ${partialResult.terms.length} terms found`);

              // Merge the partial results with existing analysis
              const mergedResults = analysisCache.mergeAnalysisResults(analysisResults, partialResult.terms, changes);
              console.log(`🔄 Merged results: ${mergedResults.terms.length} total terms`);

              // Cache the merged results
              analysisCache.set(cacheKey, mergedResults, content);
              setAnalysisResults(mergedResults);
              setLastAnalyzedContent(content);
              setOriginalAnalyzedContent(content);
              setLastAnalysisParams({
                language: selectedLanguage,
                domain: selectedDomain,
                grammarChecking: grammarCheckingEnabled,
                spellingChecking: spellingCheckingEnabled,
                glossaryContent
              });
              toast({
                title: "Partial Re-analysis Complete",
                description: `Analyzed ${changes.changedSegments.length} changed segments (${changes.percentChanged.toFixed(1)}% change)`
              });
              return;
            } else {
              console.warn('⚠️ Partial analysis returned no terms, falling back to full analysis');
            }
          } catch (partialError) {
            console.warn('❌ Partial analysis failed, falling back to full analysis:', partialError);
            // Continue with full analysis
          }
        } else {
          console.log(`📈 Change threshold exceeded (${changes.percentChanged.toFixed(1)}% > 30%), using full analysis`);
        }
      } else {
        console.log('ℹ️ No previous analysis state available, using full analysis');
        if (!lastAnalyzedContent) console.log('  - lastAnalyzedContent is empty');
        if (!analysisResults) console.log('  - analysisResults is empty');
      }

      // Fallback to full analysis
      console.log('🔄 Performing full re-analysis');
      const result = await analyzeWithChunking(content, glossaryContent, selectedLanguage, selectedDomain, grammarCheckingEnabled, spellingCheckingEnabled);
      if (result) {
        console.log(`✅ Full re-analysis complete: ${result.terms.length} terms`);

        // Cache the new results
        analysisCache.set(cacheKey, result, content);
        setAnalysisResults(result);
        setLastAnalyzedContent(content);
        setOriginalAnalyzedContent(content);
        setHasLiveAnalysis(true); // Maintain live analysis flag during reanalysis
        setLastAnalysisParams({
          language: selectedLanguage,
          domain: selectedDomain,
          grammarChecking: grammarCheckingEnabled,
          spellingChecking: spellingCheckingEnabled,
          glossaryContent
        });
        toast({
          title: "Re-analysis Complete",
          description: `Content fully re-analyzed (${result.terms.length} terms)`
        });
      }
    } catch (error) {
      console.error('❌ Re-analysis failed:', error);
      toast({
        title: "Re-analysis Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsReanalyzing(false);
    }
  };
  const handleContentChange = (content: string) => {
    // For bilingual projects: Validate that source editor also has content
    if (currentProject?.project_type === 'bilingual' && content.length > 0 && !sourceContent.trim()) {
      toast({
        title: "Source Required",
        description: "Please add text to the Source Editor first before entering translation content.",
        variant: "destructive"
      });
      return;
    }
    
    setCurrentContent(content);
    setHasUnsavedChanges(true);
    
    // Clear translation file reference when content is manually changed
    // This ensures the analysis uses the new content, not the old file
    if (translationFile) {
      setTranslationFile(null);
      setTranslationFileUploaded(false);
    }

    // Check if content has changed significantly from what was analyzed
    if (analysisResults && originalAnalyzedContent) {
      const similarity = calculateContentSimilarity(content, originalAnalyzedContent);
      console.log(`Content similarity: ${(similarity * 100).toFixed(1)}%`);

      // If content similarity is less than 80% (20% change), clear analysis
      if (similarity < 0.8) {
        console.log('Content changed significantly, clearing analysis results');
      setAnalysisResults(null);
      setAnalysisComplete(false);
      setLastAnalyzedContent('');
      setOriginalAnalyzedContent('');
      setHasLiveAnalysis(false); // Clear live analysis flag when content changes significantly
        toast({
          title: "Content changed significantly",
          description: `Analysis results cleared (${(similarity * 100).toFixed(1)}% similarity). Click 'Start QA' to re-analyze the new content.`,
          variant: "default"
        });
      }
    }

    // Add to history (but don't clear analysis if it's just minor changes)
    addToHistory(content, analysisResults);

    // Detect manual text entry
    if (content.length > 0 && !textManuallyEntered) {
      setTextManuallyEntered(true);
      setShowUploadIconTransition(true);
      setTimeout(() => {
        setShowUploadIconTransition(false);
      }, 2000);
    } else if (content.length === 0 && textManuallyEntered) {
      setTextManuallyEntered(false);
      setShowUploadIconTransition(false);
    }
  };
  
  const handleSourceContentChange = (content: string) => {
    // For bilingual projects: If clearing source content and translation has content, warn user
    if (currentProject?.project_type === 'bilingual' && content.length === 0 && currentContent.trim()) {
      toast({
        title: "Warning",
        description: "Clearing the Source Editor while translation content exists. Both fields are required for analysis.",
        variant: "destructive"
      });
    }
    
    setSourceContent(content);
    setHasUnsavedChanges(true);
  };
  const handleValidateTerm = (term: any) => {
    if (!analysisResults || term.classification !== 'review') return;

    // Update the term's classification from 'review' to 'valid'
    const updatedTerms = analysisResults.terms.map((t: any) => t.text === term.text && t.classification === 'review' ? {
      ...t,
      classification: 'valid' as const
    } : t);

    // Update statistics
    const updatedStats = {
      ...analysisResults.statistics,
      review: Math.max(0, analysisResults.statistics.review - 1),
      valid: analysisResults.statistics.valid + 1
    };
    const updatedAnalysisResults = {
      ...analysisResults,
      terms: updatedTerms,
      statistics: updatedStats
    };
    setAnalysisResults(updatedAnalysisResults);
    addToHistory(currentContent, updatedAnalysisResults);
    setHasUnsavedChanges(true);
    toast({
      title: "Term Validated",
      description: "Term moved from Review to Valid"
    });
  };

  // Save version functionality - project-specific
  const handleSaveVersion = useCallback(() => {
    if (!currentProject || !currentContent.trim()) {
      toast({
        title: "Cannot save",
        description: "No content to save",
        variant: "destructive"
      });
      return;
    }
    const wordCount = currentContent.trim().split(/\s+/).length;
    const newVersion: SavedVersion = {
      id: Date.now().toString(),
      content: currentContent,
      sourceContent: currentProject.project_type === 'bilingual' ? sourceContent : undefined,
      timestamp: Date.now(),
      name: `Version ${savedVersions.length + 1}`,
      wordCount,
      hasAnalysis: analysisComplete,
      projectId: currentProject.id, // Add project reference
      analysisResults: analysisComplete ? analysisResults : undefined
    };
    const updatedVersions = [newVersion, ...savedVersions].slice(0, 20);
    setSavedVersions(updatedVersions);
    const versionsKey = `lexiq-saved-versions-${currentProject.id}`;
    localStorage.setItem(versionsKey, JSON.stringify(updatedVersions));
    setHasUnsavedChanges(false);
    toast({
      title: "Version saved",
      description: `Saved as "${newVersion.name}" with ${wordCount} words`
    });
  }, [currentContent, sourceContent, savedVersions, analysisComplete, analysisResults, toast, currentProject]);
  const handleLoadVersion = useCallback((version: SavedVersion) => {
    console.log('📂 Loading version:', version.name);
    
    // Restore translation content
    setCurrentContent(version.content);
    setOriginalAnalyzedContent(version.content); // Critical for Term Validator
    
    // Restore source content for bilingual projects
    if (currentProject?.project_type === 'bilingual' && version.sourceContent) {
      setSourceContent(version.sourceContent);
      console.log('✅ Restored source content:', version.sourceContent.length, 'chars');
    }
    
    // Restore analysis results if available
    if (version.hasAnalysis && version.analysisResults) {
      setAnalysisResults(version.analysisResults);
      setAnalysisComplete(true);
      // Don't set hasLiveAnalysis - loaded versions are not live sessions
      console.log('✅ Restored analysis results');
    }
    
    setHasUnsavedChanges(false);
    toast({
      title: "Version loaded",
      description: `Loaded "${version.name}"`
    });
  }, [toast, currentProject]);
  const handleDeleteVersion = useCallback((id: string) => {
    if (!currentProject) return;
    const updatedVersions = savedVersions.filter(v => v.id !== id);
    setSavedVersions(updatedVersions);
    const versionsKey = `lexiq-saved-versions-${currentProject.id}`;
    localStorage.setItem(versionsKey, JSON.stringify(updatedVersions));
    toast({
      title: "Version deleted",
      description: "Version removed from history"
    });
  }, [savedVersions, toast, currentProject]);

  // Handle session restoration from history
  const handleRestoreSession = useCallback((session: AnalysisSession) => {
    console.log('🔄 Restoring analysis session:', session.id);

    // Use the stored translation content if available, otherwise fall back to terms text
    let restoredContent = '';
    if (session.translation_content) {
      restoredContent = session.translation_content;
      console.log('✅ Using stored translation content:', restoredContent.length, 'chars');
    } else if (session.analyzed_terms && Array.isArray(session.analyzed_terms) && session.analyzed_terms.length > 0) {
      // Fallback: reconstruct from terms (existing behavior)
      const fullText = session.analyzed_terms.map((t: any) => t.text).join(' ');
      restoredContent = fullText;
      console.log('⚠️ Reconstructed content from terms:', restoredContent.length, 'chars');
    }

    // Set the main content and analysis results
    setCurrentContent(restoredContent);
    
    // Restore source content for bilingual projects
    if (currentProject?.project_type === 'bilingual' && session.source_content) {
      setSourceContent(session.source_content);
      console.log('✅ Restored source content from session:', session.source_content.length, 'chars');
    }
    
    // Restore file upload indicators if files were used in the session
    if (session.glossary_file_id) {
      setGlossaryFileId(session.glossary_file_id);
      setGlossaryFileUploaded(true);
      console.log('✅ Detected glossary file from session:', session.glossary_file_id);
    }
    
    if (session.translation_file_id) {
      setTranslationFileId(session.translation_file_id);
      setTranslationFileUploaded(true);
      console.log('✅ Detected translation file from session:', session.translation_file_id);
    }
    
    setAnalysisResults({
      terms: session.analyzed_terms,
      statistics: session.statistics
    });
    setAnalysisComplete(true);
    setActiveMainTab('edit');

    // CRITICAL: Initialize reanalysis state with restored data
    setLastAnalyzedContent(restoredContent);
    setLastAnalysisParams({
      language: session.language,
      domain: session.domain,
      grammarChecking: grammarCheckingEnabled,
      spellingChecking: spellingCheckingEnabled,
      glossaryContent: ''
    });
    console.log('✅ Session restoration complete - reanalysis state initialized');

    // Helper function to format timestamp with relative time
    const formatSessionTimestamp = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffMins < 1) {
        return 'Just now';
      } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    };
    toast({
      title: "Session Restored",
      description: `Your analysis from ${formatSessionTimestamp(session.created_at)} has been loaded.`
    });
  }, [grammarCheckingEnabled, toast]);

  // Handle project setup completion
  const handleProjectSetupComplete = async (
    projectName: string, 
    language: string, 
    domain: string, 
    projectType: 'monolingual' | 'bilingual' = 'monolingual',
    sourceLanguage?: string
  ) => {
    try {
      await createProject(projectName, language, domain, projectType, sourceLanguage);
      setShowProjectSetup(false);
      toast({
        title: "Project Created",
        description: `${projectName} is ready to use.`
      });
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: "Failed to create project",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };
  const handleSetupSkip = () => {
    setRequiresProjectSetup(false);
    setShowProjectSetup(false);
  };

  // Clear all data when returning to language select
  const handleReturnToLanguageSelect = useCallback(() => {
    if (hasUnsavedChanges && currentContent.trim()) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to go back? All unsaved text and uploads will be cleared.');
      if (!confirmed) return;
    }

    // Clear all state
    setCurrentContent('');
    setSourceContent(''); // Clear source content
    setTranslationFile(null);
    setGlossaryFile(null);
    setAnalysisResults(null);
    setAnalysisComplete(false);
    setTranslationFileUploaded(false);
    setGlossaryFileUploaded(false);
    setTextManuallyEntered(false);
    setHasUnsavedChanges(false);
    localStorage.removeItem('lexiq-session');
    if (onReturn) {
      onReturn();
    }
  }, [hasUnsavedChanges, currentContent, onReturn]);
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
          const rows = analysisResults.terms.map((t: any) => [t.text, t.classification, t.score, `${t.startPosition}-${t.endPosition}`, t.suggestions?.join('; ') || '']);
          content = [headers, ...rows].map(row => row.join(',')).join('\n');
          filename = 'analysis-terms.csv';
          mimeType = 'text/csv';
        }
        break;
    }
    const blob = new Blob([content], {
      type: mimeType
    });
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
      description: `File exported as ${filename}`
    });
  };
  const getSelectedLanguageInfo = () => {
    return languages.find(lang => lang.value === selectedLanguage);
  };
  const getSelectedDomainInfo = () => {
    return domains.find(domain => domain.value === selectedDomain);
  };
  const validPercentage = analysisResults?.statistics?.totalTerms > 0 ? analysisResults.statistics.validTerms / analysisResults.statistics.totalTerms * 100 : 0;
  const getGradientColor = (percentage: number) => {
    if (percentage <= 25) return 'from-red-500 to-red-600';
    if (percentage <= 50) return 'from-orange-500 to-yellow-500';
    if (percentage <= 75) return 'from-lime-500 to-green-400';
    return 'from-green-500 to-green-600';
  };
  return <div className="min-h-screen bg-gradient-subtle">
      {/* Modernized Header with Glossy Effect */}
      <div className="bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border-b border-border/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] sticky top-0 z-50 relative overflow-hidden">
        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine pointer-events-none" />
        
        <div className="max-w-[1800px] mx-auto px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button onClick={() => {
              if (currentContent.trim()) {
                setShowQuitDialog(true);
              } else {
                setSelectedProject(null);
              }
            }} className="cursor-pointer transition-transform hover:scale-105" title="Return to project selection">
                <img src={lexiqLogo} alt="LexiQ Logo" className="h-12 w-auto" />
              </button>
              
              {/* Organization & Project Selectors - Conditionally render ProjectSelector */}
              <OrganizationSwitcher />
              {projects.length > 0 && <ProjectSelector />}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Save Button */}
              <Button variant="outline" className="gap-2" onClick={() => setShowSaveDialog(true)} disabled={!currentContent.trim()}>
                <Save className="h-4 w-4" />
                {hasUnsavedChanges ? 'Save*' : 'Versions'}
              </Button>

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
              
              <Badge variant="outline" className={`${engineReady ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                <Activity className="h-3 w-3 mr-1" />
                {engineReady ? 'Engine Ready' : 'Engine Not Ready'}
              </Badge>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <p className="text-xs text-muted-foreground">Signed in</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSignOutDialog(true)}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          {/* Modern Tab Navigation */}
          <TabsList className="bg-card/50 p-1.5 rounded-lg border border-border/50 w-fit h-auto">
            <TabsTrigger value="edit" className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all">
              Edit
            </TabsTrigger>
            <TabsTrigger value="batch" className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all">
              Batch
            </TabsTrigger>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all">
              Statistics
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all">
              History
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-card data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all">
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
                  {analysisComplete && analysisResults && <Card>
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
                        
                        <div className={`bg-gradient-to-r ${getGradientColor(validPercentage)} p-3 rounded-md text-white dark:brightness-90`}>
                          <div className="text-xs opacity-90">Validated Terms</div>
                          <div className="text-2xl font-bold">
                            {analysisResults.statistics.validTerms}/{analysisResults.statistics.totalTerms}
                          </div>
                          <div className="text-xs opacity-90 mt-1">
                            {validPercentage.toFixed(1)}% Complete
                          </div>
                        </div>
                      </CardContent>
                    </Card>}

                  {/* Compact File Upload */}
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div 
                        onClick={() => !textManuallyEntered && translationInputRef.current?.click()} 
                        onDragOver={(e) => handleDragOver(e, 'translation')}
                        onDragLeave={(e) => handleDragLeave(e, 'translation')}
                        onDrop={(e) => handleDrop(e, 'translation')}
                        className={`flex items-center justify-between p-3 rounded-md border-2 border-dashed transition-all ${
                          textManuallyEntered 
                            ? 'border-success bg-success/5 cursor-not-allowed opacity-60' 
                            : isDraggingTranslation
                              ? 'border-primary bg-primary/20 scale-105'
                              : translationFile 
                                ? 'border-success bg-success/5 cursor-pointer hover:border-primary hover:bg-primary/5' 
                                : 'border-border cursor-pointer hover:border-primary hover:bg-primary/5'
                        }`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img src={translationIcon} alt="Translation" className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs truncate">
                            {isDraggingTranslation 
                              ? 'Drop file here...' 
                              : textManuallyEntered 
                                ? 'Text Inserted!' 
                                : translationFile 
                                  ? translationFile.name 
                                  : 'Translation File'}
                          </span>
                        </div>
                        {textManuallyEntered ? (
                          showUploadIconTransition ? (
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0 ml-2 animate-in fade-in" />
                          ) : (
                            <Upload className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2 rotate-180 animate-in fade-in" />
                          )
                        ) : translationFileUploaded ? (
                          showTranslationCheckmark ? (
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0 ml-2 animate-in fade-in" />
                          ) : (
                            <Upload className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2 rotate-180 animate-in fade-in" />
                          )
                        ) : (
                          <Upload className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  {textManuallyEntered 
                    ? 'Paste or type in editor • Clear text to upload files' 
                    : currentProject?.project_type === 'bilingual'
                      ? '.xliff, .tmx, .po (and TMS/CAT variants) • Max 50MB'
                      : '.txt, .docx, .json, .csv, .xml, .yml, .odt, .xlsx • Max 50MB'
                  }
                </p>
                      <input 
                        ref={translationInputRef} 
                        type="file" 
                        onChange={e => handleFileUpload(e, 'translation')} 
                        className="hidden" 
                        accept={currentProject?.project_type === 'bilingual' 
                          ? '.sdlxliff,.mqxliff,.txlf,.mqxlz,.mxliff,.xlsx,.xlsm,.xliff,.xlf,.xlif,.tmx,.po,.csv'
                          : '.txt,.doc,.docx,.odt,.json,.yml,.csv,.xlsx'
                        } 
                      />

                      <div 
                        onClick={() => glossaryInputRef.current?.click()} 
                        onDragOver={(e) => handleDragOver(e, 'glossary')}
                        onDragLeave={(e) => handleDragLeave(e, 'glossary')}
                        onDrop={(e) => handleDrop(e, 'glossary')}
                        className={`flex items-center justify-between p-3 rounded-md border-2 border-dashed cursor-pointer transition-all ${
                          isDraggingGlossary
                            ? 'border-primary bg-primary/20 scale-105 hover:border-primary hover:bg-primary/20'
                            : glossaryFileUploaded 
                              ? 'border-success bg-success/5 hover:border-primary hover:bg-primary/5' 
                              : 'border-border hover:border-primary hover:bg-primary/5'
                        }`}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <img src={glossaryIcon} alt="Glossary" className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs truncate">
                            {isDraggingGlossary 
                              ? 'Drop file here...' 
                              : glossaryFile 
                                ? glossaryFile.name 
                                : glossaryFileUploaded 
                                  ? 'Glossary (from session) • Click to replace'
                                  : 'Glossary File'
                            }
                          </span>
                        </div>
                        {glossaryFileUploaded ? (
                          showGlossaryCheckmark ? (
                            <CheckCircle className="h-4 w-4 text-success flex-shrink-0 ml-2 animate-in fade-in" />
                          ) : (
                            <Upload className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2 rotate-180 animate-in fade-in" />
                          )
                        ) : (
                          <Upload className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  .csv or .txt format • Max 50MB
                </p>
                      <input ref={glossaryInputRef} type="file" onChange={e => handleFileUpload(e, 'glossary')} className="hidden" accept=".csv,.txt" />

                      <Button 
                        onClick={runEnhancedAnalysis} 
                        disabled={
                          !translationFile && !textManuallyEntered || 
                          !glossaryFile || 
                          isAnalyzing || 
                          (currentProject?.project_type === 'bilingual' && (!sourceContent.trim() || !currentContent.trim()))
                        } 
                        className="w-full relative overflow-hidden transition-all duration-300"
                      >
                        {isAnalyzing ? <div className="flex items-center justify-center w-full">
                            {/* Animated gradient background */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-primary animate-gradient-x"></div>
                            
                            {/* Shimmer overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                            
                            {/* Content */}
                            <div className="relative z-10 flex items-center">
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Analyzing...
                            </div>
                          </div> : <div className="flex items-center">
                            <Play className="h-4 w-4 mr-2" />
                            Start QA
                          </div>}
                      </Button>

                      {isAnalyzing && <div className="space-y-2">
                          {/* Enhanced Progress Bar - only for chunked analysis */}
                          {totalChunks > 1 && <>
                              <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-500 ease-out relative" style={{
                            width: `${engineProgress}%`
                          }}>
                                  {/* Progress bar shimmer */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                                </div>
                              </div>
                              
                              <p className="text-xs text-muted-foreground text-center">
                                Processing chunk {currentChunk} of {totalChunks}
                              </p>
                            </>}

                          {/* Cancel Button */}
                          <Button variant="outline" size="sm" onClick={cancelAnalysis} className="w-full">
                            Cancel Analysis
                          </Button>
                        </div>}
                    </CardContent>
                  </Card>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

                  {/* Main Editor Area */}
              <ResizablePanel defaultSize={80}>
                <div className="h-full flex flex-col">
                  {/* Undo/Redo Controls & Sync Mode */}
                  <div className="flex items-center justify-between px-6 py-3 border-b bg-card/50">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold">
                        {currentProject?.project_type === 'bilingual' ? 'Dual Editor' : 'Editor'}
                      </h3>
                      
                      {/* Sync Mode Selector for Bilingual Projects */}
                      {currentProject?.project_type === 'bilingual' && (
                        <div className="flex items-center gap-2">
                          <Label htmlFor="sync-mode" className="text-sm font-medium text-muted-foreground">
                            Analysis Mode:
                          </Label>
                          <select
                            id="sync-mode"
                            value={syncMode}
                            onChange={(e) => setSyncMode(e.target.value as any)}
                            className="rounded border p-1 text-sm bg-background"
                          >
                            <option value="gatv">GTV Only</option>
                            <option value="lqa">LQA Only</option>
                            <option value="both">LQA & GTV</option>
                            <option value="none">Manual Review</option>
                          </select>

                          {lqaSyncEnabled && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              LQA Sync Active
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsDarkMode(!isDarkMode)} 
                        className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                      >
                        {isDarkMode ? 'Disable Dark Mode' : 'Enable Dark Mode'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
                        <Undo2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)">
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ResizablePanelGroup direction="vertical" className="flex-1">
                    {/* Editor Panel - Conditional dual-pane layout */}
                    <ResizablePanel defaultSize={65} minSize={30}>
                      <div className="h-full">
                        {currentProject?.project_type === 'bilingual' ? (
                          // BILINGUAL: Horizontal dual-pane layout
                          <ResizablePanelGroup direction="horizontal" className="h-full">
                            {/* Target Text Editor (Terminology Validator) */}
                            <ResizablePanel defaultSize={50} minSize={30}>
                              <div className="h-full overflow-auto p-4">
                                <EnhancedLiveAnalysisPanel 
                                  content={currentContent} 
                                  flaggedTerms={analysisResults?.terms ? transformAnalyzedTermsToFlagged(analysisResults.terms) : []} 
                                  onContentChange={handleContentChange} 
                                  onReanalyze={hasLiveAnalysis ? () => handleReanalyze() : undefined} 
                                  isReanalyzing={isReanalyzing} 
                                  grammarCheckingEnabled={grammarCheckingEnabled} 
                                  onGrammarCheckingToggle={setGrammarCheckingEnabled} 
                                  spellingCheckingEnabled={spellingCheckingEnabled} 
                                  onSpellingCheckingToggle={setSpellingCheckingEnabled} 
                                  selectedLanguage={selectedLanguage} 
                                  selectedDomain={selectedDomain} 
                                  onValidateTerm={handleValidateTerm} 
                                  originalAnalyzedContent={hasLiveAnalysis ? originalAnalyzedContent : ''}
                                  syncMode={syncMode}
                                  lqaSyncEnabled={lqaSyncEnabled}
                                  sourceContent={sourceContent}
                                />
                              </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            {/* Source Text Editor */}
                            <ResizablePanel defaultSize={50} minSize={30}>
                              <div className="h-full overflow-auto p-4">
                                <SourceEditor
                                  content={sourceContent}
                                  onContentChange={handleSourceContentChange}
                                  language={currentProject?.source_language || 'en'}
                                  grammarEnabled={sourceGrammarEnabled}
                                  spellingEnabled={sourceSpellingEnabled}
                                  onGrammarToggle={() => setSourceGrammarEnabled(!sourceGrammarEnabled)}
                                  onSpellingToggle={() => setSourceSpellingEnabled(!sourceSpellingEnabled)}
                                  isLocked={isSourceLocked}
                                  onLockToggle={() => setIsSourceLocked(!isSourceLocked)}
                                />
                              </div>
                            </ResizablePanel>
                          </ResizablePanelGroup>
                        ) : (
                          // MONOLINGUAL: Single pane layout
                          <div className="h-full overflow-auto p-4">
                            <EnhancedLiveAnalysisPanel 
                              content={currentContent} 
                              flaggedTerms={analysisResults?.terms ? transformAnalyzedTermsToFlagged(analysisResults.terms) : []} 
                              onContentChange={handleContentChange} 
                              onReanalyze={hasLiveAnalysis ? () => handleReanalyze() : undefined} 
                              isReanalyzing={isReanalyzing} 
                              grammarCheckingEnabled={grammarCheckingEnabled} 
                              onGrammarCheckingToggle={setGrammarCheckingEnabled} 
                              spellingCheckingEnabled={spellingCheckingEnabled} 
                              onSpellingCheckingToggle={setSpellingCheckingEnabled} 
                              selectedLanguage={selectedLanguage} 
                              selectedDomain={selectedDomain} 
                              onValidateTerm={handleValidateTerm} 
                              originalAnalyzedContent={hasLiveAnalysis ? originalAnalyzedContent : ''}
                              syncMode={syncMode}
                              lqaSyncEnabled={lqaSyncEnabled}
                              sourceContent={sourceContent}
                            />
                          </div>
                        )}
                      </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* QA Analysis Panel */}
                    <ResizablePanel defaultSize={35} minSize={20}>
                      <div className="h-full overflow-auto p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Statistics</h3>
                        </div>
                        
                        {analysisComplete && analysisResults ? <div className="space-y-4">
                            {/* Analysis insights and visualizations */}
                            <SimplifiedStatisticsPanel 
                              statistics={analysisResults.statistics} 
                              projectType={currentProject?.project_type as 'monolingual' | 'bilingual'}
                              sourceWordCount={sourceContent.trim() ? sourceContent.trim().split(/\s+/).length : 0}
                            />
                          </div> : <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>Start QA to view</p>
                            </div>
                          </div>}
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          {/* Batch Tab */}
          <TabsContent value="batch">
            <BatchProcessor />
          </TabsContent>

          {/* Statistics Tab with Sub-tabs */}
          <TabsContent value="statistics">
            <Tabs defaultValue="enhanced" className="space-y-4">
              <TabsList>
                <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <TabsContent value="enhanced">
                {analysisComplete && analysisResults ? <EnhancedStatisticsTab statistics={analysisResults.statistics} /> : <Card className="p-12">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <h3 className="text-lg font-semibold mb-2">No Analysis Data</h3>
                      <p>Complete an analysis in the Edit tab to view detailed statistics</p>
                    </div>
                  </Card>}
              </TabsContent>
              
              <TabsContent value="analytics">
                <AnalyticsDashboard />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <HistoryPanel onRestoreSession={handleRestoreSession} />
          </TabsContent>

          {/* Data Management Tab */}
            <TabsContent value="data">
              {analysisComplete && analysisResults ? <DataManagementTab terms={analysisResults.terms || []} glossaryContent={glossaryFile ? '' : ''} currentFullText={currentFullText} language={selectedLanguage} /> : <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <Database className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
                  <p>Complete an analysis in the Edit tab to manage glossary data</p>
                </div>
              </Card>}
          </TabsContent>
        </Tabs>
      </div>

      {/* Project Setup Wizard */}
      <ProjectSetupWizard isOpen={showProjectSetup} onComplete={handleProjectSetupComplete} onSkip={handleSetupSkip} />

      {/* Save Versions Dialog */}
      <SaveVersionsDialog open={showSaveDialog} onOpenChange={setShowSaveDialog} versions={savedVersions} onLoadVersion={handleLoadVersion} onDeleteVersion={handleDeleteVersion} currentContent={currentContent} onSaveNew={() => {
      handleSaveVersion();
      setShowSaveDialog(false);
    }} />

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? Any unsaved work will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
            await signOut();
            setShowSignOutDialog(false);
          }}>
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quit Confirmation Dialog */}
      <AlertDialog open={showQuitDialog} onOpenChange={setShowQuitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quit to Project Selection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to quit? Any unsaved work will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            setShowQuitDialog(false);
            setSelectedProject(null);
          }}>
              Quit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Real-time Language Validation Dialog (Blocking) */}
      {realTimeValidation && (
        <LanguageMismatchDialog
          isOpen={realTimeValidation.isOpen}
          onClose={() => setRealTimeValidation(null)}
          onCancel={realTimeValidation.onCancel}
          onContinue={realTimeValidation.onContinue}
          validation={realTimeValidation.validation}
          contentType="translation"
        />
      )}

      {/* Analysis-time Language Validation Dialog */}
      {languageValidation && (
        <LanguageMismatchDialog
          isOpen={languageValidation.isOpen}
          onClose={() => setLanguageValidation(null)}
          onCancel={languageValidation.onCancel}
          onContinue={languageValidation.onContinue}
          validation={languageValidation.validation}
          contentType={languageValidation.context.type === 'file' ? 'file' : 'translation'}
          fileName={languageValidation.context.fileName}
        />
      )}
    </div>;
}