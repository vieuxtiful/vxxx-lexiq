import { useEffect, useState } from 'react';

const DARK_MODE_KEY = 'lexiq-project-screen-dark-mode';
const FIRST_VISIT_KEY = 'lexiq-first-visit';

export const useProjectScreenDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    // Check if this is the user's first visit
    const hasVisitedBefore = localStorage.getItem(FIRST_VISIT_KEY);
    const savedDarkMode = localStorage.getItem(DARK_MODE_KEY);
    
    if (!hasVisitedBefore) {
      // First time user - light mode, no animation
      setIsFirstVisit(true);
      setIsDarkMode(false);
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
    } else {
      // Returning user
      setIsFirstVisit(false);
      const darkModeEnabled = savedDarkMode === 'true';
      setIsDarkMode(darkModeEnabled);
      
      // Trigger animation if dark mode is enabled
      if (darkModeEnabled) {
        setShouldAnimate(true);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem(DARK_MODE_KEY, String(newDarkMode));
    setShouldAnimate(false); // Don't animate manual toggles
  };

  return {
    isDarkMode,
    isFirstVisit,
    shouldAnimate,
    toggleDarkMode,
  };
};
