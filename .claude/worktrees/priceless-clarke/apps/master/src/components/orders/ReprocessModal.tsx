import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Modal from '../common/Modal';
import { SliderControl } from '../common/SliderControl';
import { Photo, ManualEdits, Order, OrderItem } from '../../types';
import { initialEdits } from '../../constants/photoConstants';
import { getPhotoStyle } from '../../utils/styleUtils';
import { EditEngine } from '../../utils/canvas/EditEngine';
import { useHiResLoader } from '../../utils/hiResLoader';
import { apiService } from '../../services/apiService';
import Spinner from '../common/Spinner';

interface ReprocessModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
    initialItemId?: string;
    showToast: (message: string) => void;
}

/**
 * ReprocessModal
 * 
 * High-fidelity photo editor for post-order reprocessing.
 * Allows staff to fine-tune edits and trigger a re-render + reprint.
 */
const ReprocessModal: React.FC<ReprocessModalProps> = ({
    isOpen,
    onClose,
    order,
    initialItemId,
    showToast
}) => {
    const [activeItemId, setActiveItemId] = useState<string | null>(initialItemId || order.items[0]?.id || null);
    const activeItem = useMemo(() => order.items.find(i => i.id === activeItemId), [order.items, activeItemId]);
    const photo = activeItem?.photo;

    const [edits, setEdits] = useState<ManualEdits>(photo?.manualEdits || initialEdits);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRetouching, setIsRetouching] = useState(false);
    const [brushSize, setBrushSize] = useState(30);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<EditEngine | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Hi-Res Background Loader
    const { hiResBlob, isLoading: isHiResLoading } = useHiResLoader(photo?.id || null, photo?.url || null);

    // Initialize Engine
    useEffect(() => {
        if (canvasRef.current && !engineRef.current) {
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (ctx) engineRef.current = new EditEngine(ctx);
        }
    }, [isOpen]);

    // Update edits when active photo changes
    useEffect(() => {
        if (photo) {
            setEdits(photo.manualEdits || initialEdits);
        }
    }, [photo]);

    // Render Preview
    const renderPreview = useCallback(async () => {
        if (!engineRef.current || !imageRef.current || !canvasRef.current) return;

        // Ensure canvas matches image aspect ratio but stays within container
        const canvas = canvasRef.current;
        const img = imageRef.current;

        // Logical sizing
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        await engineRef.current.render(img, edits);
    }, [edits]);

    // Effect to trigger render when edits or image changes
    useEffect(() => {
        renderPreview();
    }, [renderPreview, hiResBlob]);

    const handleEditChange = (updates: Partial<ManualEdits>) => {
        setEdits(prev => ({ ...prev, ...updates }));
    };

    const handleRetouchClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isRetouching || !canvasRef.current || !imageRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Simple healing: use a nearby patch as source
        const newAction = {
            id: `heal-${Date.now()}`,
            type: 'heal' as const,
            x,
            y,
            radius: brushSize,
            sourceX: x + brushSize * 2, // Default offset
            sourceY: y,
            timestamp: Date.now()
        };

        const newActions = [...(edits.retouchActions || []), newAction];
        handleEditChange({ retouchActions: newActions });
    };

    const handleRegenerateAndReprint = async () => {
        if (!photo || !activeItem) return;

        setIsProcessing(true);
        try {
            // 1. Save Edits to Photo record
            await apiService.updatePhoto(photo.id, {
                manualEdits: edits,
                metadata: {
                    ...photo.metadata,
                    manualEdits: edits
                }
            });

            // 2. Trigger Reprint
            await apiService.printOrderPhoto(order.id, photo.id);

            showToast('Reprocessed and enqueued for reprint!');
        } catch (error: any) {
            console.error('Reprocess failed:', error);
            showToast(`Reprocess failed: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!activeItem) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reprocess: ${photo?.title || 'Order Item'}`} size="xl">
            <div className="flex flex-col lg:flex-row gap-6 h-[70vh]">
                {/* Viewport Area */}
                <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-2xl">
                    {/* Background Preview (Hidden, used for engine) */}
                    <img
                        ref={imageRef}
                        src={hiResBlob ? URL.createObjectURL(hiResBlob) : photo?.url}
                        alt="Source"
                        className="hidden"
                        onLoad={renderPreview}
                    />

                    {/* Interactive Canvas */}
                    <canvas
                        ref={canvasRef}
                        onClick={handleRetouchClick}
                        className={`max-w-full max-h-full object-contain shadow-2xl ${isRetouching ? 'cursor-crosshair' : 'cursor-default'}`}
                        style={getPhotoStyle({ ...edits, retouchActions: [] })} // Apply CSS filters for real-time feel, exclude retouch as it's baked
                    />

                    {/* Overlay UI */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${isHiResLoading ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-green-500/20 border-green-500/50 text-green-500'}`}>
                            {isHiResLoading ? `Loading Hi-Res...` : 'Hi-Res Active'}
                        </div>
                    </div>

                    {isProcessing && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                            <Spinner size="large" />
                            <p className="mt-4 font-bold text-white uppercase tracking-widest animate-pulse">Processing Edits...</p>
                        </div>
                    )}
                </div>

                {/* Control Sidebar */}
                <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    {/* Retouch Section */}
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex justify-between items-center">
                            Smart Retouch
                            {isRetouching && <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />}
                        </h4>

                        <button
                            onClick={() => setIsRetouching(!isRetouching)}
                            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all transform active:scale-95 border ${isRetouching
                                ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-600/30'
                                : 'bg-slate-700/50 border-white/10 text-slate-300 hover:bg-slate-700'}`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            {isRetouching ? 'Stop Spot Healing' : 'Start Spot Healing'}
                        </button>

                        {isRetouching && (
                            <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                <SliderControl
                                    label="Brush Size"
                                    value={brushSize}
                                    onChange={setBrushSize}
                                    min={5}
                                    max={100}
                                    unit="px"
                                />
                                <p className="text-[9px] text-slate-500 italic mt-2 text-center">Click on canvas to heal spots</p>
                            </div>
                        )}

                        {/* Recent Fixes List */}
                        {(edits.retouchActions?.length ?? 0) > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Recent Fixes</span>
                                    <button
                                        onClick={() => handleEditChange({ retouchActions: [] })}
                                        className="text-[9px] text-red-400 hover:underline"
                                    >Clear All</button>
                                </div>
                                <div className="max-h-20 overflow-y-auto space-y-1">
                                    {edits.retouchActions?.slice().reverse().map((action, i) => (
                                        <div key={action.id} className="text-[10px] bg-white/5 rounded p-1.5 flex justify-between items-center group">
                                            <span className="text-slate-400">Fix #{edits.retouchActions!.length - i}</span>
                                            <button
                                                onClick={() => {
                                                    const next = edits.retouchActions?.filter(a => a.id !== action.id);
                                                    handleEditChange({ retouchActions: next });
                                                }}
                                                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >Remove</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Adjustments Section */}
                    <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5 backdrop-blur-md">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Precision Adjust</h4>
                        <div className="space-y-4">
                            <SliderControl label="Exposure" value={edits.exposure} onChange={v => handleEditChange({ exposure: v })} isModified={edits.exposure !== 0} />
                            <SliderControl label="Contrast" value={edits.contrast} onChange={v => handleEditChange({ contrast: v })} isModified={edits.contrast !== 0} />
                            <SliderControl label="Highlights" value={edits.highlights} onChange={v => handleEditChange({ highlights: v })} isModified={edits.highlights !== 0} />
                            <SliderControl label="Shadows" value={edits.shadows} onChange={v => handleEditChange({ shadows: v })} isModified={edits.shadows !== 0} />
                            <SliderControl label="Saturation" value={edits.saturate} onChange={v => handleEditChange({ saturate: v })} isModified={edits.saturate !== 0} />
                            <SliderControl label="Temperature" value={edits.temperature} onChange={v => handleEditChange({ temperature: v })} isModified={edits.temperature !== 0} />
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleRegenerateAndReprint}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 transition-all transform active:scale-95 disabled:grayscale disabled:cursor-wait flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Regenerate & Reprint
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ReprocessModal;
