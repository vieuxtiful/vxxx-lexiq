import React, { useEffect, useMemo, useState } from 'react';

import Cloud1 from './Cloud1.png';
import Cloud2 from './Cloud2.png';
import Cloud3 from './Cloud3.png';
import Cloud4 from './Cloud4.png';
import Cloud5 from './Cloud5.png';
import Cloud6 from './Cloud6.png';
import Cloud7 from './Cloud7.png';
import Cloud8 from './Cloud8.png';
import Cloud9 from './Cloud9.png';
import Cloud10 from './Cloud10.png';
import Cloud11 from './Cloud11.png';
import Cloud12 from './Cloud12.png';
import Cloud13 from './Cloud13.png';
import Cloud14 from './Cloud14.png';

const CLOUDS = [
  Cloud1, Cloud2, Cloud3, Cloud4, Cloud5, Cloud6, Cloud7,
  Cloud8, Cloud9, Cloud10, Cloud11, Cloud12, Cloud13, Cloud14
];

type CloudSpec = {
  id: number;
  src: string;
  topPercent: number; // 0..100
  scale: number;      // 0.6..1.2
  opacity: number;    // 0.4..0.9
  duration: number;   // 25..60 (seconds)
  delay: number;      // 0..20 (seconds)
  zIndex: number;     // 0..2
  direction: 'left' | 'right';
};

interface CloudLayerProps {
  count?: number; // how many clouds to render simultaneously
}

export const CloudLayer: React.FC<CloudLayerProps> = ({ count = 8 }) => {
  const [width, setWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1920);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const clouds = useMemo<CloudSpec[]>(() => {
    const rng = (min: number, max: number) => Math.random() * (max - min) + min;
    return Array.from({ length: count }).map((_, i) => {
      const src = CLOUDS[Math.floor(Math.random() * CLOUDS.length)];
      const topPercent = rng(10, 55); // keep in upper band
      const scale = rng(0.6, 1.2);
      const opacity = rng(0.45, 0.9);
      const duration = rng(25, 60);
      let delay = rng(0, 5); // faster initial appearance
      if (i < 3) delay = 0; // seed a few clouds to appear immediately
      const zIndex = Math.random() < 0.2 ? 3 : Math.random() < 0.6 ? 4 : 5;
      const direction = Math.random() < 0.5 ? 'left' : 'right';
      return { id: i, src, topPercent, scale, opacity, duration, delay, zIndex, direction };
    });
  }, [count, width]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden style={{ zIndex: 10 }}>
      {clouds.map(c => {
        const startX = c.direction === 'left' ? '100%' : '-20%';
        const endX = c.direction === 'left' ? '-120%' : '100%';
        const animation = {
          animation: `cloud-drift-${c.id} ${c.duration}s linear ${c.delay}s infinite`
        } as React.CSSProperties;
        const style: React.CSSProperties = {
          position: 'absolute',
          top: `${c.topPercent}%`,
          left: startX,
          transform: `scale(${c.scale})`,
          opacity: c.opacity,
          zIndex: c.zIndex,
          willChange: 'transform',
          ...animation,
        };
        const keyframes = `@keyframes cloud-drift-${c.id} { from { transform: translateX(0) scale(${c.scale}); } to { transform: translateX(${c.direction === 'left' ? '-130%' : '130%'}) scale(${c.scale}); } }`;
        return (
          <div key={c.id} style={style}>
            <style>{keyframes}</style>
            <img src={c.src} alt="" style={{ display: 'block', height: 'auto', width: 'clamp(120px, 18vw, 360px)' }} />
          </div>
        );
      })}
    </div>
  );
};

export default CloudLayer;
