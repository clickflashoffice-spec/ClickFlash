import React from 'react';

interface BulkActionsBarProps {
    selectedCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onBulkDownload: () => void;
    onBulkShare: () => void;
    onBulkApprove: () => void;
    onBulkReject: () => void;
    onBulkFavorite: () => void;
    onClose: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    onSelectAll,
    onDeselectAll,
    onBulkDownload,
    onBulkShare,
    onBulkApprove,
    onBulkReject,
    onBulkFavorite,
    onClose,
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-fade-in-down">
            <div className="glass-panel p-4 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-6 neon-glow">
                <div className="flex items-center space-x-6 pl-2">
                    <div className="flex flex-col">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected</div>
                        <div className="text-sm font-black text-white uppercase italic">
                            {selectedCount} <span className="text-cyan-400">Assets</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="flex space-x-3">
                        <button
                            onClick={onSelectAll}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                        >
                            All
                        </button>
                        <button
                            onClick={onDeselectAll}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                        >
                            None
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={onBulkDownload}
                        className="p-3 bg-cyan-500/90 text-white rounded-2xl border border-cyan-400/50 hover:bg-cyan-500 transition-all shadow-lg flex items-center space-x-2 group"
                        title="Download Selected"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-widest pr-1">Download</span>
                    </button>

                    <button
                        onClick={onBulkShare}
                        className="p-3 bg-white/5 border border-white/10 text-slate-300 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all shadow-lg"
                        title="Share Selected"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                    </button>

                    <div className="h-8 w-px bg-white/10 mx-1"></div>

                    <button
                        onClick={onBulkApprove}
                        className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl hover:bg-green-500/20 hover:border-green-500/40 transition-all"
                        title="Approve Selected"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        onClick={onBulkReject}
                        className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                        title="Reject Selected"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        onClick={onBulkFavorite}
                        className="p-3 bg-white/5 border border-white/10 text-red-400 rounded-2xl hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                        title="Favorite Selected"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </button>

                    <button
                        onClick={onClose}
                        className="ml-4 p-3 bg-white/10 text-slate-300 rounded-2xl hover:text-white hover:bg-white/20 transition-all"
                        title="Cancel Selection"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActionsBar;
