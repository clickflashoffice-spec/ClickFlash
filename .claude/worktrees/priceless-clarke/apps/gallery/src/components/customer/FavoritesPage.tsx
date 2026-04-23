import React from 'react';
import { Photo } from '../../types';
import CustomerGallery from './CustomerGallery';

interface FavoritesPageProps {
    photos: Photo[];
    favoritePhotoIds: Set<string>;
    onToggleFavorite: (photoId: string) => void;
    onOpenAddToCartModal: (photo: Photo) => void;
    onPhotoClick: (photo: Photo) => void;
}

const FavoritesPage: React.FC<FavoritesPageProps> = (props) => {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-down">
            <div className="flex items-center space-x-4 mb-10">
                <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Your <span className="text-red-500">Favorites</span></h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{props.photos.length} Assets Curated</p>
                </div>
            </div>

            {props.photos.length > 0 ? (
                <CustomerGallery {...props} />
            ) : (
                <div className="glass-panel p-20 rounded-3xl border-dashed border-2 border-white/5 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">No Favorites Yet</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-loose max-w-xs mx-auto">
                        Curate your collection by clicking the heart icon on any photo in the main gallery.
                    </p>
                </div>
            )}
        </main>
    );
};

export default FavoritesPage;
