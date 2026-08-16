import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button, Card, Modal, Input } from '@clickflash/ui';
import { cloudApiService } from '../../services/cloudApiService';

interface GuestOnboardingProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (profileId: string) => void;
}

export const GuestOnboarding: React.FC<GuestOnboardingProps> = ({ isOpen, onClose, onSuccess }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const startCamera = async () => {
        try {
            setError(null);
            setPreviewUrl(null);
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

    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setError(null);
            setIsSubmitting(false);
            setPreviewUrl(null);
            setName('');
            setEmail('');
        } else {
            // Optional: Auto-start camera when modal opens
            // startCamera();
        }
    }, [isOpen, stopCamera]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setPreviewUrl(dataUrl);
            stopCamera();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setPreviewUrl(event.target?.result as string);
                stopCamera();
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const resetSelection = () => {
        setPreviewUrl(null);
        startCamera();
    };

    const handleSubmit = async () => {
        if (!previewUrl) {
            setError('Please capture or upload a selfie to continue.');
            return;
        }

        if (!name.trim() || !email.trim()) {
            setError('Please provide your name and email.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            
            // Note: cloudApiService might not have createProfile exactly like this, this is a mock representation
            // Ideally we convert dataUrl to Blob for upload
            const response = await fetch(previewUrl);
            const blob = await response.blob();
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            
            // Assume cloudApiService has a way to upload and create profile
            // const result = await cloudApiService.createGuestProfile({ name, email, file });
            
            // Mocking success
            setTimeout(() => {
                onSuccess('guest-profile-' + Date.now());
                setIsSubmitting(false);
                onClose();
            }, 1000);
            
        } catch (err) {
            setError('Failed to create profile. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Guest Onboarding" size="lg">
            <div className="flex flex-col space-y-6 p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Welcome!</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Let's set up your profile. Take a selfie so we can automagically find your photos!
                    </p>
                </div>

                <div className="flex flex-col space-y-4 max-w-md mx-auto w-full">
                    <Input 
                        placeholder="Full Name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                    />
                    <Input 
                        type="email" 
                        placeholder="Email Address" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                    />
                </div>

                <div className="flex flex-col items-center justify-center space-y-4">
                    {!previewUrl ? (
                        <div className="relative w-full max-w-md aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
                            {isCameraActive ? (
                                <>
                                    <video 
                                        ref={videoRef} 
                                        className="absolute inset-0 w-full h-full object-cover"
                                        playsInline
                                    />
                                    <div className="absolute bottom-4 flex space-x-4">
                                        <Button onClick={capturePhoto} variant="primary">
                                            Capture Selfie
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center space-y-4 p-6">
                                    <div className="flex space-x-4">
                                        <Button onClick={startCamera} variant="primary">
                                            Open Camera
                                        </Button>
                                        <Button onClick={triggerFileInput} variant="outline">
                                            Upload Photo
                                        </Button>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleFileUpload} 
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative w-full max-w-md aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                            <img src={previewUrl} alt="Selfie Preview" className="absolute inset-0 w-full h-full object-cover" />
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
                                <Button onClick={resetSelection} variant="secondary">
                                    Retake
                                </Button>
                            </div>
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {error && (
                    <div className="text-red-500 text-sm text-center font-medium bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                        {error}
                    </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                    <Button variant="outline" onClick={onClose} className="mr-3">
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !previewUrl || !name || !email}
                    >
                        {isSubmitting ? 'Setting up...' : 'Complete Setup'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default GuestOnboarding;
