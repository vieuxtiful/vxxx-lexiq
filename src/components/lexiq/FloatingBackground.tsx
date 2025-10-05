import React, { useState, useEffect } from 'react';

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold' | 'italic';
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontVariant: 'normal' | 'light' | 'bold';
  animationDelay: number;
  speed: number;
  direction: 'ltr' | 'rtl';
}

export const FloatingBackground: React.FC = () => {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const terminologyWords = [
    'quanta', 'cranioplasty', 'nuclear fission', 'combustion', 'photosynthesis',
    'metamorphosis', 'crystallography', 'thermodynamics', 'neurotransmitter', 'mitochondria',
    'cytoplasm', 'endoplasmic reticulum', 'ribosomes', 'chromosomes', 'genome',
    'proteomics', 'bioinformatics', 'pharmacokinetics', 'pathophysiology', 'oncology',
    'epidemiology', 'immunotherapy', 'radiotherapy', 'biocompatibility', 'biomechanics',
    'nanotechnology', 'quantum mechanics', 'relativity', 'superconductivity', 'piezoelectricity',
    'electroencephalography', 'magnetoencephalography', 'spectrometry', 'chromatography', 'titration',
    'stereochemistry', 'crystallization', 'polymerization', 'catalysis', 'stoichiometry',
    'thermochemistry', 'electrochemistry', 'photochemistry', 'organometallic', 'biochemistry',
    'neuroplasticity', 'synaptogenesis', 'neurogenesis', 'apoptosis', 'autophagy'
  ];

  const generateRandomColor = () => {
    const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return `#${randomHex()}${randomHex()}${randomHex()}`;
  };

  const generateFloatingTexts = () => {
    const texts: FloatingText[] = [];
    const usedPositions = new Set<string>();
    
    for (let i = 0; i < 15; i++) {
      let y, attempts = 0;
      
      do {
        y = Math.floor(Math.random() * 80) + 10;
        attempts++;
      } while (usedPositions.has(y.toString()) && attempts < 100);
      
      usedPositions.add(y.toString());
      
      const fontWeights: ('normal' | 'bold')[] = ['normal', 'bold'];
      const fontStyles: ('normal' | 'italic' | 'oblique')[] = ['normal', 'italic', 'oblique'];
      const fontVariants: ('normal' | 'light' | 'bold')[] = ['normal', 'light', 'bold'];
      const leftToRight = Math.random() < 0.5;
      
      texts.push({
        id: i,
        text: terminologyWords[Math.floor(Math.random() * terminologyWords.length)],
        x: leftToRight ? -500 : window.innerWidth + 500,
        y: y,
        fontSize: 14 + Math.random() * 16,
        color: generateRandomColor(),
        fontWeight: fontWeights[Math.floor(Math.random() * fontWeights.length)],
        fontStyle: fontStyles[Math.floor(Math.random() * fontStyles.length)],
        fontVariant: fontVariants[Math.floor(Math.random() * fontVariants.length)],
        animationDelay: 0,
        speed: 50 + Math.random() * 20,
        direction: leftToRight ? 'ltr' : 'rtl'
      });
    }
    
    setFloatingTexts(texts);
  };

  useEffect(() => {
    generateFloatingTexts();
  }, []);

  return (
    <div className="w-screen h-screen opacity-40 overflow-hidden">
      {floatingTexts.map((text) => (
        <div
          key={text.id}
          className="sliding-text fixed select-none will-change-transform"
          style={{
            top: `${text.y}%`,
            fontSize: `${text.fontSize}px`,
            color: text.color,
            fontWeight: text.fontWeight === 'bold' ? 'bold' : 
                       text.fontVariant === 'bold' ? 'bold' :
                       text.fontVariant === 'light' ? '300' : 'normal',
            fontStyle: text.fontStyle,
            animationDelay: `${text.animationDelay}s`,
            animationDuration: `${text.speed}s`,
            fontFamily: '"Quicksand", "Skeena Indigenous", "Raavi", "CordiaUPC", sans-serif',
            animationName: text.direction === 'ltr' ? 'slide-left-to-right' : 'slide-right-to-left',
            left: text.direction === 'ltr' ? '-100px' : 'auto',
            right: text.direction === 'rtl' ? '-100px' : 'auto'
          }}
        >
          {text.text}
        </div>
      ))}
    </div>
  );
};
