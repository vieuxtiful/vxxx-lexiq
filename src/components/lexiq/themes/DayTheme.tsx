import React from 'react';
import { motion } from 'framer-motion';

/**
 * DayTheme component
 */
export interface DayThemeProps {
  sunImageSrc?: string; // kept for API compatibility (unused in this variant)
  currentDate?: Date;   // kept for API compatibility (unused in this variant)
}

export const DayTheme: React.FC<DayThemeProps> = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Main gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-blue-100 to-white" />
      <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-b from-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none bg-gradient-to-t from-black/25 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.08) 100%)'
        }}
      />

      {/* Gaussian blurred sun ray - peeking through clouds */}
      <motion.div
        className="absolute top-[15%] left-[65%] w-80 h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255, 223, 128, 0.5) 0%, rgba(255, 240, 180, 0.3) 40%, rgba(255, 250, 200, 0.1) 70%, transparent 100%)',
          filter: 'blur(12px)',
          transform: 'translateX(-50%) translateY(-50%)',
        }}
        animate={{
          opacity: [0.2, 0.8, 0.4, 0.9, 0.3, 0.7, 0.2],
          scale: [0.8, 1.3, 0.9, 1.2, 0.7, 1.1, 0.8]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]
        }}
      />

      {/* Floating clouds */}
      <div className="absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/40 blur-xl"
            style={{
              width: `${100 + Math.random() * 200}px`,
              height: `${60 + Math.random() * 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`
            }}
            initial={{ x: -200 }}
            animate={{
              x: [null, typeof window !== 'undefined' ? window.innerWidth + 200 : 2000],
              y: [null, Math.random() * 50 - 25]
            }}
            transition={{
              duration: 20 + Math.random() * 30,
              repeat: Infinity,
              ease: 'linear',
              delay: i * 2
            }}
          />
        ))}
      </div>

      {/* Ethereal particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/60 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 3
            }}
          />
        ))}
      </div>
    </div>
  );
};
