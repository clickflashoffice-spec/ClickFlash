import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Photo } from '../../types.ts';

const PhotoCard: React.FC<{
    photo: Photo;
    isInCart: boolean;
    onClick: () => void;
    style?: React.CSSProperties;
}> = React.memo(({ photo, isInCart, onClick, style }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
    <motion.div 
        layoutId={`photo-container-${photo.id}`}
        className="group cursor-pointer aspect-square relative focus:outline-none focus:ring-4 focus:ring-blue-500 rounded-2xl" 
        onClick={onClick} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        tabIndex={0}
        role="button"
        aria-label={`Photo ${photo.title || photo.id}${isInCart ? ', currently in cart' : ''}`}
        aria-pressed={isInCart}
        style={style} 
        data-testid="photo-card"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
    >
        {!isLoaded && (
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" aria-hidden="true" />
        )}
        <motion.img
            layoutId={`photo-img-${photo.id}`}
            src={photo.url}
            alt={photo.title}
            onLoad={() => setIsLoaded(true)}
            data-testid="photo-card-image"
            className={`w-full h-full object-cover rounded-2xl shadow-lg transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
        />
        {isInCart && (
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xl" 
                aria-label="Photo in cart"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </motion.div>
        )}
        <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-blue-500/50 transition-all pointer-events-none" />
    </motion.div>
)}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    return prevProps.photo.id === nextProps.photo.id &&
        prevProps.photo.url === nextProps.photo.url &&
        prevProps.isInCart === nextProps.isInCart &&
        prevProps.style === nextProps.style; // Style prop from VirtualGrid is stable
});

PhotoCard.displayName = 'PhotoCard';

export default PhotoCard;
