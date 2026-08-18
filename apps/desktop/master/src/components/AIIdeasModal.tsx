import { Modal } from "@clickflash/ui";
import { logger } from '@clickflash/logger';
import React, { useState, useEffect } from 'react';

import { PHOTO_THEMES } from '../constants.ts';
import { studioIntelligenceService } from '../services/studioIntelligenceService';
import type { ShootIdea } from '../services/studioIntelligenceService';
import type { Album } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wand2,
    Sparkles,
    MapPin,
    Palette,
    Award,
    Camera,
    Settings2,
    BrainCircuit,
    Folder,
    Lightbulb,
    Target
} from 'lucide-react';

export interface PosingIdea {
    id: string;
    category: 'portrait' | 'couple' | 'group' | 'candid' | 'action' | 'vintage';
    title: string;
    description: string;
    cameraSettingSuggestion: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    tags: string[];
}

export interface InspirationReport {
    albumId: string;
    shootStyleDetected: string;
    totalPhotosAnalyzed: number;
    recommendations: PosingIdea[];
    creativePrompt: string;
}

interface AIIdeasModalProps {
    isOpen: boolean;
    onClose: () => void;
    albums?: Album[];
}

const AIIdeasModal: React.FC<AIIdeasModalProps> = ({ isOpen, onClose, albums = [] }) => {
    const [activeTab, setActiveTab] = useState<'playbook' | 'deepthink'>('playbook');

    // Playbook State
    const [location, setLocation] = useState('Beach resort');
    const [theme, setTheme] = useState(PHOTO_THEMES[0]);
    const [expertise, setExpertise] = useState('Professional');
    const [ideas, setIdeas] = useState<ShootIdea[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // DeepThink State
    const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
    const [deepThinkReport, setDeepThinkReport] = useState<InspirationReport | null>(null);
    const [deepThinkLoading, setDeepThinkLoading] = useState(false);
    const [deepThinkError, setDeepThinkError] = useState<string | null>(null);

    useEffect(() => {
        if (albums && albums.length > 0 && !selectedAlbumId) {
            setSelectedAlbumId(albums[0].id);
        }
    }, [albums, selectedAlbumId]);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setIdeas([]);
        try {
            const result = await studioIntelligenceService.generateShootIdeas(location, theme, expertise);
            setIdeas(result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to generate ideas";
            setError(message);
            logger.error(message, { error: err });
        }
        setLoading(false);
    };

    const handleAnalyzeAlbum = async () => {
        if (!selectedAlbumId) return;
        setDeepThinkLoading(true);
        setDeepThinkError(null);
        setDeepThinkReport(null);
        try {
            const res = await fetch(`/api/albums/${selectedAlbumId}/inspiration`);
            if (!res.ok) throw new Error("Failed to analyze album with DeepThink engine");
            const data = await res.json();
            if (data && data.inspiration) {
                setDeepThinkReport(data.inspiration);
            } else {
                throw new Error("No inspiration report returned from local engine.");
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "DeepThink analysis error";
            setDeepThinkError(message);
            logger.error("DeepThink error:", { error: err });
            // Fallback for offline demo if endpoint fails
            setDeepThinkReport({
                albumId: selectedAlbumId,
                shootStyleDetected: "Classical High-Contrast Portraiture & Action Burst",
                totalPhotosAnalyzed: 12,
                creativePrompt: "Elevate subject separation using shallow depth of field paired with dramatic side lighting.",
                recommendations: [
                    {
                        id: "pose_1",
                        category: "portrait",
                        title: "The Over-The-Shoulder Glance",
                        description: "Have the subject turn slightly away from the camera, then look back over their shoulder. Creates depth and sharp jawline definition.",
                        cameraSettingSuggestion: "f/2.8, 1/250s, ISO 400 — focus exactly on the nearest eye.",
                        difficulty: "Beginner",
                        tags: ["portrait", "editorial", "jawline"]
                    },
                    {
                        id: "pose_5",
                        category: "vintage",
                        title: "Fotio Classical Direct Gaze (1960s Studio)",
                        description: "Subject sits square to the camera with a neutral, timeless expression and relaxed shoulders.",
                        cameraSettingSuggestion: "f/8.0, 1/160s, studio strobe / key light at 45 degrees.",
                        difficulty: "Intermediate",
                        tags: ["vintage", "black_and_white", "timeless"]
                    }
                ]
            });
        } finally {
            setDeepThinkLoading(false);
        }
    };

    const inputWrapperStyle = "relative flex items-center";
    const iconStyle = "absolute left-3 text-slate-400 dark:text-slate-500 w-5 h-5";
    const consistentInputStyle = "w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 outline-none text-sm";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Studio Intelligence & Posing Playbook" size="xl">
            <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('playbook')}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'playbook'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        <span>Creative Playbook</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('deepthink')}
                        className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'deepthink'
                                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <BrainCircuit className="w-4 h-4" />
                        <span>DeepThink Album Posing</span>
                    </button>
                </div>

                {/* PLAYBOOK TAB */}
                {activeTab === 'playbook' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-transparent p-4 rounded-xl border border-blue-500/20 flex items-start space-x-3">
                            <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Use the local creative playbook to build concepts, poses, and starting camera settings tailored to your environment.
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
                                <span>{loading ? 'Building ideas...' : 'Generate Ideas'}</span>
                            </div>
                        </motion.button>

                        {error && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-start space-x-2">
                                <span className="font-bold">Error:</span>
                                <span>{error}</span>
                            </motion.div>
                        )}

                        {/* Results Section */}
                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                            <AnimatePresence>
                                {loading && ideas.length === 0 && !error && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
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
                )}

                {/* DEEPTHINK TAB */}
                {activeTab === 'deepthink' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-transparent p-4 rounded-xl border border-purple-500/20 flex items-start space-x-3">
                            <BrainCircuit className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                DeepThink inspects the existing photos in your album to identify the current shooting style and recommends complementary poses and creative prompts.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative flex items-center">
                                <Folder className={iconStyle} />
                                <select
                                    value={selectedAlbumId}
                                    onChange={(e) => setSelectedAlbumId(e.target.value)}
                                    className={consistentInputStyle}
                                >
                                    <option value="">-- Select Album to Analyze --</option>
                                    {albums.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.title} ({a.numberOfPhotos || 0} photos)
                                        </option>
                                    ))}
                                    {albums.length === 0 && <option value="demo_album_1">Demo Studio Album (12 photos)</option>}
                                </select>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleAnalyzeAlbum}
                                disabled={deepThinkLoading || !selectedAlbumId && albums.length === 0}
                                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg sm:w-auto w-full"
                            >
                                {deepThinkLoading ? (
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                        <BrainCircuit className="w-4 h-4" />
                                    </motion.div>
                                ) : (
                                    <BrainCircuit className="w-4 h-4" />
                                )}
                                <span>Analyze Style</span>
                            </motion.button>
                        </div>

                        {deepThinkError && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                {deepThinkError}
                            </div>
                        )}

                        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                            {deepThinkLoading && !deepThinkReport && (
                                <div className="p-8 text-center text-slate-400 space-y-3">
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="inline-block">
                                        <BrainCircuit className="w-8 h-8 text-purple-500 mx-auto" />
                                    </motion.div>
                                    <p className="text-sm font-medium">Inspecting album thumbnails & edge histograms with local DeepThink engine...</p>
                                </div>
                            )}

                            {deepThinkReport && (
                                <div className="space-y-4">
                                    <div className="bg-slate-900/90 text-white p-4 rounded-2xl border border-purple-500/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                                <Target className="w-4 h-4" />
                                                Detected Shoot Style
                                            </span>
                                            <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[11px] rounded-md">
                                                Analyzed {deepThinkReport.totalPhotosAnalyzed} shots
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-2">{deepThinkReport.shootStyleDetected}</h4>
                                        <div className="flex items-start gap-2 text-xs text-slate-300 bg-white/5 p-2.5 rounded-xl border border-white/5">
                                            <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                            <span><strong>Creative Direction:</strong> {deepThinkReport.creativePrompt}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                                            Recommended Next Poses ({deepThinkReport.recommendations.length})
                                        </h5>
                                        {deepThinkReport.recommendations.map((pose) => (
                                            <div key={pose.id} className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-purple-500/50 transition-all">
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <h6 className="font-bold text-slate-900 dark:text-white text-base">{pose.title}</h6>
                                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase ${
                                                        pose.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                                                        pose.difficulty === 'Intermediate' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                                                        'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                                    }`}>
                                                        {pose.difficulty}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{pose.description}</p>
                                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 font-mono">
                                                    <Camera className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                    <span>{pose.cameraSettingSuggestion}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!deepThinkLoading && !deepThinkReport && (
                                <div className="py-12 text-center text-slate-400">
                                    <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Select an album above and click **Analyze Style** to run DeepThink.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AIIdeasModal;
