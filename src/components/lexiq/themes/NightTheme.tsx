import React, { useMemo, useEffect, useState } from 'react';

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  delay: number;
  duration: number;
}

interface Planet {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  glowColor: string;
}

interface DistantStar {
  id: number;
  x: number;
  y: number;
  flickerDuration: number;
  flickerDelay: number;
}

/**
 * NightTheme component - Starry sky with rare shooting stars, planets, and atmospheric effects
 * Stars have stable positions with subtle flicker animations
 */
export interface NightThemeProps {
  planetImageSrcs?: string[]; // Optional PNGs for planets in order
  moonImageSrc?: string;      // Optional PNG for a moon asset
  currentDate?: Date;         // Optional current date for dynamic positioning
}

export const NightTheme: React.FC<NightThemeProps> = ({ planetImageSrcs, moonImageSrc, currentDate }) => {
  // Rare shooting star state (18% chance every 5 seconds)
  const [showShootingStar, setShowShootingStar] = useState(false);
  const [currentShootingStar, setCurrentShootingStar] = useState<ShootingStar | null>(null);

  // Shooting star appearance logic (18% chance every 5 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.18) { // 18% chance
        const newStar: ShootingStar = {
          id: Date.now(),
          startX: 20 + Math.random() * 60,
          startY: 10 + Math.random() * 40,
          delay: 0,
          duration: 1.5 + Math.random() * 1,
        };
        setCurrentShootingStar(newStar);
        setShowShootingStar(true);
        
        // Hide after animation completes
        setTimeout(() => {
          setShowShootingStar(false);
          setCurrentShootingStar(null);
        }, (newStar.duration + 0.5) * 1000);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);


  // Generate distant stars with stable positions and flicker properties
  const distantStars = useMemo<DistantStar[]>(() => {
    return Array.from({ length: 300 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      flickerDuration: 0.5 + Math.random() * 1.5, // 0.5-2 seconds
      flickerDelay: Math.random() * 5, // Staggered start times
    }));
  }, []);

  // Generate planets
  const planets = useMemo<Planet[]>(() => {
    const planetColors = [
      { color: 'bg-orange-400', glowColor: 'rgba(251, 146, 60, 0.4)' },
      { color: 'bg-blue-400', glowColor: 'rgba(96, 165, 250, 0.4)' },
      { color: 'bg-purple-400', glowColor: 'rgba(192, 132, 252, 0.4)' },
    ];
    
    return Array.from({ length: 3 }, (_, i) => ({
      id: i,
      x: 15 + i * 30 + Math.random() * 10,
      y: 20 + Math.random() * 30,
      size: 40 + Math.random() * 30,
      color: planetColors[i].color,
      glowColor: planetColors[i].glowColor,
    }));
  }, []);

  // Dynamic offsets based on currentDate (UX-first subtlety):
  const hour = currentDate ? currentDate.getHours() : 22;
  const month = currentDate ? currentDate.getMonth() : 6;
  const year = currentDate ? currentDate.getFullYear() : 2025;
  const dayProgress = hour / 24; // 0..1
  const seasonal = (Math.sin(((month + 1) / 12) * Math.PI * 2) + 1) / 2; // 0..1
  const yearMod = (year % 11) / 11; // 0..1
  const driftX = (dayProgress - 0.5) * 6; // -3%..+3%
  const driftY = (seasonal - 0.5) * 4; // -2%..+2%
  const sizeBias = 1 + (yearMod - 0.5) * 0.1; // ~±5%

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Deep space gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-900" />
      
      {/* Nebula effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse-slower" />
      </div>
      
      {/* Rare shooting star */}
      {showShootingStar && currentShootingStar && (
        <div
          key={currentShootingStar.id}
          className="absolute w-1 h-1 bg-white rounded-full shooting-star"
          style={{
            left: `${currentShootingStar.startX}%`,
            top: `${currentShootingStar.startY}%`,
            animationDuration: `${currentShootingStar.duration}s`,
          }}
        />
      )}
      
      {/* Planets (PNG render if provided, otherwise vector fallback) */}
      {planets.map((planet, idx) => {
        const imgSrc = planetImageSrcs && planetImageSrcs[idx] ? planetImageSrcs[idx] : undefined;
        const left = planet.x + driftX;
        const top = planet.y + driftY;
        const sizePx = planet.size * sizeBias;
        return imgSrc ? (
          <img
            key={`planet-img-${planet.id}`}
            src={imgSrc}
            alt={`Planet ${planet.id}`}
            className="absolute object-contain rounded-full select-none pointer-events-none animate-float-slow"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              filter: `drop-shadow(0 0 ${Math.round(planet.size)}px ${planet.glowColor})`,
              animationDelay: `${planet.id * 2}s`,
            }}
          />
        ) : (
          <div
            key={`planet-fallback-${planet.id}`}
            className={`absolute ${planet.color} rounded-full animate-float-slow`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${sizePx}px`,
              height: `${sizePx}px`,
              boxShadow: `0 0 ${planet.size}px ${planet.glowColor}`,
              animationDelay: `${planet.id * 2}s`,
            }}
          />
        );
      })}

      {/* Optional Moon asset */}
      {moonImageSrc && (
        <img
          src={moonImageSrc}
          alt="Moon"
          className="absolute object-contain select-none pointer-events-none animate-float-slow"
          style={{
            left: `${75 + driftX}%`,
            top: `${12 + driftY}%`,
            width: `${120 * sizeBias}px`,
            height: `${120 * sizeBias}px`,
            filter: 'drop-shadow(0 0 80px rgba(255,255,255,0.35))',
            animationDelay: '1s',
          }}
        />
      )}
      
      {/* Aurora borealis effect */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-green-400/30 to-transparent animate-aurora" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-blue-400/30 to-transparent animate-aurora-reverse" />
      </div>
      
      {/* Distant stars (milky way effect) */}
      <div className="absolute inset-0 opacity-40">
        {distantStars.map((star) => (
          <div
            key={`distant-${star.id}`}
            className="absolute bg-white/60 rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: '2.5px',
              height: '2.5px',
              animation: `starFlicker ${star.flickerDuration}s ease-in-out infinite`,
              animationDelay: `${star.flickerDelay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
