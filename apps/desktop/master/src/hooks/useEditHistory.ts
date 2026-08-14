import { useState, useCallback, useRef } from 'react';
import { ManualEdits } from '../types/shared';

interface HistoryState {
  edits: ManualEdits;
  timestamp: number;
}

export const useEditHistory = (initialEdits: ManualEdits) => {
  const [history, setHistory] = useState<HistoryState[]>([
    { edits: initialEdits, timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxHistorySize = useRef(50);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushEdit = useCallback((newEdits: ManualEdits) => {
    setHistory(prev => {
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      newHistory.push({
        edits: { ...newEdits },
        timestamp: Date.now()
      });
      
      // Limit history size
      if (newHistory.length > maxHistorySize.current) {
        newHistory.shift();
        setCurrentIndex(currentIndex);
      } else {
        setCurrentIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [currentIndex]);

  const undo = useCallback((): ManualEdits | null => {
    if (!canUndo) return null;
    
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex].edits;
  }, [canUndo, currentIndex, history]);

  const redo = useCallback((): ManualEdits | null => {
    if (!canRedo) return null;
    
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex].edits;
  }, [canRedo, currentIndex, history]);

  const reset = useCallback(() => {
    setHistory([{ edits: initialEdits, timestamp: Date.now() }]);
    setCurrentIndex(0);
  }, [initialEdits]);

  const currentEdits = history[currentIndex]?.edits || initialEdits;

  return {
    currentEdits,
    pushEdit,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyLength: history.length,
    currentIndex
  };
};

export default useEditHistory;
