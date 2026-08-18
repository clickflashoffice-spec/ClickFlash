import React from 'react';
import { Album } from '../../../types';

interface AlbumHeaderProps {
    album: Album;
    activePhotoIndex: number;
    selectedPhotoIds: Set<string>;
    activeTab: 'editor' | 'analytics';
    setActiveTab: (tab: 'editor' | 'analytics') => void;
    handleUndo: () => void;
    handleRedo: () => void;
    historyIndex: number;
    historyLength: number;
    saveStatus: string;
    handleBack: () => void;
}

const AlbumHeader: React.FC<AlbumHeaderProps> = ({
    album,
    activePhotoIndex,
    selectedPhotoIds,
    activeTab,
    setActiveTab,
    handleUndo,
    handleRedo,
    historyIndex,
    historyLength,
    saveStatus,
    handleBack
}) => {
    return (
        <div className="editor-toolbar z-50 flex-shrink-0">
            {/* Left Section: Navigation & Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    onClick={handleBack}
                    className="tool-btn flex-shrink-0"
                    title="Go back (ESC)"
                    aria-label="Go back"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>

                <div className="editor-toolbar-separator flex-shrink-0"></div>

                <div className="min-w-0 flex-1">
                    <h1 className="text-sm font-semibold text-white truncate">{album.title}</h1>
                    <p className="text-xs text-white/50 flex items-center gap-2">
                        {selectedPhotoIds.size > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-blue-400">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                                {selectedPhotoIds.size} selected
                            </span>
                        ) : (
                            <span className="font-mono">{activePhotoIndex + 1} / {album?.photos?.length || 0}</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Center Section: Main Actions / Tab Switcher */}
            <div className="flex items-center gap-2">
                <div className="flex bg-white/10 dark:bg-black/20 p-1 rounded-xl mx-2 border border-white/5">
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'editor' ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'analytics' ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/20' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        Analytics
                    </button>
                </div>

                <div className="editor-toolbar-group">
                    <button
                        onClick={handleUndo}
                        disabled={historyIndex <= 0 || historyLength === 0}
                        className="tool-btn"
                        title="Undo (Ctrl+Z)"
                        aria-label="Undo"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={handleRedo}
                        disabled={historyIndex >= historyLength - 1 || historyLength === 0}
                        className="tool-btn"
                        title="Redo (Ctrl+Y)"
                        aria-label="Redo"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                        </svg>
                    </button>
                </div>

                {/* Save Status Indicator */}
                <div className={`status-indicator ${saveStatus === 'saved' ? 'saved' : saveStatus === 'saving' ? 'saving' : 'hidden'}`}>
                    {saveStatus === 'saved' && (
                        <>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Saved</span>
                        </>
                    )}
                    {saveStatus === 'saving' && (
                        <>
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlbumHeader;
