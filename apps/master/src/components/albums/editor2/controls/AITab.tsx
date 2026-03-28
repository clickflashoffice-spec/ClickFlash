import React from 'react';

interface AITabProps {
    onAutoEnhance?: () => void;
    isEnhancing?: boolean;
    onAnalyzeAlbum?: () => void;
    isAnalyzing?: boolean;
    onApplyCulling?: () => void;
    isApplyingCulling?: boolean;
    cullingStats?: {
        total: number;
        selected: number;
        rejected: number;
    };
}

export const AITab: React.FC<AITabProps> = ({
    onAutoEnhance,
    isEnhancing,
    onAnalyzeAlbum,
    isAnalyzing,
    onApplyCulling,
    isApplyingCulling,
    cullingStats,
}) => {
    return (
        <div className="flex flex-col h-full p-4 space-y-6 overflow-y-auto scrollbar-none">
            {/* Auto Enhance */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-100 rounded-xl">
                        <span className="text-xl">✨</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Auto Enhance</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Neural optimization</p>
                    </div>
                </div>

                <p className="text-xs text-gray-600 mb-6 leading-relaxed">
                    Instantly balance exposure, color, and clarity using professional-grade vision algorithms.
                </p>

                <button
                    onClick={onAutoEnhance}
                    disabled={isEnhancing}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    {isEnhancing ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Enhancing...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Apply Auto-Enhance
                        </>
                    )}
                </button>
            </div>

            {/* AI Selection Studio */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-purple-100 rounded-xl">
                        <span className="text-xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">Selection Studio</h3>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Culling Intelligence</p>
                    </div>
                </div>

                {cullingStats && cullingStats.total > 0 && (
                    <div className="grid grid-cols-3 gap-2 py-2">
                        <div className="text-center p-2 bg-white rounded-xl border border-gray-200">
                            <div className="text-sm font-bold text-gray-900">{cullingStats.total}</div>
                            <div className="text-[9px] text-gray-500 uppercase font-black">Total</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="text-sm font-bold text-blue-600">{cullingStats.selected}</div>
                            <div className="text-[9px] text-blue-500 uppercase font-black">Best</div>
                        </div>
                        <div className="text-center p-2 bg-rose-50 rounded-xl border border-rose-100">
                            <div className="text-sm font-bold text-rose-600">{cullingStats.rejected}</div>
                            <div className="text-[9px] text-rose-500 uppercase font-black">Skip</div>
                        </div>
                    </div>
                )}

                <div className="space-y-2 pt-2">
                    <button
                        onClick={onAnalyzeAlbum}
                        disabled={isAnalyzing || isApplyingCulling}
                        className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-gray-200 disabled:opacity-50"
                    >
                        {isAnalyzing ? (
                            <>
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Running Audit...
                            </>
                        ) : (
                            'Scan for Suggestions'
                        )}
                    </button>

                    <button
                        onClick={onApplyCulling}
                        disabled={isAnalyzing || isApplyingCulling || !cullingStats?.total}
                        className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                    >
                        {isApplyingCulling ? 'Applying...' : 'Apply AI Selection'}
                    </button>
                </div>
            </div>

            {/* AI Capability Indicators */}
            <div className="space-y-3 px-2">
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                    Automatic duplicate detection
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Sharpness & focus ranking
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50" />
                    Composition quality scoring
                </div>
            </div>
        </div>
    );
};
