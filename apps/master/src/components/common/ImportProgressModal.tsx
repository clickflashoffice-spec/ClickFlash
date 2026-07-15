import React from 'react';
import Modal from './Modal';

interface ImportProgressModalProps {
  isOpen: boolean;
  currentFile: string;
  currentIndex: number;
  totalFiles: number;
  successCount: number;
  failCount: number;
  isComplete: boolean;
  statusText?: string;
  onClose?: () => void;
}

const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  isOpen,
  currentFile,
  currentIndex,
  totalFiles,
  successCount,
  failCount,
  isComplete,
  statusText,
  onClose
}) => {
  const progress = totalFiles > 0 ? Math.round((currentIndex / totalFiles) * 100) : 0;
  const overallProgress = totalFiles > 0 ? Math.round(((successCount + failCount) / totalFiles) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isComplete && onClose ? onClose : () => { }}
      title={isComplete ? "Import Complete" : "Importing Photos"}
      size="md"
    >
      <div className="space-y-6">
        {!isComplete ? (
          <>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {progress}%
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Copying files... {currentIndex} of {totalFiles}
              </div>
            </div>

            {/* Main Progress Bar */}
            <div className="w-full">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  ref={(el) => {
                    if (el) el.style.width = `${overallProgress}%`;
                  }}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300 ease-out flex items-center justify-end pr-2"
                >
                  {overallProgress > 10 && (
                    <span className="text-xs font-bold text-white">{overallProgress}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Current File Progress */}
            <div className="w-full">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
                <span className="truncate flex-1 mr-2">{statusText ? statusText : `Current: ${currentFile}`}</span>
                <span>{currentIndex}/{totalFiles}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  ref={(el) => {
                    if (el) el.style.width = `${progress}%`;
                  }}
                  className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-200 ease-out"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentIndex}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{successCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Failed</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Import Complete!
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                <div>Successfully imported: <span className="font-bold text-green-600 dark:text-green-400">{successCount}</span> photos</div>
                {failCount > 0 && (
                  <div>Failed: <span className="font-bold text-red-600 dark:text-red-400">{failCount}</span> photos</div>
                )}
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportProgressModal;
