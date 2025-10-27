import React, { useEffect } from 'react';
import { MantineProvider as BaseMantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

const THEME_KEY = 'lexiq-dark-mode';

export function MantineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const applyTheme = () => {
      const isDark = localStorage.getItem(THEME_KEY) === 'true';
      document.documentElement.classList.toggle('dark', isDark);
    };
    // Apply on mount
    applyTheme();
    // Sync across tabs/components via storage events
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) applyTheme();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <BaseMantineProvider
      theme={{
        primaryColor: 'cyan',
        colors: {
          cyan: [
            '#e0f7ff',
            '#b3e5fc',
            '#81d4fa',
            '#4fc3f7',
            '#29b6f6',
            '#03a9f4',
            '#039be5',
            '#0288d1',
            '#0277bd',
            '#01579b',
          ],
        },
      }}
    >
      {children}
    </BaseMantineProvider>
  );
}
