import React, { useState, useCallback, useEffect } from 'react';
import { faceService } from '../../services/api/faceService';
import FaceScanModal from '../modals/FaceScanModal';
import { logger } from '../../utils/logger';

interface FaceEnrollmentSectionProps {
    userId: string;
    userName: string;
    hasFaceRegistered: boolean;
    onEnrollmentComplete?: () => void;
}

const FaceEnrollmentSection: React.FC<FaceEnrollmentSectionProps> = ({
    userId,
    userName,
    hasFaceRegistered: initialHasFace,
    onEnrollmentComplete
}) => {
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [hasFace, setHasFace] = useState(initialHasFace);

    useEffect(() => {
        setHasFace(initialHasFace);
    }, [initialHasFace]);

    const handleFaceCapture = useCallback(async (blob: Blob) => {
        setIsScanModalOpen(false);
        setIsLoading(true);
        setMessage(null);

        try {
            await faceService.registerFace(blob, userId);
            setHasFace(true);
            setMessage({
                type: 'success',
                text: `Face registered successfully for ${userName}. They can now log in with Face ID.`
            });
            onEnrollmentComplete?.();
            logger.info(`Face enrolled for user ${userId}`);
        } catch (error: any) {
            const errorText = error.message || 'Failed to register face';
            setMessage({ type: 'error', text: errorText });
            logger.error('Face enrollment failed', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, userName, onEnrollmentComplete]);

    const handleEnrollClick = () => {
        setMessage(null);
        setIsScanModalOpen(true);
    };

    return (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center">
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-2 text-blue-500" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                >
                    <path 
                        fillRule="evenodd" 
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
                        clipRule="evenodd" 
                    />
                </svg>
                Face ID Authentication
            </h3>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            hasFace 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                            {hasFace ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {hasFace ? 'Face ID Registered' : 'Face ID Not Registered'}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {hasFace 
                                    ? `${userName} can log in using face recognition` 
                                    : `Register ${userName}'s face to enable Face ID login`}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleEnrollClick}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                            hasFace
                                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" clipRule="evenodd" />
                                    <path fillRule="evenodd" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span>{hasFace ? 'Re-enroll Face' : 'Enroll Face'}</span>
                            </>
                        )}
                    </button>
                </div>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg flex items-start space-x-2 ${
                        message.type === 'success' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                                message.type === 'success' ? 'text-emerald-500' : 'text-red-500'
                            }`}
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                        >
                            {message.type === 'success' ? (
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            ) : (
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            )}
                        </svg>
                        <p className={`text-sm ${
                            message.type === 'success' ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200'
                        }`}>
                            {message.text}
                        </p>
                    </div>
                )}

                <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                    <p className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Face data is stored securely and used only for authentication purposes.
                    </p>
                </div>
            </div>

            <FaceScanModal
                isOpen={isScanModalOpen}
                onClose={() => setIsScanModalOpen(false)}
                onScan={handleFaceCapture}
                title={`Enroll Face for ${userName}`}
                helperText="Position your face within the circle and ensure good lighting. Click Capture to register."
            />
        </div>
    );
};

export default FaceEnrollmentSection;
