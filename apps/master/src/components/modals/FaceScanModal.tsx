
import React, { useRef, useEffect, useState } from 'react';

interface FaceScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (blob: Blob) => void;
    title: string;
    helperText?: string;
}

const FaceScanModal: React.FC<FaceScanModalProps> = ({ isOpen, onClose, onScan, title, helperText }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async () => {
        setError('');
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Failed to access camera', err);
            setError('Unable to access camera. Please ensure you have granted permission.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            setIsScanning(true);
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        // Small delay to show "Scanning" state
                        setTimeout(() => {
                            onScan(blob);
                            setIsScanning(false);
                        }, 500);
                    } else {
                        setError('Failed to capture image.');
                        setIsScanning(false);
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {title}
                    </h3>
                    <button onClick={onClose} aria-label="Close modal" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col items-center">
                    {helperText && (
                        <p className="text-slate-600 dark:text-slate-300 mb-4 text-center text-sm">{helperText}</p>
                    )}

                    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                        {error ? (
                            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-center p-4">
                                <p>{error}</p>
                            </div>
                        ) : (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover transform scale-x-[-1]"
                                ></video>

                                {/* Scanning Overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="w-64 h-64 border-2 border-white/50 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 custom-dashed-border"></div>
                                    <div className="absolute inset-0 bg-scan-line opacity-10"></div>
                                </div>
                            </>
                        )}

                        {isScanning && (
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center z-10">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-white font-bold mt-2 shadow-sm">Processing...</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden"></canvas>

                    <div className="mt-8 flex gap-4 w-full">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCapture}
                            disabled={!!error || !stream || isScanning}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Capture Frame
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaceScanModal;
