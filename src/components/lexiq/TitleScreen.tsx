import React from 'react';
import { useTimeBasedTheme, type TimeTheme } from '@/hooks/useTimeBasedTheme';
import { FloatingBackground } from './FloatingBackground';
import { DayTheme } from './themes/DayTheme';
import { NightTheme } from './themes/NightTheme';
import { SunriseTheme } from './themes/SunriseTheme';
import { SunsetTheme } from './themes/SunsetTheme';

/**
 * TitleScreen component - Dynamic background with time-based themes
 * 
 * Features:
 * - Floating multilingual terminology strings (preserved from original)
 * - Time-controlled day/night themes synchronized with regional time
 * - Standard light/dark mode toggle with auto mode as default
 * - Remembers last mode from previous session
 * - Smooth transitions between themes (sunrise/sunset)
 * - Day theme: moving clouds, sun rays, blue sky
 * - Night theme: random starry sky, shooting stars, planets, aurora
 */
export interface TitleScreenAssets {
  daySunImageSrc?: string;
  nightPlanetImageSrcs?: string[];
  nightMoonImageSrc?: string;
  controller?: {
    currentTheme: TimeTheme;
    isTransitioning: boolean;
    currentDate: Date;
    themeVersion?: number;
  };
}

export const TitleScreen: React.FC<TitleScreenAssets> = ({
  daySunImageSrc,
  nightPlanetImageSrcs,
  nightMoonImageSrc,
  controller,
}) => {
  const internal = useTimeBasedTheme();
  const currentTheme = controller ? controller.currentTheme : internal.currentTheme;
  const isTransitioning = controller ? controller.isTransitioning : internal.isTransitioning;
  const currentDate = controller ? controller.currentDate : internal.currentDate;
  const themeVersion = controller && controller.themeVersion !== undefined ? controller.themeVersion : (internal as any).themeVersion;

  // Render the appropriate theme background
  const renderThemeBackground = () => {
    switch (currentTheme) {
      case 'day':
        return <DayTheme key={`day-${themeVersion}`} sunImageSrc={daySunImageSrc} currentDate={currentDate} />;
      case 'night':
        return (
          <NightTheme
            key={`night-${themeVersion}`}
            planetImageSrcs={nightPlanetImageSrcs}
            moonImageSrc={nightMoonImageSrc}
            currentDate={currentDate}
          />
        );
      case 'sunrise':
        return <SunriseTheme key={`sunrise-${themeVersion}`} />;
      case 'sunset':
        return <SunsetTheme key={`sunset-${themeVersion}`} />;
      default:
        return <DayTheme key={`day-${themeVersion}`} sunImageSrc={daySunImageSrc} currentDate={currentDate} />;
    }
  };

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Theme background layer */}
      <div
        className={`absolute inset-0 transition-opacity ${
          isTransitioning ? 'duration-150' : 'duration-150'
        }`}
        key={`bg-${currentTheme}-${themeVersion}`}
      >
        {renderThemeBackground()}
      </div>
      {/* Seamless fade overlay during transitions */}
      {isTransitioning && (
        <div className="absolute inset-0 pointer-events-none animate-blur-overlay" />
      )}
      {/* Floating terminology strings layer */}
      <div className="absolute inset-0">
        <FloatingBackground />
      </div>
    </div>
  );
};
