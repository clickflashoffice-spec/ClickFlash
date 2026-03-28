import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Photo, ManualEdits } from '../types';
import Modal from './common/Modal';
import { getPhotoStyle, INITIAL_EDITS } from '../utils/styleUtils';

interface PhotoEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: Photo;
    onSave: (photoId: string, edits: ManualEdits) => void;
}

const SliderControl: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
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
    showQuickButtons = true,
    showNumericInput = true,
    isModified = false,
    defaultValue = 0
}) => {
        const [inputValue, setInputValue] = useState(value.toString());
        const sliderRef = useRef<HTMLInputElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);

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
            onChange(clampValue(value + delta));
        };

        const resetValue = () => {
            onChange(defaultValue);
        };

        const percentage = ((value - min) / (max - min)) * 100;

        return (
            <div className="mb-3">
                <div className="flex justify-between items-baseline mb-1">
                    <label className={`block text-xs font-medium flex items-center gap-1.5 ${isModified ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {label}
                        {isModified && (
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
                                className="w-16 text-xs font-mono text-right px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                aria-label={`${label} value`}
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400">{unit}</span>
                        </div>
                    ) : (
                        <span className={`text-xs font-mono w-12 text-right ${isModified ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>
                            {value}{unit}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
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
                            className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isModified ? 'ring-1 ring-blue-400 dark:ring-blue-500' : ''
                                }`}
                            style={{
                                background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${percentage}%, rgb(226 232 240) ${percentage}%, rgb(226 232 240) 100%)`
                            }}
                            onDoubleClick={resetValue}
                            title={`${label}: ${value}${unit}. Use arrow keys to adjust. Double-click to reset.`}
                        />
                    </div>
                    {showQuickButtons && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => quickAdjust(-10)}
                                className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Decrease by 10"
                            >
                                -10
                            </button>
                            <button
                                onClick={() => quickAdjust(10)}
                                className="px-1.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Increase by 10"
                            >
                                +10
                            </button>
                            {value !== defaultValue && (
                                <button
                                    onClick={resetValue}
                                    className="px-1.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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

// Grid Overlay Component for Straighten Editor
const GridOverlay: React.FC<{ show: boolean; containerRef: React.RefObject<HTMLDivElement> }> = ({ show, containerRef }) => {
    const [gridSize, setGridSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!show || !containerRef.current) return;

        const updateGridSize = () => {
            if (containerRef.current) {
                setGridSize({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        updateGridSize();
        const resizeObserver = new ResizeObserver(updateGridSize);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [show, containerRef]);

    if (!show) return null;

    const gridLines = 9; // 3x3 grid (9 lines total: 3 horizontal + 3 vertical + center lines)
    const spacing = {
        horizontal: gridSize.height / (gridLines + 1),
        vertical: gridSize.width / (gridLines + 1)
    };

    return (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                backgroundImage: `
                    repeating-linear-gradient(0deg, transparent, transparent ${spacing.horizontal - 1}px, rgba(255, 255, 255, 0.3) ${spacing.horizontal - 1}px, rgba(255, 255, 255, 0.3) ${spacing.horizontal}px),
                    repeating-linear-gradient(90deg, transparent, transparent ${spacing.vertical - 1}px, rgba(255, 255, 255, 0.3) ${spacing.vertical - 1}px, rgba(255, 255, 255, 0.3) ${spacing.vertical}px)
                `,
                backgroundSize: `${gridSize.width}px ${gridSize.height}px`
            }}
        >
            {/* Center lines (thicker) */}
            <div
                className="absolute top-0 left-1/2 w-0.5 h-full bg-white opacity-50"
                style={{ transform: 'translateX(-50%)' }}
            />
            <div
                className="absolute left-0 top-1/2 h-0.5 w-full bg-white opacity-50"
                style={{ transform: 'translateY(-50%)' }}
            />
        </div>
    );
};

const PhotoEditModal: React.FC<PhotoEditModalProps> = ({ isOpen, onClose, photo, onSave }) => {
    const [edits, setEdits] = useState<ManualEdits>(INITIAL_EDITS);
    const [originalEdits, setOriginalEdits] = useState<ManualEdits>(INITIAL_EDITS);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [showGrid, setShowGrid] = useState(false);
    const [showBeforeAfter, setShowBeforeAfter] = useState(false);
    const previewContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (photo) {
            const photoEdits = photo.manualEdits ? { ...INITIAL_EDITS, ...photo.manualEdits } : INITIAL_EDITS;
            setEdits(photoEdits);
            setOriginalEdits(photoEdits);
            setPreviewUrl(photo.url);
            // Show grid if straighten value is non-zero
            setShowGrid(photoEdits.straighten !== 0);
            setShowBeforeAfter(false);
        }
    }, [photo, isOpen]);

    // Auto-show grid when straighten value changes
    useEffect(() => {
        if (edits.straighten !== 0 && !showGrid) {
            setShowGrid(true);
        }
    }, [edits.straighten, showGrid]);

    // Helper function to check if a control is modified
    const isControlModified = (key: keyof ManualEdits): boolean => {
        return edits[key] !== originalEdits[key];
    };

    // Count modified controls by section
    const getModifiedCount = (keys: (keyof ManualEdits)[]): number => {
        return keys.filter(key => isControlModified(key)).length;
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') {
                return;
            }
            if (e.key === 'b' || e.key === 'B') {
                if (!(e.target as HTMLElement).tagName.match(/INPUT|TEXTAREA/)) {
                    e.preventDefault();
                    setShowBeforeAfter(!showBeforeAfter);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showBeforeAfter]);

    const handleEditChange = (updates: Partial<ManualEdits>) => {
        setEdits(prev => ({ ...prev, ...updates }));
    };

    const handleSave = () => {
        onSave(photo.id, edits);
        onClose();
    };

    const handleReset = () => {
        setEdits(INITIAL_EDITS);
    };

    // Generate style for original (before) image
    const originalPhotoStyle = useMemo(() => getPhotoStyle(originalEdits), [originalEdits]);

    const photoStyle = useMemo(() => getPhotoStyle(edits), [edits]);

    if (!photo) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Photo" size="xl">
            <div className="flex flex-col md:flex-row h-[600px] gap-4">
                {/* Preview Area */}
                <div
                    ref={previewContainerRef}
                    className="flex-grow bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden relative flex-col"
                >
                    {/* Before/After Toggle Button */}
                    <div className="absolute top-2 right-2 z-10">
                        <button
                            onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${showBeforeAfter
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600/80'
                                }`}
                            title="Toggle Before/After (B)"
                        >
                            {showBeforeAfter ? 'After' : 'Before/After'}
                        </button>
                    </div>

                    <div className={`flex-1 flex items-center justify-center w-full h-full relative ${showBeforeAfter ? 'flex-row' : ''}`}>
                        {showBeforeAfter ? (
                            <>
                                <div className="flex-1 flex items-center justify-center h-full relative border-r border-slate-700">
                                    <div className="absolute top-2 left-2 text-xs font-semibold text-white bg-black/50 px-2 py-1 rounded">
                                        Before
                                    </div>
                                    <div className="absolute inset-0 pointer-events-none z-[1]" style={{ boxShadow: originalPhotoStyle.boxShadow, transform: originalPhotoStyle.transform }}></div>
                                    <img
                                        src={previewUrl}
                                        alt={`${photo.title} - Before`}
                                        style={{ filter: originalPhotoStyle.filter, transform: originalPhotoStyle.transform, transformOrigin: 'center' }}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                                <div className="flex-1 flex items-center justify-center h-full relative">
                                    <div className="absolute top-2 left-2 text-xs font-semibold text-white bg-black/50 px-2 py-1 rounded">
                                        After
                                    </div>
                                    <div className="absolute inset-0 pointer-events-none z-[1]" style={{ boxShadow: photoStyle.boxShadow, transform: photoStyle.transform }}></div>
                                    <img
                                        src={previewUrl}
                                        alt={`${photo.title} - After`}
                                        style={{ filter: photoStyle.filter, transform: photoStyle.transform, transformOrigin: 'center' }}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    <GridOverlay show={showGrid} containerRef={previewContainerRef} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="absolute inset-0 pointer-events-none z-[1]" style={{ boxShadow: photoStyle.boxShadow, transform: photoStyle.transform }}></div>
                                <img
                                    src={previewUrl}
                                    alt={photo.title}
                                    style={{ filter: photoStyle.filter, transform: photoStyle.transform, transformOrigin: 'center' }}
                                    className="max-w-full max-h-full object-contain"
                                />
                                <GridOverlay show={showGrid} containerRef={previewContainerRef} />
                            </>
                        )}
                    </div>

                    {/* Straighten Slider at Bottom */}
                    <div className="w-full px-4 py-3 bg-slate-800/50 border-t border-slate-700">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowGrid(!showGrid)}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${showGrid
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                                title="Toggle Grid Overlay"
                            >
                                Grid
                            </button>
                            <div className="flex-1">
                                <div className="flex justify-between items-baseline mb-1">
                                    <label className="block text-xs font-medium text-slate-300">Straighten</label>
                                    <span className="text-xs font-mono text-slate-300">{edits.straighten.toFixed(1)}°</span>
                                </div>
                                <input
                                    type="range"
                                    min={-15}
                                    max={15}
                                    step={0.1}
                                    value={edits.straighten}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        handleEditChange({ straighten: value });
                                        if (value !== 0 && !showGrid) {
                                            setShowGrid(true);
                                        }
                                    }}
                                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onDoubleClick={() => {
                                        handleEditChange({ straighten: 0 });
                                        setShowGrid(false);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls Sidebar */}
                <div className="w-full md:w-80 flex-shrink-0 overflow-y-auto pr-2">
                    <div className="space-y-6">
                        {/* Transform */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center justify-between">
                                <span>Transform</span>
                                {getModifiedCount(['rotate', 'straighten', 'perspectiveX', 'perspectiveY']) > 0 && (
                                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {getModifiedCount(['rotate', 'straighten', 'perspectiveX', 'perspectiveY'])}
                                    </span>
                                )}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <button onClick={() => handleEditChange({ rotate: (edits.rotate - 90) })} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs py-2 rounded text-slate-700 dark:text-slate-300">Rotate Left</button>
                                <button onClick={() => handleEditChange({ rotate: (edits.rotate + 90) })} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs py-2 rounded text-slate-700 dark:text-slate-300">Rotate Right</button>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 italic">
                                Use the straighten slider at the bottom of the preview area with grid overlay
                            </div>
                            <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700">
                                <h5 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Perspective</h5>
                                <SliderControl label="Horizontal" value={edits.perspectiveX || 0} onChange={v => handleEditChange({ perspectiveX: v })} min={-50} max={50} isModified={isControlModified('perspectiveX')} defaultValue={0} />
                                <SliderControl label="Vertical" value={edits.perspectiveY || 0} onChange={v => handleEditChange({ perspectiveY: v })} min={-50} max={50} isModified={isControlModified('perspectiveY')} defaultValue={0} />
                            </div>
                        </div>

                        {/* Light */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center justify-between">
                                <span>Light</span>
                                {getModifiedCount(['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks']) > 0 && (
                                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {getModifiedCount(['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'])}
                                    </span>
                                )}
                            </h4>
                            <SliderControl label="Exposure" value={edits.exposure} onChange={v => handleEditChange({ exposure: v })} isModified={isControlModified('exposure')} defaultValue={0} />
                            <SliderControl label="Contrast" value={edits.contrast} onChange={v => handleEditChange({ contrast: v })} isModified={isControlModified('contrast')} defaultValue={0} />
                            <SliderControl label="Highlights" value={edits.highlights} onChange={v => handleEditChange({ highlights: v })} isModified={isControlModified('highlights')} defaultValue={0} />
                            <SliderControl label="Shadows" value={edits.shadows} onChange={v => handleEditChange({ shadows: v })} isModified={isControlModified('shadows')} defaultValue={0} />
                            <SliderControl label="Whites" value={edits.whites || 0} onChange={v => handleEditChange({ whites: v })} min={0} max={100} unit="%" isModified={isControlModified('whites')} defaultValue={0} />
                            <SliderControl label="Blacks" value={edits.blacks || 0} onChange={v => handleEditChange({ blacks: v })} min={0} max={100} unit="%" isModified={isControlModified('blacks')} defaultValue={0} />
                        </div>

                        {/* Color */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center justify-between">
                                <span>Color</span>
                                {getModifiedCount(['saturate', 'vibrance', 'hueRotate', 'temperature', 'tint']) > 0 && (
                                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {getModifiedCount(['saturate', 'vibrance', 'hueRotate', 'temperature', 'tint'])}
                                    </span>
                                )}
                            </h4>
                            <SliderControl label="Saturation" value={edits.saturate} onChange={v => handleEditChange({ saturate: v })} isModified={isControlModified('saturate')} defaultValue={0} />
                            <SliderControl label="Vibrance" value={edits.vibrance || 0} onChange={v => handleEditChange({ vibrance: v })} isModified={isControlModified('vibrance')} defaultValue={0} />
                            <SliderControl label="Hue" value={edits.hueRotate} onChange={v => handleEditChange({ hueRotate: v })} min={0} max={360} unit="°" isModified={isControlModified('hueRotate')} defaultValue={0} />
                            <SliderControl label="Temperature" value={edits.temperature || 0} onChange={v => handleEditChange({ temperature: v })} isModified={isControlModified('temperature')} defaultValue={0} />
                            <SliderControl label="Tint" value={edits.tint || 0} onChange={v => handleEditChange({ tint: v })} isModified={isControlModified('tint')} defaultValue={0} />
                        </div>

                        {/* Effects */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 pb-1 flex items-center justify-between">
                                <span>Effects</span>
                                {getModifiedCount(['clarity', 'soften', 'sepia', 'grayscale', 'invert', 'dropShadow']) > 0 && (
                                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {getModifiedCount(['clarity', 'soften', 'sepia', 'grayscale', 'invert', 'dropShadow'])}
                                    </span>
                                )}
                            </h4>
                            <SliderControl label="Clarity" value={edits.clarity} onChange={v => handleEditChange({ clarity: v })} min={0} max={100} unit="%" isModified={isControlModified('clarity')} defaultValue={0} />
                            <SliderControl label="Soften" value={edits.soften} onChange={v => handleEditChange({ soften: v })} min={0} max={20} unit="px" isModified={isControlModified('soften')} defaultValue={0} />
                            <SliderControl label="Sepia" value={edits.sepia} onChange={v => handleEditChange({ sepia: v })} min={0} max={100} unit="%" isModified={isControlModified('sepia')} defaultValue={0} />
                            <SliderControl label="B&W" value={edits.grayscale} onChange={v => handleEditChange({ grayscale: v })} min={0} max={100} unit="%" isModified={isControlModified('grayscale')} defaultValue={0} />
                            <SliderControl label="Vignette" value={edits.vignette || 0} onChange={v => handleEditChange({ vignette: v })} min={-100} max={100} isModified={isControlModified('vignette')} defaultValue={0} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                    onClick={handleReset}
                    className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline"
                >
                    Reset to Original
                </button>
                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm"
                    >
                        Save Edits
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default PhotoEditModal;
