
import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal.tsx';

interface FaceSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (image: Blob) => void;
}

const FaceSearchModal: React.FC<FaceSearchModalProps> = ({ isOpen, onClose, onSearch }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [useMock, setUseMock] = useState(false);

    useEffect(() => {
        if (isOpen && !useMock) {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, useMock]);

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
            console.warn("Device enumeration skipped or failed:", e);
        }

        try {
            // Try requesting the user-facing camera first
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            handleStreamSuccess(mediaStream);
        } catch (err: any) {
            console.warn("Specific camera constraint failed, retrying with generic...", err);
            
            // Fallback: Try any available video device
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                handleStreamSuccess(mediaStream);
            } catch (fallbackErr: any) {
                console.error("Camera access error:", fallbackErr);
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
        <Modal isOpen={isOpen} onClose={onClose} title="Find Your Photos by Face" size="lg">
            <div className="flex flex-col items-center space-y-6 p-4">
                <div className="relative w-full max-w-md aspect-[3/4] bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
                    {!error ? (
                        useMock ? (
                            <div className={`w-full h-full bg-slate-200 flex items-center justify-center ${isScanning ? 'opacity-50' : ''}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                        ) : (
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`w-full h-full object-cover transform scale-x-[-1] ${isScanning ? 'opacity-50' : ''}`}
                            />
                        )
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center bg-slate-900">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <p className="text-red-400 font-bold mb-4">{error}</p>
                            <button 
                                onClick={enableMockMode} 
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg"
                            >
                                Launch Simulator
                            </button>
                        </div>
                    )}
                    
                    {/* Face Scanner Overlay */}
                    <div className={`absolute inset-0 border-2 border-blue-500/50 rounded-2xl pointer-events-none ${isScanning ? 'animate-pulse bg-blue-500/10' : ''}`}>
                        <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/3 border-2 border-dashed border-white/50 rounded-full"></div>
                    </div>
                    
                    {isScanning && (
                         <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                            <div className="w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-[scanner-line-anim_1.5s_ease-in-out_infinite]"></div>
                            <p className="mt-4 font-mono text-blue-400 font-bold bg-black/50 px-3 py-1 rounded">Scanning Biometrics...</p>
                         </div>
                    )}
                    
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
                    Position your face within the frame and tap the button below.
                </p>

                <div className="flex flex-col w-full max-w-xs space-y-3">
                    <button 
                        onClick={handleCapture}
                        disabled={(!!error && !useMock) || isScanning}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold rounded-xl text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center space-x-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span>{useMock ? "Simulate Scan" : "Scan Face"}</span>
                    </button>
                    
                    <label className="w-full py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold rounded-xl text-center cursor-pointer transition-colors">
                        <span>Upload Photo</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                </div>
            </div>
        </Modal>
    );
};

export default FaceSearchModal;
