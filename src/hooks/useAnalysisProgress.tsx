import { useState, useEffect, useCallback, useRef } from 'react';

interface AnalysisProgressOptions {
  duration?: number; // Total duration in milliseconds
  onComplete?: () => void;
  onProgress?: (progress: number) => void;
  autoStart?: boolean;
}

interface AnalysisProgressState {
  progress: number;
  isRunning: boolean;
  isPaused: boolean;
  elapsedTime: number;
}

export const useAnalysisProgress = (options: AnalysisProgressOptions = {}) => {
  const {
    duration = 30000, // Default 30 seconds
    onComplete,
    onProgress,
    autoStart = false,
  } = options;

  const [state, setState] = useState<AnalysisProgressState>({
    progress: 0,
    isRunning: autoStart,
    isPaused: false,
    elapsedTime: 0,
  });

  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Animation loop using requestAnimationFrame for 60fps
  useEffect(() => {
    if (!state.isRunning || state.isPaused) {
      return;
    }

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current - pausedTimeRef.current;
      const newProgress = Math.min(elapsed / duration, 1);

      setState(prev => ({
        ...prev,
        progress: newProgress,
        elapsedTime: elapsed,
      }));

      onProgress?.(newProgress);

      if (newProgress >= 1) {
        setState(prev => ({ ...prev, isRunning: false }));
        onComplete?.();
        return;
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [state.isRunning, state.isPaused, duration, onComplete, onProgress]);

  const start = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: true,
    }));
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
  }, []);

  const resume = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPaused: false,
    }));
  }, []);

  const stop = useCallback(() => {
    setState({
      progress: 0,
      isRunning: false,
      isPaused: false,
      elapsedTime: 0,
    });
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
  }, []);

  const reset = useCallback(() => {
    stop();
  }, [stop]);

  const setProgress = useCallback((progress: number) => {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    setState(prev => ({
      ...prev,
      progress: clampedProgress,
      elapsedTime: clampedProgress * duration,
    }));
  }, [duration]);

  return {
    progress: state.progress,
    isRunning: state.isRunning,
    isPaused: state.isPaused,
    elapsedTime: state.elapsedTime,
    start,
    pause,
    resume,
    stop,
    reset,
    setProgress,
  };
};
