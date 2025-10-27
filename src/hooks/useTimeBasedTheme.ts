import { useState, useEffect } from 'react';

const THEME_MODE_KEY = 'lexiq-theme-mode'; // 'auto' | 'light' | 'dark'
const LAST_THEME_KEY = 'lexiq-last-theme'; // 'day' | 'night' | 'sunrise' | 'sunset'
const FIRST_VISIT_KEY = 'lexiq-first-visit';
const OVERRIDE_THEME_KEY = 'lexiq-override-theme'; // 'day' | 'night' | null

export type TimeTheme = 'day' | 'night' | 'sunrise' | 'sunset';
export type ThemeMode = 'auto' | 'light' | 'dark';

interface TimeBasedThemeState {
  currentTheme: TimeTheme;
  isDarkMode: boolean;
  themeMode: ThemeMode;
  isFirstVisit: boolean;
  isTransitioning: boolean;
  currentDate: Date;
  overrideTheme: null | Extract<TimeTheme, 'day' | 'night'>;
  themeVersion: number;
}

/**
 * Hook to manage time-based theme system with day/night cycles
 * - Automatically detects time of day and applies appropriate theme
 * - Supports manual light/dark mode toggle
 * - Remembers user preferences across sessions
 * - Handles sunrise/sunset transitions
 */
