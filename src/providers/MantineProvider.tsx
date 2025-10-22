import { MantineProvider as BaseMantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';

export function MantineProvider({ children }: { children: React.ReactNode }) {
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
