import React from 'react';
import Spinner from '../common/Spinner.tsx';

interface MoneyTrashConfigProps {
    enabled: boolean;
    setEnabled: (enabled: boolean) => void;
    retentionDays: number;
    handleRetentionDaysChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    price: number;
    handlePriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    watermarkEnabled: boolean;
    setWatermarkEnabled: (enabled: boolean) => void;
    watermarkOpacity: number;
    setWatermarkOpacity: (opacity: number) => void;
    validationErrors: Record<string, string>;
    saving: boolean;
    handleSave: () => void;
    triggerRetention: () => void;
}

export const MoneyTrashConfig: React.FC<MoneyTrashConfigProps> = ({
    enabled,
    setEnabled,
    retentionDays,
    handleRetentionDaysChange,
    price,
    handlePriceChange,
    watermarkEnabled,
    setWatermarkEnabled,
    watermarkOpacity,
    setWatermarkOpacity,
    validationErrors,
    saving,
    handleSave,
    triggerRetention
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Configuration
                </h3>
            </div>
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <div>
                        <div className="font-medium text-slate-900 dark:text-white text-lg">Enable MoneyTrash</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Automatically upload unsold photos after retention period</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={e => setEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Retention Period (Days)
                            <span className="text-xs font-normal text-slate-500 ml-2">(1-365)</span>
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={365}
                            value={retentionDays}
                            onChange={handleRetentionDaysChange}
                            className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-4 py-2.5 focus:ring-2 focus:border-blue-500 outline-none transition-all ${validationErrors.retentionDays
                                ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
                                : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
                                }`}
                        />
                        {validationErrors.retentionDays ? (
                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {validationErrors.retentionDays}
                            </p>
                        ) : (
                            <p className="text-xs text-slate-500 mt-1">Photos older than this will be watermarked and uploaded to the cloud gallery.</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Price Per Photo (€)
                            <span className="text-xs font-normal text-slate-500 ml-2">(0.01-999.99)</span>
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min={0.01}
                            max={999.99}
                            value={price}
                            onChange={handlePriceChange}
                            className={`w-full bg-slate-50 dark:bg-slate-900 border rounded-lg px-4 py-2.5 focus:ring-2 focus:border-blue-500 outline-none transition-all ${validationErrors.price
                                ? 'border-red-500 focus:ring-red-500 dark:border-red-500'
                                : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'
                                }`}
                        />
                        {validationErrors.price ? (
                            <p className="text-xs text-red-500 mt-1">{validationErrors.price}</p>
                        ) : (
                            <p className="text-xs text-slate-500 mt-1">Sales price for single photo download in the customer gallery.</p>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 space-y-6">
                            <h4 className="font-medium text-slate-900 dark:text-white mb-4">Watermark Settings</h4>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">Enable Watermark</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Apply watermark to retention photos</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={watermarkEnabled}
                                        onChange={e => setWatermarkEnabled(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Watermark Opacity: {(watermarkOpacity * 100).toFixed(0)}%
                                </label>
                                <input
                                    type="range"
                                    min={0.1}
                                    max={1}
                                    step={0.1}
                                    value={watermarkOpacity}
                                    onChange={e => setWatermarkOpacity(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600"
                                />
                                <p className="text-xs text-slate-500 mt-1">Higher opacity = more visible watermark</p>
                            </div>
                        </div>

                        <div className="lg:w-72">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Live Preview</label>
                            <div className="aspect-video relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900">
                                <img
                                    src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=300&auto=format&fit=crop"
                                    alt="Preview"
                                    className="w-full h-full object-cover opacity-60"
                                />
                                {watermarkEnabled && (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-opacity duration-200"
                                        style={{ opacity: watermarkOpacity }}
                                    >
                                        <div className="border-4 border-white/80 p-4 rotate-[-30deg]">
                                            <span className="text-white/80 font-black text-2xl tracking-widest uppercase">
                                                CLICKFLASH
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[10px] text-white">
                                    Sample Rendering
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end pt-6 border-t border-slate-200 dark:border-slate-700 gap-3">
                    <button
                        onClick={triggerRetention}
                        disabled={!enabled}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Trigger Manual Scan
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Spinner size="small" className="border-white" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Save Configuration
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
