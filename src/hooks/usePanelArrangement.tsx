import { useState, useCallback } from 'react';

export type PanelState = 'normal' | 'locked' | 'adjusting';

interface PanelArrangement {
  termValidatorState: PanelState;
  sourceEditorState: PanelState;
  isSwapped: boolean;
}

export const usePanelArrangement = () => {
  const [arrangement, setArrangement] = useState<PanelArrangement>({
    termValidatorState: 'normal',
    sourceEditorState: 'normal',
    isSwapped: false,
  });

  const lockPanel = useCallback((panel: 'termValidator' | 'sourceEditor') => {
    setArrangement((prev) => ({
      ...prev,
      [`${panel}State`]: 'locked',
    }));
  }, []);

  const unlockPanel = useCallback((panel: 'termValidator' | 'sourceEditor') => {
    setArrangement((prev) => ({
      ...prev,
      [`${panel}State`]: 'normal',
    }));
  }, []);

  const setAdjusting = useCallback((panel: 'termValidator' | 'sourceEditor', isAdjusting: boolean) => {
    setArrangement((prev) => ({
      ...prev,
      [`${panel}State`]: isAdjusting ? 'adjusting' : 'normal',
    }));
  }, []);

  const swapPanels = useCallback(() => {
    setArrangement((prev) => ({
      ...prev,
      isSwapped: !prev.isSwapped,
    }));
  }, []);

  const resetArrangement = useCallback(() => {
    setArrangement({
      termValidatorState: 'normal',
      sourceEditorState: 'normal',
      isSwapped: false,
    });
  }, []);

  return {
    arrangement,
    lockPanel,
    unlockPanel,
    setAdjusting,
    swapPanels,
    resetArrangement,
  };
};
