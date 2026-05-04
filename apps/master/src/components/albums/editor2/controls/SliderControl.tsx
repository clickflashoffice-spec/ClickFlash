import React, { useState, useEffect } from "react";
import { useDebounce } from "../../../../hooks/useDebounce";

export interface SliderControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  step?: number;
  showValue?: boolean;
  unit?: string;
  isModified?: boolean;
  defaultValue?: number;
  onStart?: () => void;
  onEnd?: () => void;
  className?: string;
}

export const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min = -100,
  max = 100,
  onChange,
  disabled = false,
  step = 1,
  showValue = true,
  unit = "",
  isModified = false,
  defaultValue,
  onStart,
  onEnd,
  className = "",
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debouncedValue = useDebounce(localValue, 50);

  // Sync local value with prop when it change from outside (e.g. Undo/Redo)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Propagate debounced changes to parent
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, value, onChange]);

  return (
    <div className={`p-4 border-b border-gray-200 ${className}`}>
      <div className="flex justify-between mb-2">
        <label
          className={`text-xs font-semibold uppercase tracking-wider transition-colors ${isModified ? "text-blue-600" : "text-gray-500"}`}
        >
          {label}
          {isModified && <span className="ml-1 text-[10px] opacity-75">•</span>}
        </label>
        {showValue && (
          <span className="text-xs text-blue-600 font-mono">
            {localValue}
            {unit}
          </span>
        )}
      </div>
      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          disabled={disabled}
          onChange={(e) => setLocalValue(Number(e.target.value))}
          onMouseDown={onStart}
          onMouseUp={onEnd}
          onTouchStart={onStart}
          onTouchEnd={onEnd}
          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-gray-300 accent-blue-500"
        />
      </div>
    </div>
  );
};
