import React, { useState, useEffect, useMemo } from 'react';

interface Flare {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  driftX: number;
  driftY: number;
}

interface HotMatchBackgroundProps {
  isActive: boolean;
  transitionDuration?: number;
}

export const HotMatchBackground: React.FC<HotMatchBackgroundProps> = ({ 
  isActive, 
  transitionDuration = 3000 
}) => {
  const isMobile = useMemo(() => 
    /iPhone|iPad|Android/i.test(navigator.userAgent), 
    []
  );
  
  const prefersReducedMotion = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
  
  const flareCount = isMobile ? 4 : 10;
  const [flares, setFlares] = useState<Flare[]>([]);

  const generateFlare = (id: number): Flare => ({
    id,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 40 + Math.random() * 80,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    driftX: (Math.random() - 0.5) * 30,
    driftY: (Math.random() - 0.5) * 30,
  });

  useEffect(() => {
    if (!isActive || prefersReducedMotion) {
      setFlares([]);
      return;
    }

    const initialFlares = Array.from({ length: flareCount }, (_, i) => generateFlare(i));
    setFlares(initialFlares);

    const interval = setInterval(() => {
      setFlares(prev => 
        prev.map(flare => 
          Math.random() > 0.7 ? generateFlare(flare.id) : flare
        )
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isActive, flareCount, prefersReducedMotion]);

  if (!isActive) return null;

  return (
    <div 
      className="hot-match-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, rgba(255, 105, 180, 0.03) 0%, rgba(255, 20, 147, 0.05) 50%, rgba(255, 105, 180, 0.03) 100%)',
        opacity: isActive ? 1 : 0,
        transition: `opacity ${transitionDuration}ms ease-in-out`,
      }}
      aria-hidden="true"
    >
      {!prefersReducedMotion && flares.map(flare => (
        <div
          key={flare.id}
          style={{
            position: 'absolute',
            left: `${flare.x}%`,
            top: `${flare.y}%`,
            width: `${flare.size}px`,
            height: `${flare.size}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 105, 180, 0.4) 0%, rgba(255, 20, 147, 0.2) 40%, transparent 70%)',
            filter: isMobile ? 'none' : 'blur(20px)',
            animation: `flare-pulse ${flare.duration}s ease-in-out infinite ${flare.delay}s, flare-drift 8s ease-in-out infinite alternate ${flare.delay}s`,
            pointerEvents: 'none',
            willChange: 'opacity, transform',
          }}
        />
      ))}
      
      <style>{`
        @keyframes flare-pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes flare-drift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${flares[0]?.driftX || 0}px, ${flares[0]?.driftY || 0}px); }
        }
      `}</style>
    </div>
  );
};