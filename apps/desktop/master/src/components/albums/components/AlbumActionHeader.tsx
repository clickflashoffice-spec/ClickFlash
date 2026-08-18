import React from 'react';

interface AlbumActionHeaderProps {
    isStudioMode: boolean;
    setIsStudioMode: (mode: boolean) => void;
    onAICull: () => void;
    onSave: () => void;
    onDone: () => void;
    isDirty: boolean;
    isSaving: boolean;
}

const AlbumActionHeader: React.FC<AlbumActionHeaderProps> = ({
    isStudioMode,
    setIsStudioMode,
    onAICull,
    onSave,
    onDone,
    isDirty,
    isSaving
}) => {
    return (
        <div className="flex items-center gap-2 flex-shrink-0">
            <button
                onClick={() => setIsStudioMode(!isStudioMode)}
                className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${isStudioMode
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                title={isStudioMode ? "Switch to Standard View" : "Switch to Studio Mode"}
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h3a1 1 0 011 1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1v-6z" />
                </svg>
            </button>

            <button
                onClick={onAICull}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-purple-500/30 hover:scale-105 active:scale-95"
            >
                AI Cull
            </button>

            <button
                onClick={onSave}
                disabled={!isDirty || isSaving}
                className="group relative bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2 px-4 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-400 transition-all duration-200 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
            >
                <span className="relative z-10">Save Changes</span>
            </button>

            <button
                onClick={onDone}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
            >
                Done
            </button>
        </div>
    );
};

export default AlbumActionHeader;
