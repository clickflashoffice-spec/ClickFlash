import React, { useState, useEffect } from 'react';
import { ManualEdits } from '@/types';
import { FILTER_PRESETS } from '@/utils/imageFilters';
import { PresetManager, Preset } from '../utils/PresetManager';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { PresetSaveModal } from './PresetSaveModal';

interface PresetsPanelProps {
    currentEdits: ManualEdits;
    onApplyPreset: (edits: Partial<ManualEdits>) => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({
    currentEdits,
    onApplyPreset
}) => {
    const [userPresets, setUserPresets] = useState<Preset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    useEffect(() => {
        loadPresets();
    }, []);

    const loadPresets = async () => {
        setIsLoading(true);
        const presets = await PresetManager.getPresets();
        setUserPresets(presets);
        setIsLoading(false);
    };

    const handleSavePreset = async (name: string, description?: string) => {
        const newPreset = await PresetManager.savePreset({
            name,
            description,
            adjustments: { ...currentEdits },
            category: 'User'
        });

        if (newPreset) {
            setUserPresets(prev => [newPreset, ...prev]);
        }
    };

    const handleDeletePreset = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this preset?')) {
            const success = await PresetManager.deletePreset(id);
            if (success) {
                setUserPresets(prev => prev.filter(p => p.id !== id));
            }
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Presets & Filters
                </h3>
                <button
                    onClick={() => setIsSaveModalOpen(true)}
                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                    title="Save current edits as preset"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-gray-200">
                {/* User Presets Section */}
                <section>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">User Presets</h4>
                    {isLoading ? (
                        <div className="grid grid-cols-2 gap-2 animate-pulse">
                            {[1, 2].map(i => (
                                <div key={i} className="h-24 bg-gray-100 rounded-xl" />
                            ))}
                        </div>
                    ) : userPresets.length === 0 ? (
                        <div className="text-center py-6 px-4 border-2 border-dashed border-gray-100 rounded-xl">
                            <p className="text-xs text-gray-400">No custom presets yet. Create one with the + button above.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {userPresets.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => onApplyPreset(preset.adjustments)}
                                    className="group relative p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all text-left"
                                >
                                    <div className="text-xs font-semibold text-gray-900 mb-1 truncate pr-6">{preset.name}</div>
                                    <div className="text-[10px] text-gray-500 line-clamp-2">{preset.description || 'Custom settings'}</div>
                                    
                                    <button
                                        onClick={(e) => handleDeletePreset(e, preset.id)}
                                        className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* Built-in Filters Section */}
                <section>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Cinema Filters</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {FILTER_PRESETS.map(preset => (
                            <button
                                key={preset.name}
                                onClick={() => onApplyPreset(preset.edits)}
                                className="relative group p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all text-left overflow-hidden"
                            >
                                <div 
                                    className="absolute inset-0 opacity-5 bg-gradient-to-br from-blue-500 to-purple-500 pointer-events-none"
                                />
                                <div className="relative">
                                    <div className="text-xs font-semibold text-gray-900 mb-1">{preset.name}</div>
                                    <div className="flex gap-1">
                                        {Object.keys(preset.edits).slice(0, 3).map(k => (
                                            <div key={k} className="w-1 h-3 bg-blue-400/20 rounded-full" />
                                        ))}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            <PresetSaveModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSavePreset}
            />
        </div>
    );
};
