import React, { useRef } from 'react';
import Card from '../common/Card.tsx';
import useSystemSetting from '../../hooks/useSystemSetting.ts';
import PageHeader from '../common/PageHeader';
import { logger } from '@/utils/logger';

export interface WatermarkSettingsType {
    enabled: boolean;
    imageUrl: string;
    opacity: number;
    scale: number;
    position: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    dynamicProtection: boolean;
}

const DEFAULT_SETTINGS: WatermarkSettingsType = {
    enabled: false,
    imageUrl: '',
    opacity: 50,
    scale: 30,
    position: 'center',
    dynamicProtection: false,
};

const WatermarkSettings: React.FC = () => {
    // Migrated from localStorage to DB 'watermark_config' namespace
    const [settings, setSettings, loading] = useSystemSetting<WatermarkSettingsType>('watermark_config', DEFAULT_SETTINGS);
    const previewImage = 'https://picsum.photos/id/1015/600/400';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setSettings({ ...settings, imageUrl: reader.result as string });
            reader.onerror = () => {
                logger.error('Failed to read watermark image file');
            };
            reader.readAsDataURL(file);
        }
    };

    const getPositionStyle = (pos: string) => {
        switch (pos) {
            case 'top-left': return { top: '10px', left: '10px' };
            case 'top-center': return { top: '10px', left: '50%', transform: 'translateX(-50%)' };
            case 'top-right': return { top: '10px', right: '10px' };
            case 'center-left': return { top: '50%', left: '10px', transform: 'translateY(-50%)' };
            case 'center': return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            case 'center-right': return { top: '50%', right: '10px', transform: 'translateY(-50%)' };
            case 'bottom-left': return { bottom: '10px', left: '10px' };
            case 'bottom-center': return { bottom: '10px', left: '50%', transform: 'translateX(-50%)' };
            case 'bottom-right': return { bottom: '10px', right: '10px' };
            default: return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }
    };

    const resetToDefaults = () => setSettings(DEFAULT_SETTINGS);

    const positions = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'];

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Watermark Protection"
                subtitle="Configure automatic overlays for unsold photos in the MoneyTrash queue."
                actions={
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Enable Protection</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} className="sr-only peer" aria-label="Enable Watermark" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                }
            />

            <Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Watermark Image (PNG)</label>
                            <input
                                type="file"
                                accept="image/png"
                                onChange={handleImageUpload}
                                ref={fileInputRef}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                aria-label="Upload Watermark Image"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Dynamic Anti-Theft Protection</label>
                                <input type="checkbox" checked={settings.dynamicProtection} onChange={e => setSettings({ ...settings, dynamicProtection: e.target.checked })} className="w-5 h-5" aria-label="Enable Dynamic Anti-Theft Protection" />
                            </div>
                            <p className="text-xs text-slate-500">When enabled, watermarks will randomly shift position or increase opacity if a user attempts to take a screenshot or download heavily.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Base Placement</label>
                            <div className="grid grid-cols-3 gap-2 w-32">
                                {positions.map(pos => (
                                    <button
                                        key={pos}
                                        onClick={() => setSettings({ ...settings, position: pos as any })}
                                        className={`w-10 h-10 border rounded flex items-center justify-center ${settings.position === pos ? 'bg-blue-500 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                        title={`Set position to ${pos}`}
                                        aria-label={`Set position to ${pos}`}
                                    >
                                        <div className="w-2 h-2 bg-current rounded-full"></div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={resetToDefaults} className="text-sm text-red-500 hover:underline mt-4">Reset to Defaults</button>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Opacity: {settings.opacity}%</label>
                            <input type="range" min="10" max="100" value={settings.opacity} onChange={e => setSettings({ ...settings, opacity: parseInt(e.target.value) })} className="w-full" aria-label="Watermark Opacity" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Scale: {settings.scale}%</label>
                            <input type="range" min="10" max="100" value={settings.scale} onChange={e => setSettings({ ...settings, scale: parseInt(e.target.value) })} className="w-full" aria-label="Watermark Scale" />
                        </div>
                    </div>

                    <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        <div className="relative overflow-hidden rounded-lg shadow-lg max-w-full">
                            <img src={previewImage} alt="Preview" className="w-full h-auto block" />
                            {settings.enabled && settings.imageUrl && (
                                <img
                                    src={settings.imageUrl}
                                    alt="Watermark"
                                    className={`absolute pointer-events-none ${settings.dynamicProtection ? 'animate-pulse' : ''}`}
                                    style={{
                                        top: getPositionStyle(settings.position).top,
                                        left: getPositionStyle(settings.position).left,
                                        right: getPositionStyle(settings.position).right,
                                        bottom: getPositionStyle(settings.position).bottom,
                                        transform: getPositionStyle(settings.position).transform,
                                        opacity: settings.opacity / 100,
                                        width: `${settings.scale}%`,
                                        height: 'auto'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default WatermarkSettings;
