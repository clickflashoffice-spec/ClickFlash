
import React, { useState, useRef, useEffect } from 'react';
import { Photo, PhotoCategory, ManualEdits, Album } from '../../../types.ts';

const PHOTO_CATEGORIES: PhotoCategory[] = ['Beach & Pool', 'Photo Session', 'Evening', 'Activities', 'Restaurant'];

type FilterName = 'vintage' | 'blackAndWhite' | 'cool' | 'warm' | 'sepia';

interface EditorSidebarProps {
    activePhoto: Photo | null;
    selectedPhotoIds: Set<string>;
    onManualEditChange: (updates: Partial<ManualEdits>) => void;
    onQuickRotate: (direction: 'left' | 'right') => void;
    onCategorizeSelected: (category: PhotoCategory) => void;
    onSendToKiosk: () => void;
    isEditing: boolean;
    onAIEdit: (prompt: string) => void;
    onAutoAdjust: () => void;
    onApplyFilter: (filterName: FilterName) => void;
    onResetEdits: () => void;
    onCopyEdits: () => void;
    onPasteEdits: () => void;
    canPaste: boolean;
    albumDetails: Album;
    onAlbumDetailsChange: (updater: React.SetStateAction<Album>) => void;
    onDeleteSelected: () => void;
    isOnline: boolean;
    isCropping: boolean;
    onToggleCrop: () => void;
    onApplyCrop: () => void;
}

/**
 * SliderControl Component
 * 
 * Reusable slider control for photo edit adjustments.
 * 
 * Features:
 * - Double-click to reset to 0
 * - Real-time value display
 * - Configurable min/max/step
 * - Unit display (%, °, px, etc.)
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Control label
 * @param {number} props.value - Current value
 * @param {(value: number) => void} props.onChange - Change handler
 * @param {number} [props.min=-100] - Minimum value
 * @param {number} [props.max=100] - Maximum value
 * @param {number} [props.step=1] - Step increment
 * @param {string} [props.unit=''] - Unit to display (%, °, px, etc.)
 * @param {boolean} [props.disabled=false] - Whether control is disabled
 */
