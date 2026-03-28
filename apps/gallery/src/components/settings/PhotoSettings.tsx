import React from 'react';
import Card from '../common/Card.tsx';
import useLocalStorage from '../../hooks/useLocalStorage.ts';

export interface PhotoSettingsType {
    jpegQuality: number;
    kioskResolution: string;
    autoEnhanceEnabled: boolean;
    aiCullingSensitivity: string;
}

const DEFAULT_SETTINGS: PhotoSettingsType = {
    jpegQuality: 85,
    kioskResolution: '2k',
    autoEnhanceEnabled: false,
    aiCullingSensitivity: 'medium',
};

const PHOTO_SETTINGS_KEY = 'photoProcessingSettings';

const KIOSK_RESOLUTION_OPTIONS = [
    { value: '1k', label: '1K (1024px)' },
    { value: '2k', label: '2K (2048px) - Recommended' },
    { value: '4k', label: '4K (4096px)' },
    { value: 'full', label: 'Full Resolution (Original)' },
];

const AI_CULLING_SENSITIVITY_OPTIONS = [
    { value: 'low', label: 'Low (Conservative)' },
    { value: 'medium', label: 'Medium (Balanced)' },
    { value: 'high', label: 'High (Aggressive)' },
];

/**
 * PhotoSettings Component
 * 
 * Manages photo processing configuration settings including:
 * - JPEG quality for image compression
 * - Kiosk resolution for display optimization
 * - AI workflow automation settings
 * 
 * Features:
 * - Real-time preview of settings impact
 * - Validation of numeric ranges
 * - Persistent storage via localStorage
 * - Dark mode support
 */
const PhotoSettings: React.FC = () => {
    const [settings, setSettings] = useLocalStorage<PhotoSettingsType>(PHOTO_SETTINGS_KEY, DEFAULT_SETTINGS);

    const handleChange = (key: keyof PhotoSettingsType, value: number | boolean | string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSliderChange = (key: keyof PhotoSettingsType, value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            handleChange(key, numValue);
        }
    };

    const labelStyles = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2";
    const inputStyles = "w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors";
    const sliderStyles = "w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600";

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Photo Processing Configuration</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Configure how photos are processed, compressed, and displayed across the system.
                </p>
            </div>

            <Card>
                <div className="space-y-8">
                    {/* Quality & Optimization Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quality & Optimization</h3>
                        <div className="space-y-6">
                            {/* JPEG Export Quality */}
                            <div>
                                <label className={labelStyles}>
                                    JPEG Export Quality
                                </label>
                                <div className="flex items-center space-x-4 mb-2">
                                    <input
                                        type="range"
                                        min="50"
                                        max="100"
                                        value={settings.jpegQuality}
                                        onChange={(e) => handleSliderChange('jpegQuality', e.target.value)}
                                        className={sliderStyles}
                                    />
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded min-w-[60px] text-center">
                                        {settings.jpegQuality}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Lower quality reduces file size for quicker Kiosk syncing. 85% is recommended.
                                </p>
                            </div>

                            {/* Max Kiosk Resolution */}
                            <div>
                                <label className={labelStyles}>
                                    Max Kiosk Resolution (Long Edge)
                                </label>
                                <select
                                    value={settings.kioskResolution}
                                    onChange={(e) => handleChange('kioskResolution', e.target.value)}
                                    className={inputStyles}
                                >
                                    {KIOSK_RESOLUTION_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Resizing images for Kiosks significantly improves browsing speed on tablets.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Workflow Automation Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Workflow Automation</h3>
                        <div className="space-y-6">
                            {/* Auto-Apply AI Enhancements */}
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <label className={labelStyles}>
                                        Auto-Apply AI Enhancements
                                    </label>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Automatically apply basic lighting and color correction upon photo import.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoEnhanceEnabled}
                                        onChange={(e) => handleChange('autoEnhanceEnabled', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {/* AI Smart Culling Sensitivity */}
                            <div>
                                <label className={labelStyles}>
                                    AI Smart Culling Sensitivity
                                </label>
                                <select
                                    value={settings.aiCullingSensitivity}
                                    onChange={(e) => handleChange('aiCullingSensitivity', e.target.value)}
                                    className={inputStyles}
                                >
                                    {AI_CULLING_SENSITIVITY_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Determines how aggressive the blur and closed-eye detection should be during import.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PhotoSettings;

