import React from 'react';

interface RetentionCandidate {
    id: string;
    name: string;
    url: string;
    albumId: string;
    albumTitle: string;
    created_at: string;
}

interface MoneyTrashCandidatesProps {
    candidates: RetentionCandidate[];
    showCandidates: boolean;
    setShowCandidates: (show: boolean) => void;
    retentionDays: number;
    onAction: (photoId: string, action: 'exclude' | 'upload' | 'delete') => void;
}

export const MoneyTrashCandidates: React.FC<MoneyTrashCandidatesProps> = ({
    candidates,
    showCandidates,
    setShowCandidates,
    retentionDays,
    onAction
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div
                className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setShowCandidates(!showCandidates)}
            >
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        Retention Candidates
                    </h3>
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full">
                        {candidates.length}
                    </span>
                </div>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 text-slate-500 transition-transform ${showCandidates ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>

            {showCandidates && (
                <div className="p-6">
                    {candidates.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                            </svg>
                            <p>No photos currently match the retention criteria.</p>
                            <p className="text-sm mt-1">Photos older than {retentionDays} days that haven't been sold will appear here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {candidates.slice(0, 18).map((candidate) => (
                                    <div key={candidate.id} className="group relative bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
                                        <div className="aspect-square relative">
                                            <img
                                                src={candidate.url}
                                                alt={candidate.name}
                                                className="w-full h-full object-cover text-[10px]"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onAction(candidate.id, 'upload')}
                                                        title="Upload now"
                                                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => onAction(candidate.id, 'exclude')}
                                                        title="Exclude from retention"
                                                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={candidate.name}>
                                                {candidate.name}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={candidate.albumTitle}>
                                                {candidate.albumTitle}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {candidates.length > 18 && (
                                <div className="mt-6 flex justify-center">
                                    <button className="px-6 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                        Load More Candidates ({candidates.length - 18} remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
