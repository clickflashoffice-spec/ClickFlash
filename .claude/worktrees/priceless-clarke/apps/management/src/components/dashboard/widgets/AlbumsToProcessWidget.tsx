
import React, { useMemo } from 'react';
import Card from '../../common/Card.tsx';
import { Album, Photographer } from '../../../types.ts';

interface AlbumsToProcessWidgetProps {
    albums: Album[];
    photographers: Photographer[];
    onViewAll: () => void;
}

const AlbumsToProcessWidget: React.FC<AlbumsToProcessWidgetProps> = React.memo(({ albums, photographers, onViewAll }) => {

    const queueAlbums = useMemo(() => {
        return albums
            .filter(a => a.status !== 'Finalized' && a.status !== 'Archived')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [albums]);

    return (
        <Card className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Processing Queue</h3>
                    <p className="text-[10px] text-muted-foreground font-bold mt-1">Pending deployments</p>
                </div>
                {queueAlbums.length > 0 && (
                    <span className="bg-amber-500/10 text-amber-500 text-[10px] font-black px-3 py-1 rounded-lg border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                        {queueAlbums.length} ACTIVE
                    </span>
                )}
            </div>

            <div className="space-y-3 flex-grow">
                {queueAlbums.length > 0 ? queueAlbums.map(album => {
                    const photographer = photographers.find(p => p.id === album.photographerId);
                    return (
                        <div key={album.id} className="group flex items-center justify-between p-3 glass-panel border border-white/5 hover:border-cyan-500/30 rounded-2xl transition-all duration-300">
                            <div className="flex items-center space-x-4 min-w-0">
                                <div className="relative w-14 h-14 flex-shrink-0">
                                    {album.coverPhotoUrl ? (
                                        <img src={album.coverPhotoUrl} alt={album.title} className="w-full h-full object-cover rounded-xl shadow-lg ring-1 ring-white/10" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center border border-white/5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 shadow-lg shadow-amber-500/50 border-2 border-[var(--glass)] rounded-full animate-pulse"></div>
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-[13px] truncate text-foreground leading-tight" title={album.title}>{album.title}</p>
                                    <div className="flex items-center text-[11px] text-muted-foreground mt-1.5 font-bold">
                                        <span className="truncate text-cyan-500/80">{photographer?.name || 'Unknown'}</span>
                                        <span className="mx-2 opacity-30">•</span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {album.photos?.length || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onViewAll}
                                title={`Edit ${album.title}`}
                                className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all duration-300 border border-cyan-500/20 shadow-lg shadow-cyan-500/5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </div>
                    );
                }) : (
                    <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                        <div className="bg-green-100 p-3 rounded-full mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-slate-600 font-medium">All Caught Up!</p>
                        <p className="text-xs text-slate-500 mt-1">No pending albums in queue.</p>
                    </div>
                )}
            </div>
            {queueAlbums.length > 0 && (
                <button onClick={onViewAll} className="w-full mt-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all duration-300 border-t border-white/5 hover:bg-white/5 rounded-b-2xl">
                    Expand Terminal Queue
                </button>
            )}
        </Card>
    );
});

AlbumsToProcessWidget.displayName = 'AlbumsToProcessWidget';

export default React.memo(AlbumsToProcessWidget);

