import React from 'react';
import { Photo as PhotoType } from '../../types.ts';
import { Photo } from '@clickflash/ui';
import { motion, AnimatePresence } from 'framer-motion';

export interface PhotoCardProps {
    photo: PhotoType;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    onAddToCart: () => void;
    onClick: () => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    onDownloadHighRes?: () => void;
    isOrderPaid?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

const PhotoCard: React.FC<PhotoCardProps> = ({
    photo,
    isFavorite,
    onToggleFavorite,
    onAddToCart,
    onClick,
    isSelectionMode,
    isSelected,
    onToggleSelection,
    onDownloadHighRes,
    isOrderPaid,
    className = '',
    style = {}
}) => {
    return (
        <div
            className={`relative group overflow-hidden rounded-2xl cursor-pointer bg-slate-900 border border-white/5 transition-all duration-500 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:-translate-y-1.5 ${isSelected ? 'ring-4 ring-cyan-500 border-transparent shadow-[0_0_40px_rgba(34,211,238,0.4)]' : ''} ${className}`}
            style={style}
            onClick={isSelectionMode && onToggleSelection ? onToggleSelection : onClick}
        >
            <div className="absolute inset-0 z-0">
                <Photo 
                    photo={photo} 
                    manualEdits={photo.manualEdits || undefined} 
                    imageClassName="transition-transform duration-700 group-hover:scale-110" 
                />
            </div>

            {/* Premium Selection Checkbox */}
            {isSelectionMode && (
                <div className="absolute top-3 left-3 z-30">
                    <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                        ? 'bg-cyan-500 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                        : 'bg-black/50 backdrop-blur-md border-white/30 hover:border-white/60'
                        }`}>
                        {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                </div>
            )}

            {/* Proofing Status Badge */}
            {photo.proofingStatus && (
                <div className={`absolute top-3 right-3 z-20 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/10 ${photo.proofingStatus === 'approved' ? 'bg-green-500/80 text-white' :
                    photo.proofingStatus === 'rejected' ? 'bg-red-500/80 text-white' :
                        'bg-yellow-500/80 text-white'
                    }`}>
                    {photo.proofingStatus}
                </div>
            )}

            {/* Cinematic Overlay Gradient */}
            {!isSelectionMode && (
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex flex-col justify-end p-5">
                    <div className="flex justify-between items-end transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="flex-1 min-w-0 pr-4">
                            <h4 className="font-black text-white text-xs uppercase tracking-widest truncate mb-1">{photo.title || 'Untitled'}</h4>
                            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                <span className="text-cyan-400">View</span>
                                <span>•</span>
                                <span>Order Print</span>
                            </div>
                        </div>
                        <div className="flex space-x-2 flex-shrink-0">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                                className={`p-2.5 rounded-xl backdrop-blur-md border transition-all ${isFavorite ? 'bg-red-500/90 text-white border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}
                                title="Favorite"
                            >
                                <motion.svg 
                                    animate={isFavorite ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                                    transition={{ duration: 0.4, type: "spring", bounce: 0.5 }}
                                    xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor"
                                >
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </motion.svg>
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                                className="p-2.5 rounded-xl bg-cyan-500/90 text-white backdrop-blur-md border border-cyan-400/50 hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                                title="Order Print"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </motion.button>
                            {photo.originalFilename && isOrderPaid && onDownloadHighRes && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={(e) => { e.stopPropagation(); onDownloadHighRes(); }}
                                    className="p-2.5 rounded-xl bg-green-500/90 text-white backdrop-blur-md border border-green-400/50 hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                                    title="Download High-Res"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                                    </svg>
                                </motion.button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Favorite Indicator (Small Heart) */}
            <AnimatePresence>
                {isFavorite && !photo.proofingStatus && !isSelectionMode && (
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        className="absolute top-3 right-3 bg-red-500 text-white p-1.5 rounded-lg shadow-lg z-20 border border-red-400/50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PhotoCard;
