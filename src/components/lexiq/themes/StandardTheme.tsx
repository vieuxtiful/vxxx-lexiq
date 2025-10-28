import React from 'react';
import { motion } from 'framer-motion';

/**
 * StandardTheme component - Aurora borealis "Light Room" atmosphere with LexiQ colors
 * Features 90-degree gradient sky and animated aurora with floating strings
 */
export const StandardTheme: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Main gradient background - LexiQ colors (90-degree: left to right) */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'linear-gradient(90deg, #011624ff 0%, #062136ff 50%, #0a2b44ff 100%)'
        }}
      />
      {/* Global darkening overlay to boost foreground contrast */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      {/* Subtle edge vignette for additional contrast separation */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.18) 100%)'
        }}
      />

      {/* Aurora borealis waves - animated with random positioning */}
      <div className="absolute inset-0">
        {/* Aurora wave 1 - Top layer */}
        <motion.div
          className="absolute left-0 right-0 h-1/2 opacity-70"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 200, 255, 0.9) 0%, rgba(0, 160, 233, 0.6) 50%, transparent 100%)',
            filter: 'blur(35px)',
          }}
          animate={{
            y: ['-10%', '0%', '-10%'],
            x: ['-5%', '5%', '-5%'],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Aurora wave 2 - Middle layer */}
        <motion.div
          className="absolute left-0 right-0 top-1/4 h-1/2 opacity-60"
          style={{
            background: 'linear-gradient(180deg, rgba(64, 224, 255, 0.8) 0%, rgba(0, 180, 240, 0.6) 50%, transparent 100%)',
            filter: 'blur(45px)',
          }}
          animate={{
            y: ['5%', '-5%', '5%'],
            x: ['5%', '-5%', '5%'],
            scale: [1.1, 1, 1.1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />

        {/* Aurora wave 3 - Bottom layer */}
        <motion.div
          className="absolute left-0 right-0 bottom-0 h-2/3 opacity-50"
          style={{
            background: 'linear-gradient(0deg, rgba(0, 140, 200, 0.8) 0%, rgba(0, 180, 240, 0.5) 40%, transparent 100%)',
            filter: 'blur(55px)',
          }}
          animate={{
            y: ['0%', '10%', '0%'],
            x: ['-3%', '3%', '-3%'],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 4,
          }}
        />

        {/* Aurora shimmer particles - Random positioning */}
        {Array.from({ length: 25 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-cyan-300/70 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: 'blur(1.5px)',
              boxShadow: '0 0 8px rgba(0, 200, 255, 0.6)',
            }}
            animate={{
              y: [0, -50, 0],
              x: [0, Math.random() * 30 - 15, 0],
              opacity: [0.2, 0.9, 0.2],
              scale: [0, 2, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 5,
            }}
          />
        ))}

        {/* Aurora curtain effect - Vertical light curtains */}
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={`curtain-${i}`}
            className="absolute top-0 bottom-0 w-32 opacity-30"
            style={{
              left: `${15 + i * 15}%`,
              background: 'linear-gradient(180deg, rgba(100, 220, 255, 0.7) 0%, rgba(0, 180, 240, 0.5) 50%, transparent 100%)',
              filter: 'blur(20px)',
            }}
            animate={{
              scaleY: [0.8, 1.2, 0.8],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 8 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Atmospheric lighting effects */}
      {/* Random pulsing glows (localized atmospheric activity) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`pulse-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${120 + Math.random() * 200}px`,
              height: `${120 + Math.random() * 200}px`,
              background: 'radial-gradient(circle, rgba(130, 220, 255, 0.45) 0%, rgba(80, 190, 255, 0.25) 45%, transparent 70%)',
              filter: 'blur(35px)',
              mixBlendMode: 'screen'
            }}
            animate={{
              opacity: [0, 0.6, 0],
              scale: [0.85, 1.25, 0.9],
              x: [0, (Math.random() * 20) - 10, 0],
              y: [0, (Math.random() * 20) - 10, 0]
            }}
            transition={{
              duration: 6 + Math.random() * 8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 6
            }}
          />
        ))}
      </div>

      {/* Soft light shafts (atmospheric beams) */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={`shaft-${i}`}
            className="absolute top-[-10%] bottom-[-10%] w-32"
            style={{
              left: `${10 + i * 25 + (Math.random() * 10 - 5)}%`,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(120,220,255,0.10) 40%, rgba(0,0,0,0) 100%)',
              filter: 'blur(22px)',
              transform: `rotate(${(Math.random() * 12 - 6).toFixed(1)}deg)`,
              mixBlendMode: 'screen'
            }}
            animate={{
              opacity: [0.05, 0.18, 0.08],
              x: [0, (Math.random() * 40 - 20), 0]
            }}
            transition={{
              duration: 14 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 2
            }}
          />
        ))}
      </div>

      {/* Global color wave (very subtle large-scale sky fluctuation) */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(30deg, rgba(90, 200, 255, 0.08) 0%, rgba(0, 120, 200, 0.06) 50%, rgba(0,0,0,0) 100%)',
          mixBlendMode: 'screen'
        }}
        animate={{ opacity: [0, 0.08, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Subtle stars/sparkles in the background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Light room atmospheric glow - Soft diffused light */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(180, 230, 255, 0.3) 0%, transparent 65%)',
        }}
      />
    </div>
  );
};
