import React, { useState, useEffect } from 'react';
import { cullingService, AICullingResult } from '../../services/api/cullingService';
import { useParams } from 'react-router-dom';

export const AICullingDashboard: React.FC = () => {
    const { albumId } = useParams<{ albumId: string }>();
    const [results, setResults] = useState<AICullingResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        if (albumId) loadResults();
    }, [albumId]);

    const loadResults = async () => {
        if (!albumId) return;
        setLoading(true);
        try {
            const data = await cullingService.getResults(albumId);
            setResults(data);
        } catch (error) {
            console.error('Failed to load culling results', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!albumId) return;
        setAnalyzing(true);
        try {
            await cullingService.analyzeAlbum(albumId);
            await loadResults();
        } catch (error) {
            console.error('Analysis failed', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleConfirm = async () => {
        if (!albumId) return;
        if (!confirm('Are you sure you want to apply AI suggestions? Rejected photos will be archived.')) return;

        setLoading(true);
        try {
            await cullingService.confirmCulling(albumId, { mode: 'archive' });
            await loadResults();
            alert('Culling applied successfully!');
        } catch (error) {
            console.error('Failed to confirm culling', error);
        } finally {
            setLoading(false);
        }
    };

    if (!albumId) return <div className="p-20 text-center text-slate-400">Album context not found.</div>;

    // Groups are returned, flat map their photos for the simple dashboard
    const allPhotos = results.flatMap(g => g.photos);
    const bestPhotos = allPhotos.filter(p => p.cullingStatus === 'Selected');
    const rejectedPhotos = allPhotos.filter(p => p.cullingStatus === 'Rejected');

    // Statistics
    const totalPhotos = allPhotos.length;
    const avgScore = totalPhotos > 0
        ? allPhotos.reduce((acc, p) => acc + (p.overallScore || 0), 0) / totalPhotos
        : 0;
    const avgSharpness = totalPhotos > 0
        ? allPhotos.reduce((acc, p) => acc + (p.sharpnessScore || 0), 0) / totalPhotos
        : 0;

    return (
        <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans p-8 overflow-hidden">
            {/* Glass Header */}
            <header className="flex justify-between items-center mb-10 p-6 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
                <div>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        AI SELECTION STUDIO
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 uppercase tracking-widest font-bold opacity-60">
                        Intelligent Asset Culling v5.0
                    </p>
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={handleAnalyze}
                        disabled={analyzing || loading}
                        className={`flex items-center space-x-2 px-8 py-4 rounded-2xl font-bold transition-all ${analyzing
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:scale-105 active:scale-95'
                            }`}
                    >
                        {analyzing ? (
                            <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span>SCAN ALBUM</span>
                        )}
                    </button>

                    <button
                        onClick={handleConfirm}
                        disabled={results.length === 0 || loading}
                        className="px-8 py-4 bg-gradient-to-br from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        APPLY SUGGESTIONS
                    </button>
                </div>
            </header>

            {/* Statistics Panel */}
            {results.length > 0 && (
                <div className="grid grid-cols-5 gap-4 mb-6">
                    {/* Total Photos */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 flex flex-col items-center justify-center shadow-lg hover:bg-white/10 transition-all">
                        <div className="text-4xl font-black bg-gradient-to-br from-slate-200 to-slate-400 bg-clip-text text-transparent mb-1">
                            {totalPhotos}
                        </div>
                        <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Total Photos</div>
                    </div>

                    {/* Selected */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-blue-500/30 p-5 flex flex-col items-center justify-center shadow-lg hover:bg-blue-500/10 transition-all">
                        <div className="text-4xl font-black text-blue-400 mb-1">
                            {bestPhotos.length}
                        </div>
                        <div className="text-xs text-blue-300/70 uppercase tracking-widest font-semibold">AI Selected</div>
                        <div className="text-[10px] text-blue-400/50 mt-1 font-bold">
                            {totalPhotos > 0 ? Math.round((bestPhotos.length / totalPhotos) * 100) : 0}% Selected
                        </div>
                    </div>

                    {/* Rejected */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-rose-500/30 p-5 flex flex-col items-center justify-center shadow-lg hover:bg-rose-500/10 transition-all">
                        <div className="text-4xl font-black text-rose-400 mb-1">
                            {rejectedPhotos.length}
                        </div>
                        <div className="text-xs text-rose-300/70 uppercase tracking-widest font-semibold">Rejected</div>
                        <div className="text-[10px] text-rose-400/50 mt-1 font-bold">
                            {totalPhotos > 0 ? Math.round((rejectedPhotos.length / totalPhotos) * 100) : 0}% Rejected
                        </div>
                    </div>

                    {/* Average Score */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-purple-500/30 p-5 flex flex-col items-center justify-center shadow-lg hover:bg-purple-500/10 transition-all">
                        <div className="text-4xl font-black text-purple-400 mb-1">
                            {Math.round(avgScore * 100)}%
                        </div>
                        <div className="text-xs text-purple-300/70 uppercase tracking-widest font-semibold">Avg Quality</div>
                        <div className="w-full mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full" style={{ width: `${avgScore * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Average Sharpness */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-cyan-500/30 p-5 flex flex-col items-center justify-center shadow-lg hover:bg-cyan-500/10 transition-all">
                        <div className="text-4xl font-black text-cyan-400 mb-1">
                            {Math.round(avgSharpness * 100)}%
                        </div>
                        <div className="text-xs text-cyan-300/70 uppercase tracking-widest font-semibold">Avg Sharpness</div>
                        <div className="w-full mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full" style={{ width: `${avgSharpness * 100}%` }}></div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                        <p className="text-slate-400 animate-pulse font-medium tracking-widest">SYNCHRONIZING...</p>
                    </div>
                </div>
            ) : results.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl m-10">
                    <div className="p-8 bg-blue-500/10 rounded-full mb-6 text-blue-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">No Intelligence Found</h2>
                    <p className="text-slate-500 max-w-md text-center leading-relaxed">
                        Start the automated selection process to identify top-tier photos, sharpness levels, and group duplicates.
                    </p>
                    <button
                        onClick={handleAnalyze}
                        className="mt-8 px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-colors"
                    >
                        Ignite AI Analysis
                    </button>
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden pb-4">
                    {/* Best Photos Column */}
                    <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 p-8 flex flex-col overflow-hidden shadow-inner">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-blue-400 flex items-center">
                                <span className="mr-3 p-2 bg-blue-500/20 rounded-lg">⭐</span>
                                SELECTS
                                <span className="ml-4 text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full">{bestPhotos.length}</span>
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 pr-4 custom-scrollbar">
                            {bestPhotos.map((photo: any) => (
                                <div key={photo.id} className="aspect-square bg-slate-900 rounded-2xl overflow-hidden relative group border border-white/5 shadow-xl transition-all hover:ring-2 hover:ring-blue-500/50">
                                    <img src={photo.thumbnailUrl} alt="Best" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg">
                                        {Math.round(photo.overallScore * 100)}%
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                        <div className="flex justify-between items-center text-[10px] text-slate-300">
                                            <span>SHARP: {Math.round(photo.sharpnessScore * 100)}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rejected Photos Column */}
                    <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 p-8 flex flex-col overflow-hidden shadow-inner opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-rose-400 flex items-center">
                                <span className="mr-3 p-2 bg-rose-500/20 rounded-lg">🗑️</span>
                                REJECTS
                                <span className="ml-4 text-xs bg-rose-500/20 text-rose-300 px-3 py-1 rounded-full">{rejectedPhotos.length}</span>
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4 pr-4 custom-scrollbar grayscale opacity-50 contrast-75">
                            {rejectedPhotos.map((photo: any) => (
                                <div key={photo.id} className="aspect-square bg-slate-900 rounded-2xl overflow-hidden relative group border border-white/5 shadow-xl grayscale-0 hover:grayscale-0 transition-all">
                                    <img src={photo.thumbnailUrl} alt="Reject" className="w-full h-full object-cover opacity-80" />
                                    <div className="absolute top-3 right-3 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg border border-white/10">
                                        {Math.round(photo.overallScore * 100)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
