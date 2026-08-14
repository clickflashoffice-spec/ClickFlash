import React, { useState, useCallback, useMemo, useEffect } from "react";
import styles from "./FilterPanel.module.css";
import { useDebounce } from "@/hooks/useDebounce";
import { ManualEdits } from "@/types/shared";
import {
  EditorPreset,
  EDITOR_CATEGORIES,
  EDITOR_CONTROLS,
  ADJUSTMENT_SECTIONS,
  EDITOR_PRESETS,
  ControlDefinition,
} from "@/utils/editUtils";
import { INITIAL_EDITS, getPhotoStyle } from "@/utils/styleUtils";

interface FilterPanelProps {
  filters: ManualEdits;
  onChange: (filters: Partial<ManualEdits>) => void;
  onReset: () => void;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  disabled?: boolean;
  activePhotoUrl?: string; // For live preset previews
}

/**
 * FilterSlider: Sub-component for individual adjustment controls with
 * local state for immediate feedback and debounced reporting for history.
 */
const FilterSlider: React.FC<{
  control: ControlDefinition;
  value: number;
  onChange: (key: keyof ManualEdits, value: number) => void;
}> = ({ control, value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop when history changes (undo/redo)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedValue = useDebounce(localValue, 50);

  useEffect(() => {
    if (debouncedValue !== value) {
      onChange(control.key, debouncedValue);
    }
  }, [debouncedValue, control.key, onChange, value]);

  const hasValue = localValue !== control.defaultValue;
  const progress =
    ((localValue - control.min) / (control.max - control.min)) * 100;

  return (
    <div className={styles.control}>
      <div className={styles.controlHeader}>
        <label>{control.name}</label>
        <span
          className={`${styles.controlValue} ${hasValue ? styles.modified : ""}`}
        >
          {localValue > 0 && "+"}
          {localValue}
          {control.unit}
        </span>
      </div>
      <div className={styles.sliderContainer}>
        <input
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={localValue}
          onChange={(e) => setLocalValue(Number(e.target.value))}
          className={styles.slider}
        />
        <div className={styles.sliderFill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
  disabled = false,
  activePhotoUrl,
}) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "basic",
  );

  // Filter presets by category
  const filteredPresets = useMemo(() => {
    if (activeCategory === "all") return EDITOR_PRESETS;
    return EDITOR_PRESETS.filter(
      (p: EditorPreset) => p.category === activeCategory,
    );
  }, [activeCategory]);

  // Check if any filters are applied
  const hasFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      const defaultValue = (INITIAL_EDITS as any)[key];
      return (
        value !== defaultValue &&
        [
          "exposure",
          "contrast",
          "saturate",
          "vibrance",
          "highlights",
          "shadows",
          "whites",
          "blacks",
          "clarity",
          "vignette",
          "temperature",
          "tint",
          "hueRotate",
          "soften",
          "grayscale",
          "sepia",
          "invert",
        ].includes(key)
      );
    });
  }, [filters]);

  // Handle preset selection
  const handlePresetClick = useCallback(
    (preset: EditorPreset) => {
      setSelectedPresetId(preset.id);
      onChange({ ...INITIAL_EDITS, ...preset.edits });
    },
    [onChange],
  );

  // Handle slider change
  const handleSliderChange = useCallback(
    (key: keyof ManualEdits, value: number) => {
      setSelectedPresetId(null); // Clear preset selection when manually adjusting
      onChange({ [key]: value });
    },
    [onChange],
  );

  // Handle reset
  const handleReset = useCallback(() => {
    setSelectedPresetId(null);
    onReset();
  }, [onReset]);

  // Group controls into sections using the definitions from editUtils
  const sections = useMemo(() => {
    const result: Record<string, ControlDefinition[]> = {};
    Object.entries(ADJUSTMENT_SECTIONS).forEach(([name, keys]) => {
      // Cast to any to safely handle readonly adjustment key arrays from constants
      result[name] = EDITOR_CONTROLS.filter((c) =>
        (keys as any).includes(c.key),
      );
    });
    return result;
  }, []);

  const sectionNames: Record<string, string> = {
    basic: "Basic",
    color: "Color",
    tone: "Tone",
    effects: "Effects",
  };

  return (
    <div className={`${styles.panel} ${disabled ? styles.disabled : ""}`}>
      {/* Presets Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Presets</h4>
        </div>

        {/* Category Tabs */}
        <div className={styles.categoryTabs}>
          {EDITOR_CATEGORIES.map((cat: any) => (
            <button
              key={cat.id}
              className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.active : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Preset Grid */}
        <div className={styles.presetGrid}>
          {filteredPresets.map((preset: EditorPreset) => (
            <button
              key={preset.id}
              className={`${styles.presetButton} ${selectedPresetId === preset.id ? styles.selected : ""}`}
              onClick={() => handlePresetClick(preset)}
            >
              <div
                className={styles.presetPreview}
                style={{
                  filter: getPhotoStyle({
                    ...INITIAL_EDITS,
                    ...preset.edits,
                  }).filter,
                }}
              >
                {activePhotoUrl ? (
                  <img
                    src={activePhotoUrl}
                    alt=""
                    className={styles.presetImage}
                    loading="lazy"
                  />
                ) : (
                  <div className={styles.presetPlaceholder} />
                )}
              </div>
              <span className={styles.presetName}>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4>Adjustments</h4>
          <div className={styles.headerActions}>
            <div className={styles.historyActions}>
              <button
                className={styles.historyButton}
                onClick={undo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 14L4 9L9 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 20C20 18.9391 19.5786 17.9217 18.8284 17.1716C18.0783 16.4214 17.0609 16 16 16H4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className={styles.historyButton}
                onClick={redo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M15 14L20 9L15 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 20C4 18.9391 4.42143 17.9217 5.17157 17.1716C5.92172 16.4214 6.93913 16 8 16H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            {hasFilters && (
              <button className={styles.resetButton} onClick={handleReset}>
                Reset All
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Sections */}
        {Object.entries(sections).map(([sectionKey, controls]) => (
          <div key={sectionKey} className={styles.adjustmentSection}>
            <button
              className={styles.sectionToggle}
              onClick={() =>
                setExpandedSection(
                  expandedSection === sectionKey ? null : sectionKey,
                )
              }
            >
              <span>{sectionNames[sectionKey]}</span>
              <svg
                className={`${styles.toggleIcon} ${expandedSection === sectionKey ? styles.expanded : ""}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {expandedSection === sectionKey && (
              <div className={styles.controlsGrid}>
                {(controls as any[]).map((control) => (
                  <FilterSlider
                    key={control.key}
                    control={control}
                    // Cast to any because EDITOR_CONTROLS keys are guaranteed to be numeric properties of ManualEdits
                    value={
                      (filters as any)[control.key] ?? control.defaultValue
                    }
                    onChange={handleSliderChange}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Current Filter Display */}
      <div className={styles.filterString}>
        <code>{getPhotoStyle(filters).filter}</code>
      </div>
    </div>
  );
};
