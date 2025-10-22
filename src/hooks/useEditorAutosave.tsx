import { useState, useEffect, useCallback, useRef } from 'react';

interface AutosaveOptions {
  key: string;
  interval?: number; // milliseconds
  onSave?: (content: string) => void;
  onRestore?: (content: string) => void;
}

interface AutosaveState {
  content: string;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  isRestoring: boolean;
}

export const useEditorAutosave = (options: AutosaveOptions) => {
  const { key, interval = 5000, onSave, onRestore } = options;
  
  const [state, setState] = useState<AutosaveState>({
    content: '',
    lastSaved: null,
    hasUnsavedChanges: false,
    isRestoring: false,
  });

  const contentRef = useRef(state.content);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update content ref when content changes
  useEffect(() => {
    contentRef.current = state.content;
  }, [state.content]);

  // Autosave logic
  useEffect(() => {
    if (interval <= 0) return;

    intervalRef.current = setInterval(() => {
      const currentContent = contentRef.current;
      if (currentContent && state.hasUnsavedChanges) {
        try {
          localStorage.setItem(key, JSON.stringify({
            content: currentContent,
            timestamp: new Date().toISOString(),
          }));
          
          setState((prev) => ({
            ...prev,
            lastSaved: new Date(),
            hasUnsavedChanges: false,
          }));

          onSave?.(currentContent);
        } catch (error) {
          console.error('Autosave failed:', error);
        }
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [key, interval, state.hasUnsavedChanges, onSave]);

  // Update content (marks as unsaved)
  const updateContent = useCallback((newContent: string) => {
    setState((prev) => ({
      ...prev,
      content: newContent,
      hasUnsavedChanges: newContent !== prev.content,
    }));
  }, []);

  // Check for autosaved content on mount
  const checkForAutosave = useCallback((): string | null => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.content || null;
      }
    } catch (error) {
      console.error('Failed to check autosave:', error);
    }
    return null;
  }, [key]);

  // Restore from autosave (with confirmation)
  const restoreFromAutosave = useCallback((force: boolean = false) => {
    const savedContent = checkForAutosave();
    
    if (!savedContent) {
      return false;
    }

    // Don't overwrite if user has unsaved changes (unless forced)
    if (state.hasUnsavedChanges && !force) {
      return false;
    }

    setState((prev) => ({
      ...prev,
      content: savedContent,
      hasUnsavedChanges: false,
      isRestoring: true,
    }));

    onRestore?.(savedContent);

    // Clear restoring flag after animation
    setTimeout(() => {
      setState((prev) => ({ ...prev, isRestoring: false }));
    }, 300);

    return true;
  }, [checkForAutosave, state.hasUnsavedChanges, onRestore]);

  // Manual save
  const saveNow = useCallback(() => {
    try {
      localStorage.setItem(key, JSON.stringify({
        content: state.content,
        timestamp: new Date().toISOString(),
      }));
      
      setState((prev) => ({
        ...prev,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
      }));

      onSave?.(state.content);
      return true;
    } catch (error) {
      console.error('Manual save failed:', error);
      return false;
    }
  }, [key, state.content, onSave]);

  // Clear autosave
  const clearAutosave = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState((prev) => ({
        ...prev,
        lastSaved: null,
        hasUnsavedChanges: false,
      }));
      return true;
    } catch (error) {
      console.error('Failed to clear autosave:', error);
      return false;
    }
  }, [key]);

  return {
    content: state.content,
    lastSaved: state.lastSaved,
    hasUnsavedChanges: state.hasUnsavedChanges,
    isRestoring: state.isRestoring,
    updateContent,
    checkForAutosave,
    restoreFromAutosave,
    saveNow,
    clearAutosave,
  };
};
