import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal.tsx';
import { logger } from '../../utils/logger';
import { motion, AnimatePresence } from 'framer-motion';

interface FaceSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (image: Blob) => void;
    title?: string;
}

const FaceSearchModal: React.FC<FaceSearchModalProps> = ({ isOpen, onClose, onSearch, title = "Find Your Photos by Face" }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [useMock, setUseMock] = useState(false);
    const [hasConsented, setHasConsented] = useState(false);

    useEffect(() => {
        if (isOpen && hasConsented && !useMock) {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, hasConsented, useMock]);

    const startCamera = async () => {
        setError(null);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("Camera API not supported in this browser");
            return;
        }

        // Pre-check: actively check if a video input device exists before trying to access it.
        // This prevents the 'Requested device not found' error from flooding the console on devices without cameras.
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasVideoInput = devices.some(device => device.kind === 'videoinput');
            if (!hasVideoInput) {
                setError("No camera device found.");
                return;
            }
        } catch (e) {
            // If enumeration is blocked (e.g. privacy settings), we proceed to try getUserMedia anyway
            logger.debug("Device enumeration skipped or failed", { error: e instanceof Error ? e.message : String(e) });
        }

        try {
            // Try requesting the user-facing camera first
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            handleStreamSuccess(mediaStream);
        } catch (err: any) {
            logger.warn("Specific camera constraint failed, retrying with generic...", err);
            
            // Fallback: Try any available video device
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                handleStreamSuccess(mediaStream);
            } catch (fallbackErr: any) {
                logger.error("Camera access error:", fallbackErr);
                let msg = "Unable to access camera.";
                if (fallbackErr.name === 'NotAllowedError' || fallbackErr.name === 'PermissionDeniedError') {
                    msg = "Camera access denied. Please check permissions.";
                } else if (fallbackErr.name === 'NotFoundError' || fallbackErr.name === 'DevicesNotFoundError') {
                    msg = "No camera device found.";
                } else if (fallbackErr.name === 'NotReadableError' || fallbackErr.name === 'TrackStartError') {
                    msg = "Camera is in use by another application.";
                }
                setError(msg);
            }
        }
    };

    const handleStreamSuccess = (mediaStream: MediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = async () => {
        if (useMock) {
             setIsScanning(true);
             
             // Generate a local mock blob instead of fetching external URL to prevent offline errors
             const canvas = document.createElement('canvas');
             canvas.width = 300;
             canvas.height = 300;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                 // Draw a simple face placeholder background
                 ctx.fillStyle = '#e2e8f0'; // slate-200
                 ctx.fillRect(0,0,300,300);
                 
                 // Draw silhouette
                 ctx.fillStyle = '#94a3b8'; // slate-400
                 ctx.beginPath(); 
                 ctx.arc(150, 130, 60, 0, Math.PI * 2); // Head
                 ctx.fill();
                 
                 ctx.beginPath(); 
                 ctx.arc(150, 320, 100, Math.PI, 0, true); // Shoulders
                 ctx.fill();
             }
             
             canvas.toBlob(blob => {
                 if (blob) {
                    setTimeout(() => {
                        onSearch(blob);
                        setIsScanning(false);
                    }, 1500);
                 }
             }, 'image/jpeg');
             return;
        }

        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                setIsScanning(true);
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                
                canvasRef.current.toBlob((blob) => {
                    if (blob) {
                        // Simulate scanning animation delay
                        setTimeout(() => {
                            onSearch(blob);
                            setIsScanning(false);
                        }, 1500);
                    }
                }, 'image/jpeg');
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsScanning(true);
            const file = e.target.files[0];
            setTimeout(() => {
                onSearch(file);
                setIsScanning(false);
            }, 1500);
        }
    };

    const enableMockMode = () => {
        setError(null);
        setUseMock(true);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            {hasConsented ? (
            <div className="flex flex-col items-center space-y-6 p-4">
                <div className="relative w-full max-w-md aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
                    {!error ? (
                        useMock ? (
                            <div className={`w-full h-full bg-slate-800 flex items-center justify-center transition-opacity duration-300 ${isScanning ? 'opacity-50' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                        ) : (
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isScanning ? 'opacity-50' : ''}`}
                            />
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center bg-slate-900/80 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p className="text-red-400 font-bold mb-4">{error}</p>
                            <button 
                                onClick={enableMockMode} 
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl transition-colors shadow-lg"
                            >
                                Launch Simulator
                            </button>
                        </div>
                    )}
                    
                    {/* Face Scanner Overlay */}
                    <div className={`absolute inset-0 border-[3px] border-blue-500/30 rounded-3xl pointer-events-none transition-all duration-300 ${isScanning ? 'bg-blue-500/10 border-blue-500/50' : ''}`}>
                        <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/3 border-2 border-dashed border-white/40 rounded-[100px] transition-all duration-300" />
                    </div>
                    
                    <AnimatePresence>
                        {isScanning && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col items-center justify-center z-20"
                            >
                                <motion.div 
                                    initial={{ top: '0%' }}
                                    animate={{ top: '100%' }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="absolute w-full h-1 bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,1)]" 
                                />
                                <motion.p 
                                    animate={{ opacity: [1, 0.5, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="mt-4 font-mono text-blue-300 font-bold bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-blue-500/30"
                                >
                                    Scanning Biometrics...
                                </motion.p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <p className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium">
                    Position your face within the frame and tap the button below.
                </p>

                <div className="flex flex-col w-full max-w-xs space-y-3">
                    <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCapture}
                        disabled={(!!error && !useMock) || isScanning}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-600 disabled:to-slate-700 disabled:text-slate-400 text-white font-bold rounded-2xl text-lg shadow-xl shadow-blue-500/20 disabled:shadow-none flex items-center justify-center space-x-2 border border-white/10"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span>{useMock ? "Simulate Scan" : "Scan Face"}</span>
                    </motion.button>
                    
                    <motion.label 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 bg-white/5 dark:bg-slate-800/50 hover:bg-white/10 dark:hover:bg-slate-700/50 backdrop-blur-md text-slate-800 dark:text-slate-200 font-semibold rounded-2xl text-center cursor-pointer border border-slate-200/20 dark:border-white/10 shadow-lg flex items-center justify-center space-x-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <span>Upload Photo</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </motion.label>
                </div>
            </div>
            ) : (
                <div className="flex flex-col items-center space-y-6 p-8 text-center max-w-lg mx-auto">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Biometric Consent</h2>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        To find your photos instantly, ClickFlash will temporarily scan your face to generate a secure biometric vector. 
                        This data is <strong>never saved, stored, or sold</strong> and is immediately deleted after matching your photos.
                    </p>
                    <div className="w-full pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col space-y-3">
                        <button 
                            onClick={() => setHasConsented(true)}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg transition-colors shadow-lg"
                        >
                            I Agree, Find My Photos
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default FaceSearchModal;
