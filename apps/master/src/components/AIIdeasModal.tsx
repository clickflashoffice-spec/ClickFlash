import { logger } from '@clickflash/logger';
import React, { useState } from 'react';
import Modal from './common/Modal';
import { PHOTO_THEMES } from '../constants.ts';
import { geminiAgentService, ShootIdea } from '../services/geminiAgentService';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles, MapPin, Palette, Award, Camera, Settings2 } from 'lucide-react';

const AIIdeasModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [location, setLocation] = useState('Beach resort');
    const [theme, setTheme] = useState(PHOTO_THEMES[0]);
    const [expertise, setExpertise] = useState('Professional');
    const [ideas, setIdeas] = useState<ShootIdea[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setIdeas([]);
        try {
            const result = await geminiAgentService.generateShootIdeas(location, theme, expertise);
            setIdeas(result);
        } catch (err: any) {
            const message = err instanceof Error ? err.message : "Failed to generate ideas";
            setError(message);
            logger.error(message);
            logger.error(message, { error: err });
        }
        setLoading(false);
    };

    const inputWrapperStyle = "relative flex items-center";
    const iconStyle = "absolute left-3 text-slate-400 dark:text-slate-500 w-5 h-5";
    const consistentInputStyle = "w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Photoshoot Idea Generator" size="xl">
            <div className="space-y-6">
                {/* Header Description */}
                <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent p-4 rounded-xl border border-blue-500/20 flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Let AI inspire your next session. Configure the parameters below and we'll generate creative concepts, poses, and camera settings tailored to your environment.
                    </p>
                </div>

                {/* Input Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                        <label htmlFor="ai-location" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Location</label>
                        <div className={inputWrapperStyle}>
                            <MapPin className={iconStyle} />
                            <input id="ai-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Beach at sunset" className={consistentInputStyle} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="ai-theme" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Theme</label>
                        <div className={inputWrapperStyle}>
                            <Palette className={iconStyle} />
                            <select id="ai-theme" value={theme} onChange={(e) => setTheme(e.target.value)} className={consistentInputStyle}>
                                {PHOTO_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="ai-expertise" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Expertise</label>
                        <div className={inputWrapperStyle}>
                            <Award className={iconStyle} />
                            <select id="ai-expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} className={consistentInputStyle}>
                                <option>Professional</option>
                                <option>Amateur</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerate}
                    disabled={loading}
                    className="relative w-full overflow-hidden group bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3.5 px-4 rounded-xl disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                    <div className="flex items-center justify-center space-x-2">
                        {loading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <Sparkles className="w-5 h-5" />
                            </motion.div>
                        ) : (
                            <Wand2 className="w-5 h-5" />
                        )}
                        <span>{loading ? 'Consulting the Oracle...' : 'Generate Magic'}</span>
                    </div>
                </motion.button>

                {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start space-x-2">
                        <span className="font-bold">Error:</span>
                        <span>{error}</span>
                    </motion.div>
                )}

                {/* Results Section */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence>
                        {loading && ideas.length === 0 && !error && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-4"
                            >
                                {[1, 2].map(i => (
                                    <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                                        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-md w-1/3 mb-3"></div>
                                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-full mb-2"></div>
                                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-5/6 mb-4"></div>
                                        <div className="flex gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-20"></div>
                                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-20"></div>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {!loading && ideas.map((idea, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {idea.title}
                                    </h3>
                                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Camera className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                                    {idea.description}
                                </p>
                                <div className="flex flex-wrap gap-3 mt-4 text-xs font-medium border-t border-slate-100 dark:border-slate-700/50 pt-4">
                                    <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        <span>ƒ/{idea.settings?.aperture}</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        <span>{idea.settings?.shutter_speed}s</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        <span>ISO {idea.settings?.iso}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </Modal>
    );
};

export default AIIdeasModal;
