import React, { memo } from 'react';
import { RotateCcw, Crop, Paintbrush, Undo2, Redo2 } from 'lucide-react';
import { ManualEdits } from '../../../types';
import Tooltip from '../../common/Tooltip';

interface EditorToolbarProps {
    edits: ManualEdits;
    onEditChange: (updates: Partial<ManualEdits>) => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isCropping: boolean;
    onToggleCrop: () => void;
    isRetouching: boolean;
    onToggleRetouch: () => void;
    onResetEdits: () => void;
    disabled?: boolean;
}

interface SliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (val: number) => void;
    disabled?: boolean;
}

const Slider: React.FC<SliderProps> = memo(({ label, value, min, max, onChange, disabled }) => (
    <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{label}</span>
            <span>{value > 0 ? `+${value}` : value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
        />
    </div>
));
Slider.displayName = 'Slider';

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    edits,
    onEditChange,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    isCropping,
    onToggleCrop,
    isRetouching,
    onToggleRetouch,
    onResetEdits,
    disabled = false,
}) => {
    const handleExposureChange = (value: number) => onEditChange({ exposure: value });
    const handleContrastChange = (value: number) => onEditChange({ contrast: value });
    const handleHighlightsChange = (value: number) => onEditChange({ highlights: value });
    const handleShadowsChange = (value: number) => onEditChange({ shadows: value });
    const handleSaturateChange = (value: number) => onEditChange({ saturate: value });
    const handleTemperatureChange = (value: number) => onEditChange({ temperature: value });
    const handleTintChange = (value: number) => onEditChange({ tint: value });
    const handleSoftenChange = (value: number) => onEditChange({ soften: value });
    const handleRotateChange = (value: number) => onEditChange({ rotate: value });

    return (
        <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">Edit Photo</h3>
            </div>

            {/* Action buttons */}
            <div className="p-3 border-b border-slate-700 flex gap-2">
                <Tooltip content="Undo (Ctrl+Z)">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo || disabled}
                        className="p-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Undo2 className="w-4 h-4 text-white" />
                    </button>
                </Tooltip>
                <Tooltip content="Redo (Ctrl+Y)">
                    <button
                        onClick={onRedo}
                        disabled={!canRedo || disabled}
                        className="p-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Redo2 className="w-4 h-4 text-white" />
                    </button>
                </Tooltip>
                <div className="flex-1" />
                <Tooltip content="Reset All">
                    <button
                        onClick={onResetEdits}
                        disabled={disabled}
                        className="p-2 rounded bg-red-900/50 hover:bg-red-900/70 disabled:opacity-50"
                    >
                        <RotateCcw className="w-4 h-4 text-red-400" />
                    </button>
                </Tooltip>
            </div>

            {/* Adjustment sliders */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Light</h4>
                    <Slider
                        label="Exposure"
                        value={edits.exposure || 0}
                        min={-100}
                        max={100}
                        onChange={handleExposureChange}
                        disabled={disabled || isCropping}
                    />
                    <Slider
                        label="Contrast"
                        value={edits.contrast || 0}
                        min={-100}
                        max={100}
                        onChange={handleContrastChange}
                        disabled={disabled || isCropping}
                    />
                    <Slider
                        label="Highlights"
                        value={edits.highlights || 0}
                        min={-100}
                        max={100}
                        onChange={handleHighlightsChange}
                        disabled={disabled || isCropping}
                    />
                    <Slider
                        label="Shadows"
                        value={edits.shadows || 0}
                        min={-100}
                        max={100}
                        onChange={handleShadowsChange}
                        disabled={disabled || isCropping}
                    />
                </div>

                <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Color</h4>
                    <Slider
                        label="Saturation"
                        value={edits.saturate || 0}
                        min={-100}
                        max={100}
                        onChange={handleSaturateChange}
                        disabled={disabled || isCropping}
                    />
                    <Slider
                        label="Temperature"
                        value={edits.temperature || 0}
                        min={-100}
                        max={100}
                        onChange={handleTemperatureChange}
                        disabled={disabled || isCropping}
                    />
                    <Slider
                        label="Tint"
                        value={edits.tint || 0}
                        min={-100}
                        max={100}
                        onChange={handleTintChange}
                        disabled={disabled || isCropping}
                    />
                </div>

                <div className="mb-4">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detail</h4>
                    <Slider
                        label="Soften"
                        value={edits.soften || 0}
                        min={0}
                        max={100}
                        onChange={handleSoftenChange}
                        disabled={disabled || isCropping}
                    />
                    <Slider
                        label="Rotation"
                        value={edits.rotate || 0}
                        min={-180}
                        max={180}
                        onChange={handleRotateChange}
                        disabled={disabled || isCropping}
                    />
                </div>
            </div>

            {/* Tool buttons */}
            <div className="p-4 border-t border-slate-700">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={onToggleCrop}
                        disabled={disabled}
                        className={`flex items-center justify-center gap-2 p-2 rounded text-sm font-medium transition-colors ${
                            isCropping
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        } disabled:opacity-50`}
                    >
                        <Crop className="w-4 h-4" />
                        Crop
                    </button>
                    <button
                        onClick={onToggleRetouch}
                        disabled={disabled}
                        className={`flex items-center justify-center gap-2 p-2 rounded text-sm font-medium transition-colors ${
                            isRetouching
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        } disabled:opacity-50`}
                    >
                        <Paintbrush className="w-4 h-4" />
                        Retouch
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditorToolbar;
