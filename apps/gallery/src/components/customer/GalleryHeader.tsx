import React from 'react';

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc' | 'favorites-first';
type FilterOption = 'all' | 'favorites' | 'approved' | 'rejected' | 'pending';

export interface GalleryHeaderProps {
    totalPhotos: number;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    sortOption: SortOption;
    onSortChange: (sort: SortOption) => void;
    filter: FilterOption;
    onFilterChange: (filter: FilterOption) => void;
    isSelectionMode: boolean;
    onToggleSelectionMode: () => void;
    onOpenProofing?: () => void;
    onBulkDownload: () => void;
}

const GalleryHeader: React.FC<GalleryHeaderProps> = ({
    totalPhotos,
    searchTerm,
    onSearchChange,
    sortOption,
    onSortChange,
    filter,
    onFilterChange,
    isSelectionMode,
    onToggleSelectionMode,
    onOpenProofing,
    onBulkDownload
}) => {
    return (
        <div className="sticky top-24 z-30 mb-10 space-y-4 animate-fade-in-down">
            <div className="glass-panel p-6 rounded-3xl border border-white/5 shadow-2xl flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white italic">
                            Master <span className="text-cyan-400">Library</span>
                        </h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            {totalPhotos} Assets Found
                        </p>
                    </div>
                    <div className="h-8 w-px bg-white/10 mx-2 hidden sm:block"></div>
                    <div className="flex items-center space-x-2">
                        {onOpenProofing && (
                            <button onClick={onOpenProofing} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                Review Proofs
                            </button>
                        )}
                        <button
                            onClick={onToggleSelectionMode}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${isSelectionMode
                                ? 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                                }`}
                        >
                            {isSelectionMode ? 'Cancel' : 'Multi-Select'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 max-w-md">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search by filename..."
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-2.5 pl-11 text-white placeholder-slate-600 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all font-bold text-xs"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <select
                        value={sortOption}
                        onChange={(e) => onSortChange(e.target.value as SortOption)}
                        className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all"
                    >
                        <option value="date-desc">Newest First</option>
                        <option value="title-asc">Title A-Z</option>
                        <option value="favorites-first">Favorites First</option>
                    </select>
                    <button
                        onClick={onBulkDownload}
                        className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all group shadow-lg"
                        title="Download All"
                        aria-label="Download All Assets"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Sub-Filters */}
            <div className="flex items-center space-x-2 px-2">
                {(['all', 'favorites', 'approved', 'rejected', 'pending'] as FilterOption[]).map(f => (
                    <button
                        key={f}
                        onClick={() => onFilterChange(f)}
                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border transition-all ${filter === f
                            ? 'bg-white/10 text-white border-white/30'
                            : 'text-slate-500 border-transparent hover:text-slate-300'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default GalleryHeader;
