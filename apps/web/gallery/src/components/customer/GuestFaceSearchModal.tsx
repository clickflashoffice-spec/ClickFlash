import React, { useRef, useState, useCallback } from 'react';
import { Modal } from '@clickflash/ui';
import { cloudApiService } from '../../services/cloudApiService';
import { Photo } from '../../types';

interface GuestFaceSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddAllToCart: (photos: Photo[]) => void;
}

const GuestFaceSearchModal: React.FC<GuestFaceSearchModalProps> = ({ isOpen, onClose, onAddAllToCart }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [matches, setMatches] = useState<{ photo: Photo; matchScore: number }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);

    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(mediaStream);
            setIsCameraActive(true);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play();
            }
        } catch (err) {
            setError('Could not access camera. Please allow camera permissions or upload a file.');
        }
    };

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsCameraActive(false);
        }
    }, [stream]);

    React.useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setMatches([]);
            setError(null);
            setIsSearching(false);
        }
    }, [isOpen, stopCamera]);

    const captureAndSearch = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        
        stopCamera();
        await performSearch(dataUrl);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
                await performSearch(dataUrl);
            }
        };
        reader.readAsDataURL(file);
    };

    const performSearch = async (dataUrl: string) => {
        setIsSearching(true);
        setError(null);
        try {
            const results = await cloudApiService.searchPhotosByFace(dataUrl);
            if (results && results.length > 0) {
                setMatches(results);
            } else {
                setMatches([]);
                setError('No matching photos found for this face.');
            }
        } catch (err: any) {
            setError(err.message || 'Face search failed.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddAllToCart = () => {
        if (matches.length > 0) {
            onAddAllToCart(matches.map(m => m.photo));
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Photo Finder" size="lg">
            <div className="space-y-6">
                {!isSearching && matches.length === 0 && (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <p className="text-slate-600 dark:text-slate-300 text-center">
                            Take a Selfie to Find Your Photos. Our AI will scan the gallery for your face.
                        </p>

                        {!isCameraActive ? (
                            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                                <button
                                    onClick={startCamera}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Take a Selfie
                                </button>
                                
                                <label className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Upload Photo
                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                        ) : (
                            <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-black border-4 border-slate-800">
                                <video ref={videoRef} className="w-full h-auto" playsInline muted />
                                {/* Facial alignment guide overlay */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-48 h-64 border-2 border-dashed border-white/70 rounded-[100px] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                                    <button 
                                        onClick={captureAndSearch}
                                        className="w-16 h-16 bg-white rounded-full border-4 border-slate-300 hover:bg-slate-100 transition-colors"
                                    ></button>
                                </div>
                            </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                )}

                {isSearching && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Scanning Gallery...</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-center">
                        {error}
                    </div>
                )}

                {!isSearching && matches.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Found {matches.length} Matching Photos
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-80 overflow-y-auto p-1">
                            {matches.map((match, idx) => (
                                <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <img 
                                        src={match.photo.url} 
                                        alt={match.photo.title || 'Match'} 
                                        className="w-full h-32 object-cover"
                                    />
                                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-semibold">
                                        {Math.round(match.matchScore * 100)}% Match
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button
                                onClick={handleAddAllToCart}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Add All My Photos to Cart
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default GuestFaceSearchModal;
