import React, { useMemo, useEffect, useState } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  twinkleDelay: number;
  twinkleDuration: number;
}

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

/**
 * NightTheme component - Starry sky with shooting stars, planets, and atmospheric effects
 * Stars are randomly generated on each render for variety
 */
export interface NightThemeProps {
  planetImageSrcs?: string[]; // Optional PNGs for planets in order
  moonImageSrc?: string;      // Optional PNG for a moon asset
  currentDate?: Date;         // Optional current date for dynamic positioning
}

export const NightTheme: React.FC<NightThemeProps> = ({ planetImageSrcs, moonImageSrc, currentDate }) => {
  // Generate random stars (new positions each time)
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 200 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      twinkleDelay: Math.random() * 4, // staggered baseline delays
      twinkleDuration: 3 + Math.random() * 3, // slower baseline: 3-6s
    }));
  }, []); // Empty dependency array means new stars on each component mount

  // Active twinkles: map of starId -> duration (seconds)
  const [activeTwinkles, setActiveTwinkles] = useState<Record<number, number>>({});

  // Helper to trigger a wave of twinkles
  const triggerTwinkles = () => {
    // Randomly choose how many stars to twinkle this wave (1..stars.length)
    const count = Math.max(1, Math.floor(Math.random() * stars.length));
    const chosen = new Set<number>();
    while (chosen.size < count) {
      const idx = Math.floor(Math.random() * stars.length);
      chosen.add(stars[idx].id);
    }
    // Apply random duration between 1 and 4 seconds (slower, more subtle)
    const updates: Record<number, number> = {};
    chosen.forEach((id) => {
      const duration = 1 + Math.random() * 3; // 1-4s
      updates[id] = duration;
      // Clear after duration
      setTimeout(() => {
        setActiveTwinkles(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, duration * 1000);
    });
    setActiveTwinkles(prev => ({ ...prev, ...updates }));
  };

  // Schedule 5 triggers every 10 seconds, staggered by 2s (0,2,4,6,8)
  useEffect(() => {
    // Fire an initial staggered sequence immediately
    const offsets = [0, 2000, 4000, 6000, 8000];
    const timeouts: number[] = offsets.map((ms) => window.setTimeout(triggerTwinkles, ms));

    // Then repeat every 10 seconds
    const interval = window.setInterval(() => {
      offsets.forEach((ms) => {
        timeouts.push(window.setTimeout(triggerTwinkles, ms));
      });
    }, 10000);

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars.length]);

  // Generate shooting stars
  const shootingStars = useMemo<ShootingStar[]>(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      startX: 20 + Math.random() * 60,
      startY: 10 + Math.random() * 40,
      delay: i * 8 + Math.random() * 5,
      duration: 1.5 + Math.random() * 1,
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
      
      {/* Stars */}
      {stars.map((star) => {
        const activeDuration = activeTwinkles[star.id];
        const isActive = typeof activeDuration === 'number';
        const baseGlow = star.size * 1.5;
        const activeGlow = baseGlow * 1.6; // faint increase when twinkling
        const duration = isActive ? activeDuration : star.twinkleDuration;
        const delay = isActive ? 0 : star.twinkleDelay;
        // animation shorthand: name duration timing-function delay
        const animation = `twinkle ${duration}s ease-in-out ${delay}s`;
        return (
          <div
            key={star.id}
            className="absolute bg-white rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animation,
              boxShadow: `0 0 ${isActive ? activeGlow : baseGlow}px rgba(255, 255, 255, ${isActive ? 0.55 : 0.35})`,
              filter: isActive ? 'brightness(1.05)' : 'brightness(0.9)',
            }}
          />
        );
      })}
      
      {/* Shooting stars */}
      {shootingStars.map((star) => (
        <div
          key={star.id}
          className="absolute w-1 h-1 bg-white rounded-full shooting-star"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
      
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
        {Array.from({ length: 300 }).map((_, i) => (
          <div
            key={`distant-${i}`}
            className="absolute bg-white/60 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: '0.5px',
              height: '0.5px',
            }}
          />
        ))}
      </div>
    </div>
  );
};
