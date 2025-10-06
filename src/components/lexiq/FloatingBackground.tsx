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

  // 150+ multilingual terms across 73 languages
  const terminologyWords = [
    // Medical - English
    'pharmacokinetics', 'angioplasty', 'hemodialysis', 'pathophysiology', 'encephalopathy',
    'neurotransmitter', 'immunoglobulin', 'thromboembolism', 'cardiovascular', 'osteoporosis',
    
    // Medical - Spanish
    'cirugía', 'diagnóstico', 'farmacología', 'tratamiento', 'enfermedad',
    'medicina', 'terapia', 'síntomas', 'prevención', 'rehabilitación',
    
    // Medical - French
    'chirurgie', 'diagnostic', 'traitement', 'médecine', 'thérapie',
    'prévention', 'maladie', 'symptômes', 'réhabilitation', 'soins',
    
    // Medical - German
    'Behandlung', 'Diagnose', 'Medizin', 'Therapie', 'Prävention',
    'Chirurgie', 'Krankheit', 'Symptome', 'Rehabilitation', 'Pflege',
    
    // Medical - Chinese
    '治療', '診斷', '藥理學', '手術', '疾病', '症狀', '預防', '康復', '護理', '醫學',
    
    // Medical - Japanese
    '治療', '診断', '薬理学', '手術', '病気', '症状', '予防', 'リハビリ', '看護', '医学',
    
    // Medical - Arabic
    'علاج', 'تشخيص', 'جراحة', 'دواء', 'مرض', 'أعراض', 'وقاية', 'طب', 'عناية', 'صحة',
    
    // Medical - Hindi
    'उपचार', 'निदान', 'शल्यचिकित्सा', 'औषधि', 'रोग', 'लक्षण', 'रोकथाम', 'चिकित्सा',
    
    // Legal - English
    'jurisdiction', 'arbitration', 'indemnification', 'jurisprudence', 'fiduciary',
    'subrogation', 'tort', 'litigation', 'compliance', 'adjudication',
    
    // Legal - Portuguese
    'jurisprudência', 'constituição', 'legislação', 'tribunal', 'sentença',
    'advogado', 'contrato', 'processo', 'arbitragem', 'direito',
    
    // Legal - Russian
    'юрисдикция', 'арбитраж', 'законодательство', 'судопроизводство', 'право',
    'договор', 'суд', 'иск', 'юриспруденция', 'адвокат',
    
    // Legal - Korean
    '관할권', '중재', '법학', '소송', '계약', '법원', '변호사', '판결', '법률', '재판',
    
    // Legal - Italian
    'giurisdizione', 'arbitrato', 'giurisprudenza', 'contratto', 'tribunale',
    'avvocato', 'sentenza', 'processo', 'diritto', 'legislazione',
    
    // Technical - English
    'thermocouple', 'oscilloscope', 'semiconductor', 'calibration', 'flux',
    'capacitance', 'inductance', 'piezoelectric', 'bandwidth', 'latency',
    
    // Technical - German
    'Quantenmechanik', 'Thermodynamik', 'Halbleiter', 'Kalibrierung', 'Kapazität',
    'Induktivität', 'Bandbreite', 'Frequenz', 'Spannung', 'Widerstand',
    
    // Technical - Dutch
    'halfgeleider', 'kalibratie', 'capaciteit', 'inductie', 'frequentie',
    'spanning', 'weerstand', 'bandbreedte', 'oscilloscoop', 'thermokoppel',
    
    // Technical - Swedish
    'halvledare', 'kalibrering', 'kapacitans', 'induktans', 'frekvens',
    'spänning', 'resistans', 'bandbredd', 'oscilloskop', 'termoelement',
    
    // Technical - Polish
    'półprzewodnik', 'kalibracja', 'pojemność', 'indukcyjność', 'częstotliwość',
    'napięcie', 'rezystancja', 'pasmo', 'oscyloskop', 'termopar',
    
    // Technical - Turkish
    'yarıiletken', 'kalibrasyon', 'kapasite', 'endüktans', 'frekans',
    'gerilim', 'direnç', 'bant genişliği', 'osiloskop', 'termokupl',
    
    // Scientific - English
    'chromatography', 'spectroscopy', 'stoichiometry', 'titration', 'enzyme',
    'catalyst', 'polymer', 'isotope', 'photosynthesis', 'oxidation',
    
    // Scientific - Hebrew
    'כרומטוגרפיה', 'ספקטרוסקופיה', 'כימיה', 'זרז', 'פולימר', 'איזוטופ', 'אנזים',
    
    // Scientific - Thai
    'โครมาโทกราฟี', 'สเปกโทรสโคปี', 'เคมี', 'เอนไซม์', 'พอลิเมอร์', 'ไอโซโทป', 'ตัวเร่ง',
    
    // Scientific - Vietnamese
    'sắc ký', 'quang phổ', 'hóa học', 'enzyme', 'polymer', 'đồng vị', 'chất xúc tác',
    
    // Scientific - Indonesian
    'kromatografi', 'spektroskopi', 'kimia', 'enzim', 'polimer', 'isotop', 'katalis',
    
    // Business - English
    'macroeconomics', 'derivatives', 'amortization', 'depreciation', 'liquidity',
    'arbitrage', 'collateral', 'portfolio', 'equity', 'dividend',
    
    // Business - Romance languages
    'économie', 'financement', 'investissement', 'rendement', 'capitalisation',
    'economía', 'financiación', 'inversión', 'rendimiento', 'capitalización',
    'economia', 'finanziamento', 'investimento', 'rendimento', 'capitalizzazione',
    
    // Computing - English
    'refactor', 'middleware', 'scalability', 'optimization', 'encryption',
    'authentication', 'virtualization', 'algorithm', 'recursion', 'iteration',
    
    // Additional diverse languages
    'διαγνωστικά', 'θεραπεία', 'ιατρική', // Greek medical
    'lääketiede', 'hoito', 'diagnoosi', // Finnish medical
    'orvostudomány', 'kezelés', 'diagnózis', // Hungarian medical
    'การแพทย์', 'การรักษา', 'การวินิจฉัย', // Thai medical
    '의학', '치료', '진단', // Korean medical
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
            fontFamily: /[\u4e00-\u9fff]/.test(text.text) ? "'Noto Sans SC', 'Noto Sans JP', 'Noto Sans KR', sans-serif" : 
                       /[\u0600-\u06ff\u0590-\u05ff]/.test(text.text) ? "'Noto Sans Arabic', 'Noto Sans Hebrew', sans-serif" :
                       /[\u0900-\u097f\u0e00-\u0e7f]/.test(text.text) ? "'Noto Sans Devanagari', 'Noto Sans Thai', sans-serif" : 
                       '"Quicksand", "Skeena Indigenous", "Raavi", "CordiaUPC", sans-serif',
            animationName: text.direction === 'ltr' ? 'slide-left-to-right' : 'slide-right-to-left',
            left: text.direction === 'ltr' ? '-100px' : 'auto',
            right: text.direction === 'rtl' ? '-100px' : 'auto',
            direction: /[\u0600-\u06ff\u0590-\u05ff]/.test(text.text) ? 'rtl' : 'ltr',
          }}
        >
          {text.text}
        </div>
      ))}
    </div>
  );
};