export const useTimeBasedTheme = () => {
  const [state, setState] = useState<TimeBasedThemeState>({
    currentTheme: 'day',
    isDarkMode: false,
    themeMode: 'auto',
    isFirstVisit: true,
    isTransitioning: false,
    currentDate: new Date(),
    overrideTheme: null,
    themeVersion: 0,
  });

  /**
   * External canonical time provider (optional)
   * Set via setTimeProvider(fn) from elsewhere. If not set or fails, fallback to system time.
   */
  
  async function withTimeout<T>(p: Promise<T>, ms = 2000): Promise<T> {
    return await Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error('time provider timeout')), ms))
    ]) as T;
  }

  async function getNow(): Promise<Date> {
    if (timeProvider) {
      try {
        const d = await withTimeout(timeProvider());
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch {}
    }
    return new Date();
  }

  /**
   * Get current time-based theme based on hour of day
   * Sunrise: 5-7 AM
   * Day: 7 AM - 6 PM
   * Sunset: 6-8 PM
   * Night: 8 PM - 5 AM
   */
  const resolveThemeFor = (date: Date): TimeTheme => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 7) return 'sunrise';
    if (hour >= 7 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'sunset';
    return 'night';
  };

  /**
   * Manually set background theme to 'day' or 'night' without changing light/dark mode.
   * Does not alter themeMode; purely visual background override until next auto tick.
   */
  const setManualTheme = (theme: Extract<TimeTheme, 'day' | 'night'>) => {
    setState(prev => ({
      ...prev,
      currentTheme: theme,
      isTransitioning: true,
      // Persist manual override while staying in auto mode
      themeMode: 'auto',
      overrideTheme: theme,
      themeVersion: prev.themeVersion + 1,
    }));

    localStorage.setItem(LAST_THEME_KEY, theme);
    localStorage.setItem(OVERRIDE_THEME_KEY, theme);

    setTimeout(() => {
      setState(prev => ({ ...prev, isTransitioning: false }));
    }, 3000);
  };

  /**
   * Determine if dark mode should be active based on theme
   */
  const isDarkTheme = (theme: TimeTheme): boolean => {
    return theme === 'night' || theme === 'sunset';
  };

  /**
   * Initialize theme on mount
   */
  useEffect(() => {
    (async () => {
      const hasVisitedBefore = localStorage.getItem(FIRST_VISIT_KEY);
      const savedMode = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null;
      const lastTheme = localStorage.getItem(LAST_THEME_KEY) as TimeTheme | null;
      const isFirstVisit = !hasVisitedBefore;
      const themeMode = savedMode || 'auto';
      const savedOverride = (localStorage.getItem(OVERRIDE_THEME_KEY) as 'day' | 'night' | null) || null;

      let currentTheme: TimeTheme;
      let isDarkMode: boolean;
      
      if (themeMode === 'auto') {
        const now = await getNow();
        currentTheme = savedOverride ?? resolveThemeFor(now);
        isDarkMode = isDarkTheme(currentTheme);
      } else {
        currentTheme = lastTheme || resolveThemeFor(new Date());
        isDarkMode = themeMode === 'dark';
      }

      setState({
        currentTheme,
        isDarkMode,
        themeMode,
        isFirstVisit,
        isTransitioning: false,
        currentDate: await getNow(),
        overrideTheme: savedOverride,
        themeVersion: 0,
      });

      if (isFirstVisit) {
        localStorage.setItem(FIRST_VISIT_KEY, 'true');
      }
    })();
  }, []);

  /**
   * Update theme periodically when in auto mode
   */
  useEffect(() => {
    if (state.themeMode !== 'auto') return;

    const tick = async () => {
      const now = await getNow();
      // If a manual override is active, respect it and only update clock
      if (state.overrideTheme) {
        setState(prev => ({ ...prev, currentDate: now }));
        return;
      }
      const newTheme = resolveThemeFor(now);
      if (newTheme !== state.currentTheme) {
        setState(prev => ({
          ...prev,
          currentTheme: newTheme,
          isDarkMode: isDarkTheme(newTheme),
          isTransitioning: true,
          currentDate: now,
          themeVersion: prev.themeVersion + 1,
        }));

        localStorage.setItem(LAST_THEME_KEY, newTheme);

        setTimeout(() => {
          setState(prev => ({ ...prev, isTransitioning: false }));
        }, 3000);
      } else {
        // Update clock even if theme doesn't change
        setState(prev => ({ ...prev, currentDate: now }));
      }
    };

    const interval = setInterval(() => { void tick(); }, 60000);
    return () => clearInterval(interval);
  }, [state.themeMode, state.currentTheme]);

  /**
   * Toggle between light and dark mode (manual override)
   */
  const toggleDarkMode = () => {
    setState(prev => {
      const newIsDarkMode = !prev.isDarkMode;
      const newMode: ThemeMode = newIsDarkMode ? 'dark' : 'light';
      
      localStorage.setItem(THEME_MODE_KEY, newMode);
      
      return {
        ...prev,
        isDarkMode: newIsDarkMode,
        themeMode: newMode,
        isTransitioning: false,
      };
    });
  };

  /**
   * Switch to auto mode (time-based)
   */
  const enableAutoMode = async () => {
    const now = await getNow();
    const currentTheme = resolveThemeFor(now);
    const isDarkMode = isDarkTheme(currentTheme);

    setState(prev => ({
      ...prev,
      currentTheme,
      isDarkMode,
      themeMode: 'auto',
      isTransitioning: true,
      overrideTheme: null,
      themeVersion: prev.themeVersion + 1,
    }));

    localStorage.setItem(THEME_MODE_KEY, 'auto');
    localStorage.setItem(LAST_THEME_KEY, currentTheme);
    localStorage.removeItem(OVERRIDE_THEME_KEY);

    setTimeout(() => {
      setState(prev => ({ ...prev, isTransitioning: false }));
    }, 3000);
  };

  return {
    currentTheme: state.currentTheme,
    isDarkMode: state.isDarkMode,
    themeMode: state.themeMode,
    isFirstVisit: state.isFirstVisit,
    isTransitioning: state.isTransitioning,
    currentDate: state.currentDate,
    themeVersion: state.themeVersion,
    // Expose if needed in future UI
    // overrideTheme: state.overrideTheme,
    toggleDarkMode,
    enableAutoMode,
    setManualTheme,
  };
};

// Optional canonical time provider
// Set this to an async function that returns a Date based on an external source (e.g., LLM)
let timeProvider: null | (() => Promise<Date>) = null;
export function setTimeProvider(provider: () => Promise<Date>) {
  timeProvider = provider;
}
