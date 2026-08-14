import React, { useState, useRef, useEffect } from 'react';

interface SliderControlProps {
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
    onDragStart?: () => void;
    onDragEnd?: () => void;
    className?: string;
}

/**
 * Reusable slider control for photo edit adjustments.
 * Simplified and unified from individual component implementations.
 */
export const SliderControl: React.FC<SliderControlProps> = ({
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
    defaultValue = 0,
    onDragStart,
    onDragEnd,
    className = ''
}) => {
    const [inputValue, setInputValue] = useState((value ?? 0).toString());
    const sliderRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const percentage = ((value - min) / (max - min)) * 100;

    useEffect(() => {
        setInputValue(isNaN(value) ? '0' : value.toFixed(step < 1 ? 1 : 0));
    }, [value, step]);

    const clampValue = (val: number): number => {
        return Math.max(min, Math.min(max, val));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue) && newValue.trim() !== '') {
            onChange(clampValue(numValue));
        }
    };

    const handleInputBlur = () => {
        const numValue = parseFloat(inputValue);
        if (isNaN(numValue) || inputValue.trim() === '') {
            setInputValue(isNaN(value) ? '0' : value.toFixed(step < 1 ? 1 : 0));
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
        <div className={`group ${className}`}>
            <div className="flex justify-between items-baseline mb-1">
                <label className={`block text-[11px] font-semibold flex items-center gap-1.5 ${disabled ? 'text-slate-400 dark:text-slate-500' : isModified ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {label}
                    {isModified && !disabled && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400" title="Modified" />
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
                            className="w-14 text-[11px] font-mono text-right px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="text-[10px] text-slate-500">{unit}</span>
                    </div>
                ) : (
                    <span className={`text-[11px] font-mono font-bold w-14 text-right ${value !== 0 || isModified ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
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
                        className={`w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all ${isModified && !disabled ? 'ring-1 ring-blue-400' : ''}`}
                        style={{
                            background: disabled ? '' : `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${percentage}%, rgb(226 232 240) ${percentage}%, rgb(226 232 240) 100%)`,
                            touchAction: 'none'
                        }}
                        onDoubleClick={resetValue}
                        onPointerDown={() => onDragStart?.()}
                        onPointerUp={() => onDragEnd?.()}
                    />
                </div>
                {showQuickButtons && !disabled && (
                    <div className="flex items-center gap-0.5">
                        <button onClick={() => quickAdjust(-10)} className="px-1 py-0.5 text-[9px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">-10</button>
                        <button onClick={() => quickAdjust(10)} className="px-1 py-0.5 text-[9px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">+10</button>
                    </div>
                )}
            </div>
        </div>
    );
};
