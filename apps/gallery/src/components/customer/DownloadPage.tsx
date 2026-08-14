import { logger } from '@clickflash/logger';
import React, { useState } from 'react';
import { Photo } from '../../types';
import { cloudApiService } from '../../services/cloudApiService';

interface DownloadPageProps {
    photos: Photo[];
    orderId?: string;
}

type DownloadSize = 'web' | 'high-res';

const DownloadPage: React.FC<DownloadPageProps> = ({ photos }) => {
    const [selectedSize, setSelectedSize] = useState<DownloadSize>('high-res');
    const [isDownloading, setIsDownloading] = useState(false);

    const downloadPhoto = async (photo: Photo) => {
        let downloadUrl: string;
        const safeTitle = photo.title || 'Untitled';
        const fileName = safeTitle.includes('.') ? safeTitle.substring(0, safeTitle.lastIndexOf('.')) : safeTitle;
        let downloadFileName = `${fileName}.jpg`;

        if (selectedSize === 'web') {
            downloadUrl = photo.previewUrl || photo.thumbnailUrl || photo.url;
            downloadFileName = `${fileName}_web.jpg`;
        } else {
            downloadUrl = await cloudApiService.getPhotoDownloadUrl(photo.id);
            downloadFileName = `${fileName}_highres.jpg`;
        }

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = async () => {
        if (window.confirm(`This will download all ${photos.length} photos individually. Continue?`)) {
            setIsDownloading(true);
            try {
                for (const photo of photos) {
                    await downloadPhoto(photo);
                }
            } catch (err) {
                logger.error('Bulk download failed', err);
                alert('One or more downloads could not be authorized.');
            } finally {
                setIsDownloading(false);
            }
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
                                <span className="text-[10px] font-black uppercase tracking-widest">Download All</span>
                            </>
                        )}
                    </button>

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
                                onClick={() => void downloadPhoto(photo).catch((err) => {
                                    logger.error('Photo download failed', err);
                                    alert('This photo could not be authorized for download.');
                                })}
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
