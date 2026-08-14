/**
 * Range Selection Hook with Shift-Click Support
 * Integrates with useSelectionState to provide shift-click range selection
 */

import { useCallback, useRef } from 'react';

interface UseRangeSelectionOptions {
  allPhotoIds: string[];
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
  selectRange: (targetId: string, allPhotoIds: string[]) => void;
  setAnchor: (id: string) => void;
  getAnchor: () => string | null;
}

export function useRangeSelection({
  allPhotoIds,
  isSelected,
  toggleSelection,
  selectRange,
  setAnchor,
  getAnchor,
}: UseRangeSelectionOptions) {
  const lastClickedIndexRef = useRef<number>(-1);

  const handlePhotoClick = useCallback(
    (photoId: string, event: React.MouseEvent | React.KeyboardEvent) => {
      const isShiftKey = event.shiftKey;
      const isCtrlKey = event.ctrlKey || event.metaKey;
      const photoIndex = allPhotoIds.indexOf(photoId);

      if (isShiftKey && lastClickedIndexRef.current !== -1) {
        const lastIndex = lastClickedIndexRef.current;
        const start = Math.min(lastIndex, photoIndex);
        const end = Math.max(lastIndex, photoIndex);
        const rangeIds = allPhotoIds.slice(start, end + 1);
        
        rangeIds.forEach(id => {
          if (!isSelected(id)) {
            toggleSelection(id);
          }
        });
        
        setAnchor(photoId);
      } else if (isCtrlKey || isCtrlKey) {
        toggleSelection(photoId);
        setAnchor(photoId);
      } else {
        toggleSelection(photoId);
        setAnchor(photoId);
      }

      lastClickedIndexRef.current = photoIndex;
    },
    [allPhotoIds, isSelected, toggleSelection, selectRange, setAnchor]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, currentPhotoId: string) => {
      const currentIndex = allPhotoIds.indexOf(currentPhotoId);
      if (currentIndex === -1) return;

      const anchor = getAnchor();
      if (!anchor) return;

      const anchorIndex = allPhotoIds.indexOf(anchor);
      if (anchorIndex === -1) return;

      let newTargetIndex = currentIndex;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        newTargetIndex = Math.min(currentIndex + 1, allPhotoIds.length - 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        newTargetIndex = Math.max(currentIndex - 1, 0);
      } else if (event.key === 'Home') {
        newTargetIndex = 0;
      } else if (event.key === 'End') {
        newTargetIndex = allPhotoIds.length - 1;
      } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        allPhotoIds.forEach(id => {
          if (!isSelected(id)) {
            toggleSelection(id);
          }
        });
        return;
      }

      if (newTargetIndex !== currentIndex) {
        const targetId = allPhotoIds[newTargetIndex];

        if (event.shiftKey) {
          selectRange(targetId, allPhotoIds);
        } else {
          toggleSelection(targetId);
          setAnchor(targetId);
        }

        lastClickedIndexRef.current = newTargetIndex;
      }
    },
    [allPhotoIds, isSelected, toggleSelection, selectRange, setAnchor, getAnchor]
  );

  const clearLastClicked = useCallback(() => {
    lastClickedIndexRef.current = -1;
  }, []);

  return {
    handlePhotoClick,
    handleKeyDown,
    clearLastClicked,
  };
}
