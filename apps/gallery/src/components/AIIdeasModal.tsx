import React, { useState } from 'react';

import { logger } from '@clickflash/logger';

import Modal from './common/Modal';
import { generateShootIdeas } from '../services/creativeAssistantService';
import { PHOTO_THEMES } from '../constants.ts';
import type { ShootIdea } from '../types.ts';

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
            const result = await generateShootIdeas(location, theme, expertise);
            setIdeas(result);
        } catch (err) {
            setError('Failed to generate ideas. Please check the console for details.');
            logger.error('Local idea generation failed', err instanceof Error ? err : new Error(String(err)));
        }
        setLoading(false);
    };

    const consistentInputStyle = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Photoshoot Idea Generator" size="xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label htmlFor="ai-location" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Location</label>
                    <input id="ai-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Beach at sunset" className={consistentInputStyle} />
                </div>
                <div>
                    <label htmlFor="ai-theme" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Theme</label>
                     <select id="ai-theme" value={theme} onChange={(e) => setTheme(e.target.value)} className={consistentInputStyle}>
                        {PHOTO_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="ai-expertise" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Expertise</label>
                     <select id="ai-expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} className={consistentInputStyle}>
                        <option>Professional</option>
                        <option>Amateur</option>
                    </select>
                </div>
            </div>
            <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg mb-6 disabled:bg-slate-500"
            >
                {loading ? 'Generating...' : 'Generate Ideas'}
            </button>
            
            {error && <p className="text-red-500 text-center">{error}</p>}

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {ideas.map((idea, index) => (
                    <div key={index} className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">{idea.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{idea.description}</p>
                        <div className="flex space-x-4 mt-3 text-sm border-t border-slate-200 dark:border-slate-700 pt-3 text-slate-500 dark:text-slate-400">
                            <span>Aperture: {idea.settings.aperture}</span>
                            <span>Shutter: {idea.settings.shutter_speed}</span>
                            <span>ISO: {idea.settings.iso}</span>
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export default AIIdeasModal;
