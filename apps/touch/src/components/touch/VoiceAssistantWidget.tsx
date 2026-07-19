import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceAssistantWidgetProps {
    isListening: boolean;
    isSpeaking: boolean;
    transcript: string;
    onListen: () => void;
}

export const VoiceAssistantWidget: React.FC<VoiceAssistantWidgetProps> = ({
    isListening,
    isSpeaking,
    transcript,
    onListen
}) => {
    const isActive = isListening || isSpeaking;

    return (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-4">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onListen}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl backdrop-blur-xl border transition-colors ${
                    isActive 
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                        : 'bg-slate-900/60 border-slate-700/50 text-slate-300 hover:text-white hover:border-slate-500'
                }`}
            >
                {/* Voice Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>

                {/* Pulse Ring when Active */}
                {isActive && (
                    <motion.div
                        className="absolute inset-0 rounded-full border-2 border-cyan-500"
                        animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                    />
                )}
            </motion.button>

            <AnimatePresence>
                {isActive && transcript && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.9 }}
                        className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/30 text-white px-6 py-4 rounded-2xl shadow-2xl max-w-sm"
                    >
                        <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1">
                            {isListening ? 'Listening...' : 'Processing...'}
                        </div>
                        <div className="text-lg font-light leading-snug">
                            "{transcript}"
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
