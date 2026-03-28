import React from 'react';
import { FILTER_PRESETS, FilterPreset } from '@/utils/imageFilters';
import { ManualEdits } from '@/types/shared';

interface FilterPresetsProps {
  currentEdits: ManualEdits | undefined;
  onApplyFilter: (edits: Partial<ManualEdits>) => void;
}

export const FilterPresets: React.FC<FilterPresetsProps> = ({
  currentEdits,
  onApplyFilter,
}) => {
  const isActive = (preset: FilterPreset): boolean => {
    if (!currentEdits) return preset.name === 'Original';

    // Check if current edits match this preset
    const presetKeys = Object.keys(preset.edits) as (keyof ManualEdits)[];
    return presetKeys.every(key => {
      const presetValue = Number(preset.edits[key] ?? 0);
      const currentValue = Number(currentEdits[key] ?? 0);
      return Math.abs(presetValue - currentValue) < 0.1;
    });
  };

  const theme = {
    container: 'bg-gray-50',
    text: 'text-gray-900',
    subtext: 'text-gray-500',
    border: 'border-gray-200',
    active: 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white',
    hover: 'hover:bg-gray-100'
  };

  return (
    <div className="space-y-4">
      <h3 className={`text-sm font-semibold ${theme.subtext} mb-3`}>Quick Filters</h3>

      <div className="grid grid-cols-2 gap-3">
        {FILTER_PRESETS.map((preset) => {
          const active = isActive(preset);

          return (
            <button
              key={preset.name}
              onClick={() => onApplyFilter(preset.edits)}
              className={`
                relative group p-3 rounded-xl border transition-all duration-200
                ${theme.border} ${theme.hover}
                ${active ? theme.active : ''}
                bg-white
              `}
            >
              {/* Filter Preview Thumbnail */}
              <div
                className="w-full aspect-square rounded-lg mb-2 overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500"
                style={{
                  filter: preset.name === 'Original' ? 'none' :
                    `brightness(${100 + (preset.edits.brightness || 0) * 100}%) ` +
                    `contrast(${100 + (preset.edits.contrast || 0) * 100}%) ` +
                    `saturate(${100 + (preset.edits.saturate || 0) * 100}%)`,
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500" />
              </div>

              {/* Filter Name */}
              <span className={`text-xs font-medium ${theme.text}`}>
                {preset.name}
              </span>

              {/* Active Indicator */}
              {active && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterPresets;
