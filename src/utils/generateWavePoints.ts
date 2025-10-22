/**
 * Generates SVG polyline points for waveform animation
 * @param progress - Animation progress (0-1)
 * @param width - SVG width
 * @param height - SVG height
 * @param frequency - Wave frequency multiplier
 * @param amplitude - Wave amplitude multiplier
 * @param segments - Number of points to generate
 * @returns SVG polyline points string
 */
export const generateWavePoints = (
  progress: number,
  width: number = 400,
  height: number = 96,
  frequency: number = 3,
  amplitude: number = 0.3,
  segments: number = 100
): string => {
  const points: string[] = [];
  const centerY = height / 2;
  const maxAmplitude = height * amplitude;
  
  // Calculate visible segment based on progress (left-to-right reveal)
  const visibleSegments = Math.floor(segments * progress);
  
  for (let i = 0; i <= visibleSegments; i++) {
    const x = (i / segments) * width;
    const normalizedX = i / segments;
    
    // Multi-layered sine waves for complex waveform
    const wave1 = Math.sin(normalizedX * Math.PI * frequency * 2) * maxAmplitude * 0.6;
    const wave2 = Math.sin(normalizedX * Math.PI * frequency * 3 + Math.PI / 4) * maxAmplitude * 0.3;
    const wave3 = Math.sin(normalizedX * Math.PI * frequency * 5 - Math.PI / 3) * maxAmplitude * 0.1;
    
    // Combine waves with time-based phase shift for animation
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 4) * maxAmplitude * 0.05;
    
    const y = centerY + wave1 + wave2 + wave3 + pulse;
    
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  
  return points.join(' ');
};

/**
 * Generates gradient color stops based on Q logo colors
 * @param progress - Animation progress (0-1)
 * @returns Array of color stops
 */
export const generateWaveformGradient = (progress: number) => {
  return [
    { offset: '0%', color: '#0277bd', opacity: 0.1 },      // Deep blue
    { offset: '25%', color: '#0096c7', opacity: 0.15 },    // Teal
    { offset: '50%', color: '#00b4a0', opacity: 0.2 },     // Cyan-green
    { offset: '75%', color: '#22c55e', opacity: 0.15 },    // Green
    { offset: '100%', color: '#22c55e', opacity: 0.1 },    // Green fade
  ].map(stop => ({
    ...stop,
    opacity: stop.opacity * Math.min(progress * 2, 1), // Fade in with progress
  }));
};
