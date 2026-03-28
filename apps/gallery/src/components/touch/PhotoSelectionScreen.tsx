
import React, { useState, useMemo, useEffect } from 'react';
import { Album, Photo, PhotoCategory, CartItem, DestinationFeatures } from '../../types.ts';
import SelectionCartBar from './SelectionCartBar';
import { webSocketService } from '../../services/webSocketService.ts';
import FaceSearchModal from './FaceSearchModal';
import { faceRecognitionService } from '../../services/faceRecognitionService.ts';

interface PhotoSelectionScreenProps {
    albums: Album[];
    onPhotoClick: (photo: Photo, album: Album) => void;
    onShowCart: () => void;
    cart: CartItem[];
    onBack: () => void;
    roomNumber?: string;
    showToast: (message: string) => void;
    globalFeatures?: DestinationFeatures;
}

const PhotoSelectionScreen: React.FC<PhotoSelectionScreenProps> = ({ 
    albums, 
    onPhotoClick, 
    onShowCart, 
    cart, 
    onBack, 
    roomNumber, 
    showToast,
    globalFeatures = { ai: true, face: true, watermark: true } 
}) => {
    const [selectedCategory, setSelectedCategory] = useState<PhotoCategory | 'All' | 'Matched'>('All');
    const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
    const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
    const [matchedPhotos, setMatchedPhotos] = useState<Photo[]>([]);
    // Default to true so the feature is visible immediately after upgrade
    const [enableFaceSearch, setEnableFaceSearch] = useState(true);

    useEffect(() => {
        webSocketService.getLastAlbumUpdateTime().then(timestamp => {
            if (timestamp) {
                setLastUpdateTime(new Date(timestamp).toLocaleString());
            }
        });
        
        // Check settings
        const savedSettings = localStorage.getItem('kioskSettingsV2');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                // If the setting exists, use it. If undefined (legacy), default to true.
                if (parsed.enableFaceSearch !== undefined) {
                    setEnableFaceSearch(!!parsed.enableFaceSearch);
                }
            } catch (e) {}
        }
    }, [albums]);

    const allCategories = useMemo((): (PhotoCategory | 'All' | 'Matched')[] => {
        const cats = new Set<PhotoCategory>();
        albums.forEach(album => (album.categories || []).forEach(cat => cats.add(cat)));
        const list: (PhotoCategory | 'All' | 'Matched')[] = ['All', ...Array.from(cats)];
        if (matchedPhotos.length > 0) list.splice(1, 0, 'Matched');
        return list;
    }, [albums, matchedPhotos]);
    
    const filteredAlbums = useMemo(() => {
        if (selectedCategory === 'Matched') {
            // Create a virtual album for matches
            return matchedPhotos.length > 0 ? [{
                id: 'matched-results',
                title: 'Your Matched Photos',
                date: new Date().toISOString(),
                photographerId: 0,
                source: 'AI',
                roomNumber: '',
                coverPhotoUrl: matchedPhotos[0].url,
                photos: matchedPhotos
            } as Album] : [];
        }

        if (selectedCategory === 'All') return albums;
        return albums.filter(album => (album.categories || []).includes(selectedCategory as PhotoCategory));
    }, [albums, selectedCategory, matchedPhotos]);
    
    const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleFaceSearch = async (blob: Blob) => {
        setIsFaceSearchOpen(false);
        // Gather all photos from all albums
        const allPhotos = albums.flatMap(a => a.photos);
        
        // Perform Search
        const results = await faceRecognitionService.findMatches(blob, allPhotos);
        
        setMatchedPhotos(results);
        if (results.length > 0) {
            setSelectedCategory('Matched');
            showToast(`Found ${results.length} matching photos!`);
        } else {
            showToast("No matching faces found in this gallery.");
        }
    };
    
    // Determine if face search feature is available (Both local setting AND global feature flag)
    const canUseFaceSearch = enableFaceSearch && globalFeatures.face;

    return (
        <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-900 text-slate-800 dark:text-white">
            <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    <span className="text-xl">Back to Home</span>
                </button>
                <div className="text-center">
                    <h1 className="text-3xl font-bold">
                        {roomNumber ? `Viewing Room: ${roomNumber}` : 'Your Photos'}
                    </h1>
                    {lastUpdateTime && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">Last updated: {lastUpdateTime}</p>
                    )}
                </div>
                 <div className="w-48 flex justify-end">
                     {canUseFaceSearch && (
                         <button 
                            onClick={() => setIsFaceSearchOpen(true)}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all hover:scale-105"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                            <span className="font-bold">Find Me (AI)</span>
                        </button>
                     )}
                 </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-slate-50 dark:bg-slate-800/50 p-4 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <h2 className="text-xl font-bold mb-4">Categories</h2>
                    <nav className="space-y-2 flex-1">
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full text-left px-4 py-2 rounded-lg text-lg transition-colors flex justify-between items-center ${
                                    selectedCategory === cat
                                        ? 'bg-blue-600 text-white font-semibold'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{cat}</span>
                                {cat === 'Matched' && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{matchedPhotos.length}</span>}
                            </button>
                        ))}
                    </nav>
                </aside>
                
                <main className="flex-1 overflow-y-auto p-6">
                    {filteredAlbums.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-2xl font-medium">No photos found in this category.</p>
                            <p className="mt-2">Try selecting 'All' or another category.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {filteredAlbums.map(album => (
                                <div key={album.id}>
                                    <div className="flex items-baseline mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        <h3 className="text-2xl font-bold mr-4">{album.title}</h3>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(album.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {album.photos.map(photo => {
                                            const isInCart = cart.some(item => item.photo.id === photo.id);
                                            return (
                                                <div key={photo.id} className="group cursor-pointer aspect-w-1 aspect-h-1 relative" onClick={() => onPhotoClick(photo, album)}>
                                                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover rounded-lg shadow-md transition-transform group-hover:scale-105" />
                                                     {isInCart && (
                                                        <div className="absolute top-2 right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
            <div className="absolute bottom-8 right-8 z-10">
                <SelectionCartBar onShowCart={onShowCart} count={cartItemCount} />
            </div>
            
            <FaceSearchModal 
                isOpen={isFaceSearchOpen} 
                onClose={() => setIsFaceSearchOpen(false)} 
                onSearch={handleFaceSearch} 
            />
        </div>
    );
};

export default PhotoSelectionScreen;
