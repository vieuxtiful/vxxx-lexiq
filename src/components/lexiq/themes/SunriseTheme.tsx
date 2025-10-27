import React from 'react';

/**
 * SunriseTheme component - Transition from night to day
 * Features warm orange/pink gradient with emerging sun
 */
export const SunriseTheme: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sunrise gradient - dark blue to orange to pink */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-orange-400 to-pink-300" />
      
      {/* Emerging sun at horizon */}
      <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-gradient-to-t from-orange-500 to-yellow-300 shadow-[0_0_100px_50px_rgba(251,146,60,0.6)] animate-pulse-slow" />
      
      {/* Sun rays spreading */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-[10%] left-1/2 w-2 h-60 bg-gradient-to-t from-orange-300/40 to-transparent origin-bottom"
            style={{
              transform: `rotate(${i * 22.5}deg) translateX(-50%)`,
              animation: `fade-in-rays 3s ease-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      
      {/* Clouds with warm tint */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="absolute cloud-shape opacity-60"
          style={{
            left: `${10 + i * 20}%`,
            top: `${30 + Math.random() * 20}%`,
            animation: `float-cloud ${50 + i * 10}s linear infinite`,
            animationDelay: `${-i * 8}s`,
          }}
        >
          <div className="relative w-20 h-10">
            <div className="absolute left-0 top-3 w-10 h-10 bg-orange-200/70 rounded-full" />
            <div className="absolute left-6 top-1 w-14 h-14 bg-pink-200/70 rounded-full" />
            <div className="absolute left-12 top-3 w-10 h-10 bg-orange-200/70 rounded-full" />
          </div>
        </div>
      ))}
      
      {/* Morning mist */}
      <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-white/30 to-transparent animate-pulse-slower" />
      
      {/* Fading stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute bg-white rounded-full animate-fade-out"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
            width: '2px',
            height: '2px',
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      
      {/* Warm light particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-300/60 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-10px',
              animation: `float-up ${12 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 8}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
