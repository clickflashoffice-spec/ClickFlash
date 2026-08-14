import React, { useState } from "react";

interface Shortcut {
  key: string;
  description: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: "Ctrl + S", description: "Save changes" },
  { key: "Ctrl + Z", description: "Undo" },
  { key: "Ctrl + Y", description: "Redo" },
  { key: "Ctrl + C", description: "Copy Edits" },
  { key: "Ctrl + V", description: "Paste Edits" },
  { key: "Ctrl + 0", description: "Reset zoom" },
  { key: "Ctrl + +", description: "Zoom in" },
  { key: "Ctrl + -", description: "Zoom out" },
  { key: "F", description: "Fit to screen" },
  { key: "Z", description: "Hold for magnifier loupe" },
  { key: "Arrow Keys", description: "Pan image (when zoomed)" },
  { key: "← / →", description: "Prev / Next photo" },
  { key: "Space + Drag", description: "Pan image" },
  { key: "Ctrl + Wheel", description: "Zoom to cursor" },
  { key: "ESC", description: "Cancel crop / Exit retouch" },
];

export const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        title="Keyboard Shortcuts"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-xl shadow-2xl bg-white text-gray-900 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close shortcuts"
                className="p-1 rounded transition-colors hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-2">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between py-2 px-3 rounded bg-gray-50"
                >
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono rounded bg-gray-200 text-gray-700">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-center text-gray-400">
              Press any key outside this dialog to close
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardShortcutsHelp;
