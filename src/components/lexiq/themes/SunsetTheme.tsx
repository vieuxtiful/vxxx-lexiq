import React from 'react';

/**
 * SunsetTheme component - Transition from day to night
 * Features warm orange/purple gradient with setting sun
 */
export interface SunsetThemeProps {
  sunImageSrc?: string; // Optional sun PNG image
}

export const SunsetTheme: React.FC<SunsetThemeProps> = ({ sunImageSrc }) => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sunset gradient - blue to orange to purple */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-400 via-orange-500 to-purple-900" />
      
      {/* Setting sun at horizon with PNG and sunset overlay */}
      {sunImageSrc ? (
        <div className="absolute bottom-[15%] right-[15%] w-36 h-36">
          {/* Sun PNG */}
          <img
            src={sunImageSrc}
            alt="Setting Sun"
            className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none animate-pulse-slow"
            style={{
              filter: 'drop-shadow(0 0 80px rgba(249, 115, 22, 0.7))'
            }}
          />
          {/* Sunset gradient overlay */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255, 120, 0, 0.6) 0%, rgba(220, 38, 38, 0.5) 50%, rgba(147, 51, 234, 0.3) 100%)',
              mixBlendMode: 'overlay'
            }}
          />
        </div>
      ) : (
        // Fallback gradient sun if no PNG provided
        <div className="absolute bottom-[15%] right-[15%] w-36 h-36 rounded-full bg-gradient-to-b from-orange-400 to-red-500 shadow-[0_0_100px_50px_rgba(249,115,22,0.6)] animate-pulse-slow" />
      )}
      
      {/* Clouds with warm sunset tint */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="absolute cloud-shape opacity-70"
          style={{
            left: `${5 + i * 18}%`,
            top: `${25 + Math.random() * 25}%`,
            animation: `float-cloud ${45 + i * 8}s linear infinite`,
            animationDelay: `${-i * 6}s`,
          }}
        >
          <div className="relative w-24 h-12">
            <div className="absolute left-0 top-4 w-12 h-12 bg-orange-300/80 rounded-full" />
            <div className="absolute left-8 top-2 w-16 h-16 bg-red-300/80 rounded-full" />
            <div className="absolute left-16 top-4 w-12 h-12 bg-purple-300/80 rounded-full" />
          </div>
        </div>
      ))}
      
      {/* Evening haze */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-purple-900/50 to-transparent" />
      
      {/* Emerging stars */}
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full animate-fade-in"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 50}%`,
            width: `${1 + Math.random()}px`,
            height: `${1 + Math.random()}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
      
      {/* Fireflies/light particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 bg-yellow-300 rounded-full animate-firefly"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${50 + Math.random() * 40}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      
      {/* Silhouette of distant mountains */}
      <div className="absolute bottom-0 left-0 right-0 h-1/4">
        <svg viewBox="0 0 1200 300" className="w-full h-full" preserveAspectRatio="none">
          <path
            d="M0,300 L0,150 Q200,100 400,120 T800,140 Q1000,120 1200,160 L1200,300 Z"
            fill="rgba(30, 27, 75, 0.8)"
          />
          <path
            d="M0,300 L0,180 Q300,140 600,160 T1200,200 L1200,300 Z"
            fill="rgba(20, 18, 50, 0.9)"
          />
        </svg>
      </div>
    </div>
  );
};
