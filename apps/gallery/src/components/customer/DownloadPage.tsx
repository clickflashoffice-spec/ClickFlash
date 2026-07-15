import { logger } from '@clickflash/logger';
import React, { useState } from 'react';
import { Photo } from '../../types';

interface DownloadPageProps {
    photos: Photo[];
    orderId?: string;
}

type DownloadSize = 'web' | 'high-res';

const DownloadPage: React.FC<DownloadPageProps> = ({ photos, orderId }) => {
    const [selectedSize, setSelectedSize] = useState<DownloadSize>('high-res');
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadPhoto = (photo: Photo) => {
        const link = document.createElement('a');
        let downloadUrl = photo.url;
        const safeTitle = photo.title || 'Untitled';
        const fileName = safeTitle.includes('.') ? safeTitle.substring(0, safeTitle.lastIndexOf('.')) : safeTitle;
        let downloadFileName = `${fileName}.jpg`;

        if (selectedSize === 'web') {
            const lastDotIndex = downloadUrl.lastIndexOf('.');
            if (lastDotIndex !== -1) {
                downloadUrl = downloadUrl.substring(0, lastDotIndex) + '_preview' + downloadUrl.substring(lastDotIndex);
            }
            downloadFileName = `${fileName}_web.jpg`;
        } else {
            downloadFileName = `${fileName}_highres.jpg`;
        }

        link.href = downloadUrl;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = async () => {
        if (!orderId) {
            if (window.confirm(`This will download all ${photos.length} photos individually. Continue?`)) {
                photos.forEach((photo, index) => {
                    setTimeout(() => downloadPhoto(photo), index * 300);
                });
            }
            return;
        }

        if (window.confirm(`Download all ${photos.length} photos as a single ZIP file?`)) {
            setIsDownloading(true);
            try {
                const downloadUrl = `/api/download/bulk-zip/${orderId}`;
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `Order_${orderId}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                logger.error('Bulk download failed', err);
                alert('Bulk download failed. Please try individual downloads.');
            } finally {
                setIsDownloading(false);
            }
        }
    };

    const handleAppleWallet = async () => {
        if (!orderId) return;
        setIsDownloading(true);
        try {
            const response = await fetch(`/api/gallery/wallet-pass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    albumId: photos[0]?.albumId || 'GALLERY',
                    total: 0 // Ideally we'd pass total here, but DownloadPage only gets photos
                })
            });
            if (!response.ok) throw new Error('Failed to generate pass');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Pass-${orderId}.pkpass`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            logger.error('Apple Wallet pass failed', err);
            alert('Failed to generate Apple Wallet pass.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-down pb-32">
            <div className="glass-panel p-8 rounded-3xl border border-white/5 mb-10 flex flex-wrap justify-between items-center gap-8 shadow-2xl">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Asset <span className="text-cyan-400">Download</span></h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{photos.length} Total items ready for delivery</p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                        <button
                            onClick={() => setSelectedSize('web')}
                            className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedSize === 'web' ? 'bg-cyan-500 text-white shadow-lg border border-cyan-400/50' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Web Optimized
                        </button>
                        <button
                            onClick={() => setSelectedSize('high-res')}
                            className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedSize === 'high-res' ? 'bg-cyan-500 text-white shadow-lg border border-cyan-400/50' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            High-Resolution
                        </button>
                    </div>

                    <button
                        onClick={handleDownloadAll}
                        disabled={isDownloading}
                        className={`bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold py-3.5 px-8 rounded-2xl transition-all flex items-center gap-3 shadow-xl ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        {isDownloading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Compiling Assets...</span>
                            </>
                        ) : (
                            <>
                                <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                                </svg>
                                <span className="text-[10px] font-black uppercase tracking-widest">Download Full ZIP</span>
                            </>
                        )}
                    </button>

                    {orderId && (
                        <button
                            onClick={handleAppleWallet}
                            disabled={isDownloading}
                            className={`bg-black/60 hover:bg-black text-white border border-slate-700 font-bold py-3.5 px-6 rounded-2xl transition-all flex items-center gap-2 shadow-xl ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                            </svg>
                            <span className="text-[10px] font-black uppercase tracking-widest">Add to Apple Wallet</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                {photos.map(photo => (
                    <div key={photo.id} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/5 bg-slate-900 shadow-lg hover:shadow-cyan-500/10 transition-all">
                        <img
                            src={photo.url}
                            alt={(photo.title || "Untitled")}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-100"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                            <button
                                onClick={() => downloadPhoto(photo)}
                                className="w-full py-2 bg-cyan-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg border border-cyan-400/50"
                            >
                                Get File
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
};

export default DownloadPage;
