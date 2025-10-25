import React, { useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, RefreshCw } from 'lucide-react';
import { WaveformSVG } from './WaveformSVG';
import { useAnalysisProgress } from '@/hooks/useAnalysisProgress';

interface WaveformQAButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isAnalyzing: boolean;
  className?: string;
  analysisProgress?: number; // Optional external progress control
  onAnalysisComplete?: () => void;
  onTimeout?: () => void; // Called when analysis times out
  hasError?: boolean; // Indicates if analysis failed/timed out
}

export const WaveformQAButton: React.FC<WaveformQAButtonProps> = ({
  onClick,
  disabled = false,
  isAnalyzing,
  className = '',
  analysisProgress,
  onAnalysisComplete,
  onTimeout,
  hasError = false,
}) => {
  const [hasHapticSupport, setHasHapticSupport] = React.useState(false);
  const [isEmptying, setIsEmptying] = React.useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastProgressRef = useRef(0);

  // Use analysis progress hook for smooth 60fps animation
  const {
    progress: internalProgress,
    start: startProgress,
    stop: stopProgress,
  } = useAnalysisProgress({
    duration: 30000, // 30 seconds default
    onComplete: () => {
      if (hasHapticSupport) {
        navigator.vibrate([50, 30, 50]); // Triple pulse on completion
      }
      onAnalysisComplete?.();
    },
    onProgress: (prog) => {
      // Trigger haptic pulse at 25%, 50%, 75% milestones
      const milestones = [0.25, 0.5, 0.75];
      milestones.forEach(milestone => {
        if (lastProgressRef.current < milestone && prog >= milestone) {
          if (hasHapticSupport) {
            navigator.vibrate(30);
          }
        }
      });
      lastProgressRef.current = prog;
    },
  });

  // State for emptying animation
  const [emptyingProgress, setEmptyingProgress] = React.useState(1.0);
  
  // Use external progress if provided, otherwise use internal
  let progress = analysisProgress !== undefined ? analysisProgress : internalProgress;
  
  // Override with emptying progress when draining
  if (isEmptying) {
    progress = emptyingProgress;
  }

  // Check for haptic/vibration support
  useEffect(() => {
    setHasHapticSupport('vibrate' in navigator);
  }, []);

  // Start/stop progress animation based on isAnalyzing
  useEffect(() => {
    if (isAnalyzing) {
      setIsEmptying(false);
      startProgress();
    } else {
      stopProgress();
    }
  }, [isAnalyzing, startProgress, stopProgress]);
  
  // Handle error state (timeout/failure) - trigger emptying animation
  useEffect(() => {
    if (hasError && !isAnalyzing) {
      setIsEmptying(true);
      // Capture current progress to start emptying from
      const startProgress = progress;
      setEmptyingProgress(startProgress);
      
      // Animate emptying over 1.5 seconds at 60fps
      let frame = 0;
      const totalFrames = 90; // 1.5s * 60fps
      const emptyInterval = setInterval(() => {
        frame++;
        const newProgress = startProgress * (1 - frame / totalFrames);
        setEmptyingProgress(Math.max(0, newProgress));
        
        if (frame >= totalFrames) {
          clearInterval(emptyInterval);
          setIsEmptying(false);
          setEmptyingProgress(1.0);
          onTimeout?.();
        }
      }, 1000 / 60); // 60fps
      
      return () => clearInterval(emptyInterval);
    }
  }, [hasError, isAnalyzing, onTimeout]);

  const handleClick = useCallback(() => {
    // Trigger haptic feedback on button press
    if (hasHapticSupport) {
      navigator.vibrate(50);
    }
    onClick();
  }, [hasHapticSupport, onClick]);

  // Handle keyboard activation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className={`relative ${className}`}>
      <Button
        ref={buttonRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="button"
        tabIndex={0}
        aria-busy={isAnalyzing}
        aria-label={isAnalyzing ? `Analysis in progress: ${Math.round(progress * 100)}% complete` : 'Start QA Analysis'}
        aria-live="polite"
        className={`
          relative overflow-hidden w-full h-24
          bg-transparent border-2
          ${isAnalyzing || isEmptying
            ? 'border-cyan-500 text-cyan-400' 
            : 'border-cyan-500/30 text-white hover:border-cyan-500/60'
          }
          transition-all duration-500 ease-in-out
          focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2
        `}
        style={{
          willChange: isAnalyzing ? 'background, border-color' : 'auto',
        }}
      >
        {/* Waveform SVG Overlay */}
        {(isAnalyzing || isEmptying) && !prefersReducedMotion && (
          <WaveformSVG 
            progress={progress} 
            isEmptying={isEmptying}
            className="animate-in fade-in duration-300" 
          />
        )}
        {/* SVG Wave-Based Text Mask - Only active when progress > 1% */}
        {(isAnalyzing || isEmptying) && !prefersReducedMotion && progress > 0.01 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Masks use same waveform math as WaveformSVG, scaled to 100x100 */}
              <mask id="wave-text-mask-above">
                <rect x="0" y="0" width="100" height="100" fill="white" />
                <polygon
                  points={`${(() => {
                    const segments = 100; const pts: string[] = [];
                    const t = performance.now() / 1000; const baseY = 100 - (progress * 100);
                    const amp1 = (8 / 96) * 100; const amp2 = (4 / 96) * 100; const amp3 = (2 / 96) * 100;
                    const lift = 1.5; // lift mask upward to match highest crests
                    for (let i = 0; i <= segments; i++) {
                      const nx = i / segments; const x = nx * 100;
                      const y = baseY 
                        + Math.sin(nx * Math.PI * 4 + t * 2) * amp1
                        + Math.sin(nx * Math.PI * 6 - t * 1.5) * amp2
                        + Math.sin(nx * Math.PI * 8 + t * 3) * amp3;
                      pts.push(`${x.toFixed(2)},${Math.max(0, y - lift).toFixed(2)}`);
                    }
                    pts.push('100,100','0,100');
                    return pts.join(' ');
                  })()}`}
                  fill="black"
                />
              </mask>
              
              <mask id="wave-text-mask-below">
                <rect x="0" y="0" width="100" height="100" fill="black" />
                <polygon
                  points={`${(() => {
                    const segments = 100; const pts: string[] = [];
                    const t = performance.now() / 1000; const baseY = 100 - (progress * 100);
                    const amp1 = (8 / 96) * 100; const amp2 = (4 / 96) * 100; const amp3 = (2 / 96) * 100;
                    const lift = 1.5; // lift mask upward to match highest crests
                    for (let i = 0; i <= segments; i++) {
                      const nx = i / segments; const x = nx * 100;
                      const y = baseY 
                        + Math.sin(nx * Math.PI * 4 + t * 2) * amp1
                        + Math.sin(nx * Math.PI * 6 - t * 1.5) * amp2
                        + Math.sin(nx * Math.PI * 8 + t * 3) * amp3;
                      pts.push(`${x.toFixed(2)},${Math.max(0, y - lift).toFixed(2)}`);
                    }
                    pts.push('100,100','0,100');
                    return pts.join(' ');
                  })()}`}
                  fill="white"
                />
              </mask>
            </defs>
          </svg>
        )}

        {/* Button Content - Wave-masked text effect */}
        <div className="relative z-10 flex flex-col items-center justify-center gap-2 w-full h-full">
          {isAnalyzing || isEmptying ? (
            <>
              {/* Base Layer - Uncovered (Black text above wave) */}
              <div 
                className="absolute inset-0 flex items-center justify-center gap-2"
                style={{
                  color: '#000000',
                  maskImage: (isAnalyzing || isEmptying) && !prefersReducedMotion && progress > 0.01
                    ? 'url(#wave-text-mask-above)' 
                    : undefined,
                  WebkitMaskImage: (isAnalyzing || isEmptying) && !prefersReducedMotion && progress > 0.01
                    ? 'url(#wave-text-mask-above)' 
                    : undefined,
                  opacity: progress < 0.01 ? 1 : undefined,
                  transform: 'translateZ(0)' // Force GPU acceleration
                } as React.CSSProperties}
              >
                <div className="flex items-center gap-2">
                  {!isEmptying && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span className="text-lg font-semibold">
                    {isEmptying ? 'Stopping...' : 'Analyzing...'}
                  </span>
                  <span className="text-sm ml-2">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              </div>
              
              {/* Top Layer - Wave-covered (White text in liquid) */}
              <div 
                className="absolute inset-0 flex items-center justify-center gap-2"
                style={{
                  color: '#ffffff',
                  textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 0 8px rgba(0,0,0,0.3)',
                  maskImage: (isAnalyzing || isEmptying) && !prefersReducedMotion && progress > 0.01
                    ? 'url(#wave-text-mask-below)' 
                    : undefined,
                  WebkitMaskImage: (isAnalyzing || isEmptying) && !prefersReducedMotion && progress > 0.01
                    ? 'url(#wave-text-mask-below)' 
                    : undefined,
                  opacity: progress < 0.01 ? 0 : undefined,
                  transform: 'translateZ(0)' // Force GPU acceleration
                } as React.CSSProperties}
              >
                <div className="flex items-center gap-2">
                  {!isEmptying && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span className="text-lg font-semibold">
                    {isEmptying ? 'Stopping...' : 'Analyzing...'}
                  </span>
                  <span className="text-sm ml-2">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              <span className="text-lg font-semibold">Start QA Analysis</span>
            </div>
          )}
        </div>
      </Button>
      
      {/* Glow effect when analyzing */}
      {isAnalyzing && (
        <div className="absolute inset-0 -z-10 blur-xl bg-gradient-to-r from-cyan-500/20 via-teal-400/20 to-green-500/20 animate-pulse" />
      )}
    </div>
  );
};
