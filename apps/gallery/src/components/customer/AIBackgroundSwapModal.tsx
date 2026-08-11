import React, { useState, useEffect } from 'react';
import { Modal } from '@clickflash/ui';
import { Image, Sliders, Wand2, Download, Check } from 'lucide-react';
import type { Photo } from '../../types';

interface AIBackgroundSwapModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: Photo | null;
    onSave: (newUrl: string) => void;
}

const BACKGROUNDS = [
    { id: 'tropical', name: 'Tropical Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
    { id: 'yacht', name: 'Luxury Yacht Deck', url: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=600&q=80' },
    { id: 'mountain', name: 'Mountain Sunset', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80' },
    { id: 'studio', name: 'Classic Studio Backdrop', url: 'https://images.unsplash.com/photo-1503694978374-8a2fa686963a?auto=format&fit=crop&w=600&q=80' }
];

const AIBackgroundSwapModal: React.FC<AIBackgroundSwapModalProps> = ({ isOpen, onClose, photo, onSave }) => {
    const [selectedBg, setSelectedBg] = useState<string>(BACKGROUNDS[0].id);
    const [blendIntensity, setBlendIntensity] = useState<number>(50);
    const [colorMatch, setColorMatch] = useState<boolean>(true);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isSaved, setIsSaved] = useState<boolean>(false);
    
    // Reset state when opening modal with a new photo
    useEffect(() => {
        if (isOpen) {
            setSelectedBg(BACKGROUNDS[0].id);
            setBlendIntensity(50);
            setColorMatch(true);
            setIsSaved(false);
            setIsProcessing(true);
            
            // Simulate segment anything isolation time
            const timer = setTimeout(() => {
                setIsProcessing(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, photo]);

    const handleSave = () => {
        setIsProcessing(true);
        // Simulate processing time
        setTimeout(() => {
            setIsProcessing(false);
            setIsSaved(true);
            setTimeout(() => {
                onSave(photo?.url || '');
                onClose();
            }, 1000);
        }, 2000);
    };

    if (!photo) return null;

    const currentBg = BACKGROUNDS.find(bg => bg.id === selectedBg);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AI Background Swap" size="xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                {/* Preview Area */}
                <div className="flex flex-col gap-4">
                    <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl flex items-center justify-center">
                        {isProcessing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-20">
                                <Wand2 className="w-12 h-12 text-cyan-400 animate-pulse mb-4" />
                                <p className="text-lg font-bold text-white tracking-widest uppercase">Segmenting Subject</p>
                                <p className="text-sm text-cyan-400 mt-2">Powered by Segment Anything</p>
                            </div>
                        ) : null}
                        
                        {/* Background */}
                        <div 
                            className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                            style={{ 
                                backgroundImage: `url(${currentBg?.url})`,
                                filter: colorMatch ? 'contrast(1.1) saturate(1.2)' : 'none'
                            }}
                        />
                        
                        {/* Foreground Subject Simulation */}
                        <div 
                            className="absolute inset-0 bg-contain bg-center bg-no-repeat transition-all duration-500"
                            style={{ 
                                backgroundImage: `url(${photo.url})`,
                                // Simulating isolation with CSS
                                mixBlendMode: 'normal',
                                opacity: 1,
                                filter: `drop-shadow(0 10px 20px rgba(0,0,0,${blendIntensity / 100}))`
                            }}
                        />
                    </div>
                </div>

                {/* Controls Area */}
                <div className="flex flex-col gap-6">
                    <div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Image className="w-4 h-4 text-cyan-400" />
                            Select Scene
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {BACKGROUNDS.map((bg) => (
                                <button
                                    key={bg.id}
                                    onClick={() => setSelectedBg(bg.id)}
                                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                                        selectedBg === bg.id ? 'border-cyan-400 scale-105 shadow-[0_0_15px_rgba(34,211,238,0.3)] z-10' : 'border-slate-700 opacity-70 hover:opacity-100'
                                    }`}
                                >
                                    <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                                        <span className="text-xs font-bold text-white leading-tight">{bg.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-5 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-cyan-400" />
                            AI Adjustments
                        </h3>
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs text-slate-400 font-medium">Blend Intensity</label>
                                <span className="text-xs text-cyan-400 font-bold">{blendIntensity}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={blendIntensity}
                                onChange={(e) => setBlendIntensity(Number(e.target.value))}
                                className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label className="text-sm text-slate-300 font-medium">Smart Color Match</label>
                            <button
                                type="button"
                                onClick={() => setColorMatch(!colorMatch)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    colorMatch ? 'bg-cyan-500' : 'bg-slate-700'
                                }`}
                            >
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    colorMatch ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-800 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors uppercase tracking-widest text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all uppercase tracking-widest text-sm ${
                                isSaved 
                                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' 
                                    : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20'
                            }`}
                        >
                            {isSaved ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Saved to Gallery
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" />
                                    {isProcessing ? 'Processing...' : 'Save & Download'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AIBackgroundSwapModal;
