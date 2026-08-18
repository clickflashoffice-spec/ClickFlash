import React from 'react';
import { motion } from 'framer-motion';

interface SendingProgressOverlayProps {
    open: boolean;
    progress: number;
    message: string;
    current: number;
    total: number;
    destination?: string;
}

const SendingProgressOverlay: React.FC<SendingProgressOverlayProps> = ({
    open,
    progress,
    message: _message,
    current,
    total,
    destination
}) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center backdrop-blur-md">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 animate-fadeIn">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sending to Kiosk</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">Copying photos to {destination}<br /><span className="font-mono text-xs opacity-75">{destination}</span></p>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 mb-3 overflow-hidden">
                        <motion.div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.max(5, progress)}%` }} />
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{current} of {total} Photos</p>
                </div>
            </div>
        </div>
    );
};

export default SendingProgressOverlay;