const SliderControl: React.FC<{ 
    label: string; 
    value: number; 
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    disabled?: boolean;
    showQuickButtons?: boolean;
    showNumericInput?: boolean;
    isModified?: boolean;
    defaultValue?: number;
}> = ({ 
    label, 
    value, 
    onChange, 
    min = -100, 
    max = 100, 
    step = 1, 
    unit = '', 
    disabled = false,
    showQuickButtons = true,
    showNumericInput = true,
    isModified = false,
    defaultValue = 0
}) => {
    const [inputValue, setInputValue] = useState(value.toString());
    const sliderRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const percentage = ((value - min) / (max - min)) * 100;

    useEffect(() => {
        setInputValue(value.toFixed(step < 1 ? 1 : 0));
    }, [value, step]);

    const clampValue = (val: number): number => {
        return Math.max(min, Math.min(max, val));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue)) {
            onChange(clampValue(numValue));
        }
    };

    const handleInputBlur = () => {
        const numValue = parseFloat(inputValue);
        if (isNaN(numValue)) {
            setInputValue(value.toFixed(step < 1 ? 1 : 0));
        } else {
            onChange(clampValue(numValue));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;
        if (e.target === sliderRef.current || e.target === inputRef.current) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const increment = e.shiftKey ? step * 10 : (e.ctrlKey || e.metaKey) ? step * 100 : step;
                const direction = e.key === 'ArrowUp' ? 1 : -1;
                onChange(clampValue(value + (increment * direction)));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (e.target === inputRef.current) {
                    inputRef.current?.blur();
                }
            }
        }
    };

    const quickAdjust = (delta: number) => {
        if (disabled) return;
        onChange(clampValue(value + delta));
    };

    const resetValue = () => {
        if (disabled) return;
        onChange(defaultValue);
    };

    return (
        <div className="group">
            <div className="flex justify-between items-baseline mb-1">
                <label className={`block text-xs font-semibold flex items-center gap-1.5 ${disabled ? 'text-slate-400 dark:text-slate-500' : isModified ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                    {label}
                    {isModified && !disabled && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" title="Modified from default" />
                    )}
                </label>
                {showNumericInput ? (
                    <div className="flex items-center gap-1">
                        <input
                            ref={inputRef}
                            type="number"
                            min={min}
                            max={max}
                            step={step}
                            value={inputValue}
                            onChange={handleInputChange}
                            onBlur={handleInputBlur}
                            onKeyDown={handleKeyDown}
                            disabled={disabled}
                            className="w-14 text-xs font-mono text-right px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label={`${label} value`}
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
                    </div>
                ) : (
                    <span className={`text-xs font-mono font-bold w-14 text-right px-2 py-0.5 rounded ${value !== 0 || isModified ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {value}{unit}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                <div className="flex-1 relative">
                    <input
                        ref={sliderRef}
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className={`slider-modern w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                            isModified && !disabled ? 'ring-1 ring-blue-400 dark:ring-blue-500' : ''
                        }`}
                        onDoubleClick={resetValue}
                        aria-label={label}
                        title={`${label}: ${value}${unit}. Use arrow keys to adjust. Double-click to reset.`}
                        style={{
                            background: disabled
                                ? undefined
                                : `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${percentage}%, rgb(226 232 240) ${percentage}%, rgb(226 232 240) 100%)`
                        }}
                    />
                </div>
                {showQuickButtons && !disabled && (
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => quickAdjust(-10)}
                            className="px-1 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Decrease by 10"
                        >
                            -10
                        </button>
                        <button
                            onClick={() => quickAdjust(10)}
                            className="px-1 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Increase by 10"
                        >
                            +10
                        </button>
                        {value !== defaultValue && (
                            <button
                                onClick={resetValue}
                                className="px-1 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Reset to default"
                            >
                                ↺
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * EditorSidebar Component
 * 
 * Sidebar component for the photo editor, providing controls for:
 * - Album details editing
 * - Batch photo operations (copy/paste edits, delete, categorize)
 * - Manual photo adjustments (exposure, contrast, saturation, etc.)
 * - Transform operations (rotate, crop, straighten)
 * - AI-powered generative editing
 * - Filter presets
 * 
 * Features:
 * - Real-time edit preview
 * - Batch editing support
 * - Edit validation
 * - Control state management
 * - Copy/paste edit operations
 * 
 * @param {EditorSidebarProps} props - Component props
 */
const initialEdits: ManualEdits = {
    exposure: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    saturate: 0,
    vibrance: 0,
    grayscale: 0,
    sepia: 0,
    invert: 0,
    hueRotate: 0,
    temperature: 0,
    tint: 0,
    whites: 0,
    blacks: 0,
    soften: 0,
    rotate: 0,
    straighten: 0,
    perspectiveX: 0,
    perspectiveY: 0,
    clarity: 0,
    dropShadow: 0,
    vignette: 0,
};

const EditorSidebar: React.FC<EditorSidebarProps> = (props) => {
    const {
        activePhoto, selectedPhotoIds, onManualEditChange, onQuickRotate, onCategorizeSelected,
        onSendToKiosk, isEditing, onAIEdit, onAutoAdjust, onApplyFilter, onResetEdits,
        onCopyEdits, onPasteEdits, canPaste, albumDetails, onAlbumDetailsChange,
        onDeleteSelected, isOnline, isCropping, onToggleCrop, onApplyCrop,
    } = props;

    const [aiPrompt, setAiPrompt] = useState('');
    const selectionCount = selectedPhotoIds.size;
    const hasSelection = selectionCount > 0;
    const edits = activePhoto?.manualEdits || initialEdits;

    // Helper function to check if a control is modified
    const isControlModified = (key: keyof ManualEdits): boolean => {
        if (!activePhoto?.manualEdits) return false;
        const currentValue = edits[key] ?? initialEdits[key];
        return currentValue !== initialEdits[key];
    };

    // Count modified controls by section
    const getModifiedCount = (keys: (keyof ManualEdits)[]): number => {
        return keys.filter(key => isControlModified(key)).length;
    };

    const handleAIEdit = () => {
        if (aiPrompt.trim()) {
            onAIEdit(aiPrompt);
        }
    };

    const sectionClass = "py-4 border-b border-slate-200 dark:border-slate-700";
    const summaryClass = "font-bold cursor-pointer list-none flex justify-between items-center text-slate-700 dark:text-slate-200 select-none";

    return (
        <aside className="w-full lg:w-80 lg:flex-shrink-0 bg-white dark:bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 p-4 flex flex-col overflow-y-auto custom-scrollbar transition-colors">
            <style>{`
                details > summary { list-style: none; }
                details > summary::-webkit-details-marker { display: none; }
                details summary .arrow { transition: transform 0.2s; }
                details[open] summary .arrow { transform: rotate(90deg); }
            `}</style>

            <details open className={sectionClass}>
                <summary className={summaryClass}>
                    <span>Album Details</span>
                    <span className="arrow text-slate-400">▶</span>
                </summary>
                <div className="mt-4 space-y-3">
                    <div>
                        <label htmlFor="album-title-input" className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Title</label>
                        <input 
                            id="album-title-input"
                            type="text" 
                            value={albumDetails.title} 
                            onChange={(e) => onAlbumDetailsChange(prev => ({ ...prev, title: e.target.value }))} 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            disabled={isEditing}
                            aria-label="Album title"
                        />
                    </div>
                    <div>
                        <label htmlFor="album-room-input" className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Room Number</label>
                        <input 
                            id="album-room-input"
                            type="text" 
                            value={albumDetails.roomNumber} 
                            onChange={(e) => onAlbumDetailsChange(prev => ({ ...prev, roomNumber: e.target.value }))} 
                            className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            disabled={isEditing}
                            aria-label="Room number"
                        />
                    </div>
                </div>
            </details>
            
            <details open className={sectionClass}>
                <summary className={summaryClass}>
                    <span>Batch Actions ({selectionCount})</span>
                     <span className="arrow text-slate-400">▶</span>
                </summary>
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={onCopyEdits} disabled={isEditing || !activePhoto} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300">Copy Edits</button>
                    <button onClick={onPasteEdits} disabled={isEditing || !canPaste || !hasSelection} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300">Paste Edits</button>
                    <button onClick={onResetEdits} disabled={isEditing || (!activePhoto && !hasSelection)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300">Reset Edits</button>
                    <button onClick={onDeleteSelected} disabled={!hasSelection || isEditing} className="bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 text-sm py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">Delete</button>
                </div>
            </details>

            {edits && (
                <>
                    <details open className={sectionClass}>
                        <summary className={summaryClass}>
                            <span>Transform</span>
                            <span className="arrow text-slate-400">▶</span>
                        </summary>
                        <div className="mt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => onQuickRotate('left')} disabled={isEditing} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm py-2 rounded-md flex items-center justify-center text-slate-700 dark:text-slate-300" title="Rotate Left 90°">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                    -90°
                                </button>
                                <button onClick={() => onQuickRotate('right')} disabled={isEditing} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-sm py-2 rounded-md flex items-center justify-center text-slate-700 dark:text-slate-300" title="Rotate Right 90°">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                                    +90°
                                </button>
                            </div>

                            {isCropping ? (
                                <div className="flex gap-2">
                                    <button onClick={onApplyCrop} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-md font-bold shadow-sm">Apply</button>
                                    <button onClick={onToggleCrop} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-sm py-2 rounded-md font-bold">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={onToggleCrop} className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-sm py-2 rounded-md flex items-center justify-center gap-2 transition-colors font-semibold">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                    Crop Image
                                </button>
                            )}
                            
                            <SliderControl label="Straighten" value={edits.straighten || 0} onChange={v => onManualEditChange({ straighten: v })} min={-15} max={15} step={0.1} unit="°" disabled={isEditing} isModified={isControlModified('straighten')} defaultValue={0} />
                            
                            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Perspective</p>
                                <SliderControl label="Horizontal" value={edits.perspectiveX || 0} onChange={v => onManualEditChange({ perspectiveX: v })} min={-50} max={50} unit="" disabled={isEditing} isModified={isControlModified('perspectiveX')} defaultValue={0} />
                                <SliderControl label="Vertical" value={edits.perspectiveY || 0} onChange={v => onManualEditChange({ perspectiveY: v })} min={-50} max={50} unit="" disabled={isEditing} isModified={isControlModified('perspectiveY')} defaultValue={0} />
                            </div>
                        </div>
                    </details>

                    <details open className={sectionClass}>
                        <summary className={summaryClass}>
                            <span>Adjustments</span>
                            <span className="arrow text-slate-400">▶</span>
                        </summary>
                        <div className="mt-4 space-y-4">
                            <button onClick={onAutoAdjust} disabled={isEditing || (!activePhoto && !hasSelection)} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold text-sm py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all transform active:scale-95">✨ Auto Enhance</button>
                            
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Light</p>
                                <SliderControl label="Exposure" value={edits.exposure} onChange={v => onManualEditChange({ exposure: v })} disabled={isEditing} isModified={isControlModified('exposure')} defaultValue={0} />
                                <SliderControl label="Contrast" value={edits.contrast} onChange={v => onManualEditChange({ contrast: v })} disabled={isEditing} isModified={isControlModified('contrast')} defaultValue={0} />
                                <SliderControl label="Highlights" value={edits.highlights} onChange={v => onManualEditChange({ highlights: v })} disabled={isEditing} isModified={isControlModified('highlights')} defaultValue={0} />
                                <SliderControl label="Shadows" value={edits.shadows} onChange={v => onManualEditChange({ shadows: v })} disabled={isEditing} isModified={isControlModified('shadows')} defaultValue={0} />
                                <SliderControl label="Whites" value={edits.whites || 0} onChange={v => onManualEditChange({ whites: v })} min={0} max={100} unit="%" disabled={isEditing} isModified={isControlModified('whites')} defaultValue={0} />
                                <SliderControl label="Blacks" value={edits.blacks || 0} onChange={v => onManualEditChange({ blacks: v })} min={0} max={100} unit="%" disabled={isEditing} isModified={isControlModified('blacks')} defaultValue={0} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 uppercase tracking-wider">Color</p>
                                <SliderControl label="Saturation" value={edits.saturate} onChange={v => onManualEditChange({ saturate: v })} disabled={isEditing} isModified={isControlModified('saturate')} defaultValue={0} />
                                <SliderControl label="Vibrance" value={edits.vibrance || 0} onChange={v => onManualEditChange({ vibrance: v })} disabled={isEditing} isModified={isControlModified('vibrance')} defaultValue={0} />
                                <SliderControl label="Hue" value={edits.hueRotate} onChange={v => onManualEditChange({ hueRotate: v })} min={0} max={360} unit="°" disabled={isEditing} isModified={isControlModified('hueRotate')} defaultValue={0} />
                                <SliderControl label="Temperature" value={edits.temperature || 0} onChange={v => onManualEditChange({ temperature: v })} disabled={isEditing} isModified={isControlModified('temperature')} defaultValue={0} />
                                <SliderControl label="Tint" value={edits.tint || 0} onChange={v => onManualEditChange({ tint: v })} disabled={isEditing} isModified={isControlModified('tint')} defaultValue={0} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 uppercase tracking-wider">Effects</p>
                                <SliderControl label="Clarity" value={edits.clarity} onChange={v => onManualEditChange({ clarity: v })} min={0} max={100} unit="%" disabled={isEditing} isModified={isControlModified('clarity')} defaultValue={0} />
                                <SliderControl label="Soften" value={edits.soften} onChange={v => onManualEditChange({ soften: v })} min={0} max={20} unit="px" disabled={isEditing} isModified={isControlModified('soften')} defaultValue={0} />
                            </div>
                        </div>
                    </details>
                </>
            )}
            
             <details className={sectionClass}>
                <summary className={summaryClass}>
                    <span className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                        AI Generative Edit
                    </span>
                     <span className="arrow text-slate-400">▶</span>
                </summary>
                <div className="mt-4 space-y-4">
                     <div className={`p-4 rounded-lg border transition-all ${isOnline ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30 hover:border-purple-300' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className={`text-sm font-bold ${isOnline ? 'text-purple-800 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'}`}>Prompt</h4>
                            {isEditing && <span className="text-[10px] text-purple-600 dark:text-purple-400 animate-pulse font-bold">PROCESSING...</span>}
                        </div>
                        <textarea 
                            value={aiPrompt} 
                            onChange={(e) => setAiPrompt(e.target.value)} 
                            placeholder={isOnline ? "Describe desired change (e.g. 'Remove the person in the background')" : "AI features require internet connection"} 
                            title={!isOnline ? "AI features require an internet connection" : ""} 
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm h-24 resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow" 
                            disabled={isEditing || !hasSelection || !isOnline}
                        />
                        <div className="flex gap-2 mt-2">
                            <button 
                                onClick={() => setAiPrompt('')}
                                disabled={!aiPrompt || isEditing}
                                className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                            >
                                Clear
                            </button>
                            <button 
                                onClick={handleAIEdit} 
                                disabled={isEditing || !hasSelection || !aiPrompt.trim() || !isOnline} 
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-md text-sm transition-all shadow-md disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isEditing ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Working...
                                    </>
                                ) : `Generate`}
                            </button>
                        </div>
                    </div>
                     <div>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Quick Filters</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => onApplyFilter('vintage')} disabled={isEditing || (!activePhoto && !hasSelection)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">Vintage</button>
                            <button onClick={() => onApplyFilter('blackAndWhite')} disabled={isEditing || (!activePhoto && !hasSelection)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">B & W</button>
                            <button onClick={() => onApplyFilter('sepia')} disabled={isEditing || (!activePhoto && !hasSelection)} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">Sepia</button>
                        </div>
                    </div>
                </div>
            </details>
            
            <details className={sectionClass}>
                <summary className={summaryClass}>
                    <span>Organization</span>
                     <span className="arrow text-slate-400">▶</span>
                </summary>
                <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Categorize Selected</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {PHOTO_CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => onCategorizeSelected(cat)} disabled={!hasSelection || isEditing} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium text-slate-700 dark:text-slate-200 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">{cat}</button>
                        ))}
                    </div>
                </div>
            </details>

            <div className="flex-grow"></div>

            <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                <button 
                    onClick={onSendToKiosk}
                    disabled={!hasSelection || isEditing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Finalize & Send ({selectionCount})
                </button>
            </div>
        </aside>
    );
};

export default EditorSidebar;
