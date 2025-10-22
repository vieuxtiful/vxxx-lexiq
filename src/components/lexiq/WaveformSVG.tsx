import React, { useEffect, useState } from 'react';

interface WaveformSVGProps {
  progress: number;
  width?: number;
  height?: number;
  className?: string;
  isEmptying?: boolean; // Indicates if liquid should drain out
}

export const WaveformSVG: React.FC<WaveformSVGProps> = ({
  progress,
  width = 400,
  height = 96,
  className = '',
  isEmptying = false,
}) => {
  const [topWavePoints, setTopWavePoints] = useState('');
  const [bottomWavePoints, setBottomWavePoints] = useState('');

  // Generate liquid-like waveform points at 60fps
  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const fps = 60;
    const interval = 1000 / fps;

    const generateLiquidWave = (currentTime: number) => {
      if (currentTime - lastTime >= interval) {
        const time = currentTime / 1000;
        const segments = 100;
        const topPoints: string[] = [];
        const bottomPoints: string[] = [];
        
        // Calculate fill height based on progress (bottom to top)
        const fillHeight = height * progress;
        const baseY = height - fillHeight;
        
        // Generate top wave (liquid surface)
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * width;
          const normalizedX = i / segments;
          
          // Multi-layered sine waves for liquid effect
          const wave1 = Math.sin(normalizedX * Math.PI * 4 + time * 2) * 8;
          const wave2 = Math.sin(normalizedX * Math.PI * 6 - time * 1.5) * 4;
          const wave3 = Math.sin(normalizedX * Math.PI * 8 + time * 3) * 2;
          
          const y = baseY + wave1 + wave2 + wave3;
          topPoints.push(`${x.toFixed(2)},${Math.max(0, y).toFixed(2)}`);
        }
        
        // Close the polygon (bottom edge)
        bottomPoints.push(`${width},${height}`);
        bottomPoints.push(`0,${height}`);
        
        setTopWavePoints(topPoints.join(' '));
        setBottomWavePoints(bottomPoints.join(' '));
        lastTime = currentTime;
      }
      rafId = requestAnimationFrame(generateLiquidWave);
    };

    if (progress > 0) {
      rafId = requestAnimationFrame(generateLiquidWave);
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [progress, width, height]);

  return (
    <svg
      className={`waveform-svg ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* Gradient: Cyan (#0891b1) to Green (#0d9456) - Solid fill, no transparency */}
        <linearGradient id="liquid-fill-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          {/* Top - Cyan */}
          <stop offset="0%" stopColor="#0891b1" stopOpacity="1" />
          <stop offset="25%" stopColor="#0891b1" stopOpacity="1" />
          {/* Middle transition */}
          <stop offset="50%" stopColor="#0b9f83" stopOpacity="1" />
          {/* Bottom - Green */}
          <stop offset="75%" stopColor="#0d9456" stopOpacity="1" />
          <stop offset="100%" stopColor="#0d9456" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Liquid fill polygon - Gradual fill from bottom to top */}
      {topWavePoints && progress > 0 && (
        <g>
          {/* Main liquid fill - solid color, no shimmer */}
          <polygon
            points={`${topWavePoints} ${bottomWavePoints}`}
            fill="url(#liquid-fill-gradient)"
            style={{
              transition: isEmptying ? 'opacity 1.5s ease-out' : 'none',
              opacity: progress > 0 ? (isEmptying ? Math.max(0.2, progress) : 1) : 0,
            }}
          />
        </g>
      )}
    </svg>
  );
};
