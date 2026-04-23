import { useEffect, useCallback } from "react";

interface KeyboardShortcutConfig {
  onPrevPhoto?: () => void;
  onNextPhoto?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onSelectAll?: () => void;
  onEscape?: () => void;
  onFullscreen?: () => void;
}

export function useKeyboardShortcuts(
  config: KeyboardShortcutConfig,
  enabled: boolean = true,
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const {
        onPrevPhoto,
        onNextPhoto,
        onSave,
        onDelete,
        onCopy,
        onPaste,
        onUndo,
        onSelectAll,
        onEscape,
        onFullscreen,
      } = config;

      switch (e.key) {
        case "ArrowLeft":
          if (onPrevPhoto) {
            e.preventDefault();
            onPrevPhoto();
          }
          break;
        case "ArrowRight":
        case " ":
          if (onNextPhoto) {
            e.preventDefault();
            onNextPhoto();
          }
          break;
        case "s":
          if ((e.ctrlKey || e.metaKey) && onSave) {
            e.preventDefault();
            onSave();
          }
          break;
        case "c":
          if ((e.ctrlKey || e.metaKey) && onCopy) {
            e.preventDefault();
            onCopy();
          }
          break;
        case "v":
          if ((e.ctrlKey || e.metaKey) && onPaste) {
            e.preventDefault();
            onPaste();
          }
          break;
        case "z":
          if ((e.ctrlKey || e.metaKey) && onUndo) {
            e.preventDefault();
            onUndo();
          }
          break;
        case "a":
          if ((e.ctrlKey || e.metaKey) && onSelectAll) {
            e.preventDefault();
            onSelectAll();
          }
          break;
        case "Delete":
        case "Backspace":
          // Extra defensive check for album deletion
          if (onDelete) {
            // Don't trigger if any modal is open (common source of accidental deletions)
            const isModalOpen =
              !!document.querySelector('[role="dialog"]') ||
              !!document.querySelector(".modal-overlay") ||
              !!document.querySelector(".chakra-modal__content-container");

            if (isModalOpen) return;

            e.preventDefault();
            onDelete();
          }
          break;
        case "Escape":
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
        case "f":
          if (onFullscreen) {
            e.preventDefault();
            onFullscreen();
          }
          break;
      }
    },
    [config, enabled],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
