
import React, { useMemo } from 'react';
import Card from '../../common/Card';
import { Album, Photographer } from '../../../types';

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
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Processing Queue</h3>
                {queueAlbums.length > 0 && (
                    <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-xs font-bold px-2 py-1 rounded-full">
                        {queueAlbums.length} Pending
                    </span>
                )}
            </div>
            
            <div className="space-y-3 flex-grow">
                {queueAlbums.length > 0 ? queueAlbums.map(album => {
                    const photographer = photographers.find(p => p.id === String(album.photographerId));
                    return (
                        <div key={album.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-lg transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                            <div className="flex items-center space-x-3">
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    {album.coverPhotoUrl ? (
                                        <img src={album.coverPhotoUrl} alt={album.title} className="w-full h-full object-cover rounded-md" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-md flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                                </div>
                                <div>
                                    <p className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[180px]" title={album.title}>{album.title}</p>
                                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                                        <span className="truncate max-w-[100px]">{photographer?.name || 'Unknown'}</span>
                                        <span className="mx-1">•</span>
                                        <span>{album.photos?.length || 0} photos</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={onViewAll}
                                className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded-md transition-all"
                            >
                                Edit
                            </button>
                        </div>
                    );
                }) : (
                    <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                        <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full mb-3">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">All Caught Up!</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No pending albums in queue.</p>
                    </div>
                )}
            </div>
             {queueAlbums.length > 0 && (
                <button onClick={onViewAll} className="w-full mt-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors border-t border-slate-100 dark:border-slate-700/50">
                    View Full Queue
                </button>
            )}
        </Card>
    );
});

AlbumsToProcessWidget.displayName = 'AlbumsToProcessWidget';

export default AlbumsToProcessWidget;
