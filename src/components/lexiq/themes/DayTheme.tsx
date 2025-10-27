import React, { useMemo } from 'react';

interface Lobe {
  cx: number; // center x in px
  cy: number; // center y in px
  rx: number; // radius x in px
  ry: number; // radius y in px
}

interface Cloud {
  id: number;
  x: number;
  y: number;
  scale: number;
  speed: number;
  opacity: number;
  width: number;
  height: number;
  layers: number;
  lobes: Lobe[];
}

/**
 * DayTheme component - Blue sky with moving clouds and sun rays
 */
export interface DayThemeProps {
  sunImageSrc?: string; // Optional high-quality PNG render for the sun
  currentDate?: Date;   // Optional current date for dynamic positioning
}

export const DayTheme: React.FC<DayThemeProps> = ({ sunImageSrc, currentDate }) => {
  // Generate random clouds; responsive count by viewport width
  const clouds = useMemo<Cloud[]>(() => {
    let count = 8;
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 640) count = 6;
      else if (w < 1024) count = 8;
      else if (w < 1440) count = 10;
      else if (w < 1920) count = 12;
      else if (w < 2560) count = 14;
      else count = 16; // ultrawide
    }
    return Array.from({ length: count }, (_, i) => {
      const width = 160 + Math.random() * 140;
      const height = 70 + Math.random() * 50;
      const lobeCount = 15; // fixed, soft but detailed silhouette
      const lobes: Lobe[] = Array.from({ length: lobeCount }).map(() => {
        const rx = (width * (0.18 + Math.random() * 0.22));
        const ry = (height * (0.25 + Math.random() * 0.35));
        const cx = Math.random() * (width - rx) + rx * 0.5;
        const cy = Math.random() * (height - ry) + ry * 0.5;
        return { cx, cy, rx, ry };
      });
      return {
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 60 + 10,
        scale: 0.6 + Math.random() * 0.8,
        speed: 40 + Math.random() * 40,
        opacity: 0.35 + Math.random() * 0.35,
        width,
        height,
        layers: 4 + Math.floor(Math.random() * 3),
        lobes,
      };
    });
  }, []);

  // Dynamic sun placement (subtle, UX-first):
  // - Horizontal drift across the day
  // - Vertical seasonal shift by month
  const hour = currentDate ? currentDate.getHours() : 12;
  const month = currentDate ? currentDate.getMonth() : 6; // 0-11
  const dayProgress = hour / 24; // 0-1
  const seasonal = (Math.sin(((month + 1) / 12) * Math.PI * 2) + 1) / 2; // 0-1
  const sunRight = 10 + (1 - dayProgress) * 60; // from ~70% to ~10%
  const sunTop = 10 + (1 - seasonal) * 10; // 10% to 20%
  const sunSize = 36 + seasonal * 12; // 36px-48px base for fallback, scaled for PNG
  const sunLeft = 100 - sunRight; // convert right% to left%
  // High-DPI / large screen acuity boost
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const contrastBoost = (dpr >= 1.5 || vw >= 1600) ? 1.08 : 1.04;
  const saturateBoost = (dpr >= 1.5 || vw >= 1600) ? 1.05 : 1.03;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Blue sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-100" />
      <div className="absolute inset-0 pointer-events-none" style={{ backdropFilter: `contrast(${contrastBoost}) saturate(${saturateBoost}) brightness(1.01)`, WebkitBackdropFilter: `contrast(${contrastBoost}) saturate(${saturateBoost}) brightness(1.01)` }} />
      {/* Subtle film grain/noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.6) 1px, transparent 1px),'+
            'radial-gradient(circle at 80% 30%, rgba(0,0,0,0.5) 1px, transparent 1px),'+
            'radial-gradient(circle at 40% 70%, rgba(0,0,0,0.4) 1px, transparent 1px)',
          backgroundSize: '120px 120px, 140px 140px, 160px 160px',
          backgroundRepeat: 'repeat',
        }}
      />
      
      {/* Sun (PNG render only) */}
      {sunImageSrc && (
        <img
          src={sunImageSrc}
          alt="Sun"
          className="absolute object-contain select-none pointer-events-none animate-pulse-slow"
          style={{ 
            top: `${sunTop}%`, 
            right: `${sunRight}%`, 
            width: `${sunSize}px`, 
            height: `${sunSize}px`,
            filter: 'drop-shadow(0 0 50px rgba(253,224,71,0.55))' 
          }}
        />
      )}
      
      {/* Sun rays removed by design: Sun PNG is the only solar element */}
      
      {/* Clouds */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute"
          style={{
            left: `${cloud.x}%`,
            top: `${cloud.y}%`,
            transform: `scale(${cloud.scale})`,
            opacity: cloud.opacity,
            // animation shorthand: name duration timing-function delay iteration-count
            animation: `float-cloud ${cloud.speed}s linear ${-cloud.id * 5}s infinite`,
            filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.08))',
          }}
        >
          <div
            className="relative overflow-hidden"
            style={{ 
              width: `${cloud.width}px`, 
              height: `${cloud.height}px`,
              filter: `contrast(${contrastBoost}) saturate(${saturateBoost})`,
              borderRadius: `${cloud.height}px`,
              // Per-cloud silhouette mask composed of multiple radial blobs (lobes)
              WebkitMaskImage: `${cloud.lobes.map(l => `radial-gradient(closest-side at ${l.cx}px ${l.cy}px, #000 98%, transparent 100%)`).join(',')}`,
              maskImage: `${cloud.lobes.map(l => `radial-gradient(closest-side at ${l.cx}px ${l.cy}px, #000 98%, transparent 100%)`).join(',')}`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
            } as React.CSSProperties}
          >
            {(() => {
              const dx = cloud.x - sunLeft;
              const dy = cloud.y - sunTop;
              const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
              return (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.0) 45%, rgba(0,0,0,0.10) 100%)',
                    transform: `rotate(${angleDeg}deg)`,
                    transformOrigin: '50% 50%'
                  }}
                />
              );
            })()}
            {Array.from({ length: cloud.layers }).map((_, li) => {
              const puffW = cloud.width * (0.55 + Math.random() * 0.65);
              const puffH = cloud.height * (0.55 + Math.random() * 0.85);
              const left = Math.random() * (cloud.width - puffW);
              const top = Math.random() * (cloud.height - puffH);
              const haloBlur = 3; // regularized for soft, consistent edges
              const coreOpacity = 0.78; // consistent core strength
              return (
                <div key={`puff-${cloud.id}-${li}`} className="absolute" style={{ left, top, width: puffW, height: puffH }}>
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: 0,
                      background: 'radial-gradient(ellipse at 45% 40%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.0) 72%)',
                      opacity: coreOpacity,
                    }}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      inset: 0,
                      background: 'radial-gradient(ellipse at 50% 45%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.0) 80%)',
                      filter: `blur(${haloBlur}px)`,
                      opacity: 0.85,
                    }}
                  />
                  {/* Crisp rim to mitigate hard cutoffs while increasing acuity */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: 0,
                      background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.0) 60%, rgba(255,255,255,0.30) 72%, rgba(255,255,255,0.0) 86%)',
                      filter: 'blur(0.6px)',
                      opacity: 0.6,
                    }}
                  />
                </div>
              );
            })}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.0), rgba(255,255,255,0.15))',
                borderRadius: `${cloud.height}px`,
              }}
            />
            {/* Subtle base shadow beneath cloud for depth */}
            <div
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                bottom: `${-cloud.height * 0.15}px`,
                width: `${cloud.width * 0.7}px`,
                height: '12px',
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.0) 70%)',
                filter: 'blur(4px)',
                opacity: 0.6,
              }}
            />
          </div>
        </div>
      ))}
      
      {/* Light particles floating up */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: '-10px',
              // animation shorthand: name duration timing-function delay iteration-count
              animation: `float-up ${15 + Math.random() * 15}s linear ${Math.random() * 10}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
