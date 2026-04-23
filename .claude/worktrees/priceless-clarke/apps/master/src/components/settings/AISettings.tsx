import React from 'react';
import Card from '../common/Card';
import useSystemSetting from '../../hooks/useSystemSetting';

const AISettings: React.FC = () => {
    // Migrated from localStorage to DB 'ai_processing' namespace
    const [aiConfig, setAiConfig] = useSystemSetting('ai_processing', {
        smartCulling: true,
        generativeEdit: false,
        autoTagging: false,
        apiKey: ''
    });

    const handleToggle = (key: keyof typeof aiConfig) => {
        setAiConfig({ ...aiConfig, [key]: !aiConfig[key] });
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI & Processing</h2>
                <p className="text-slate-500 dark:text-slate-400">Configure intelligent features and automation.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Smart Culling
                    </h3>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">Enable Smart Culling</p>
                            <p className="text-xs text-slate-500">Automatically flag blurry or closed-eye photos during import.</p>
                        </div>
                        <button
                            onClick={() => handleToggle('smartCulling')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiConfig.smartCulling ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            aria-label={aiConfig.smartCulling ? "Disable Smart Culling" : "Enable Smart Culling"}
                            title={aiConfig.smartCulling ? "Disable Smart Culling" : "Enable Smart Culling"}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiConfig.smartCulling ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        Generative Edit
                    </h3>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">Enable Generative Fill</p>
                            <p className="text-xs text-slate-500">Allow AI object removal and background expansion.</p>
                        </div>
                        <button
                            onClick={() => handleToggle('generativeEdit')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiConfig.generativeEdit ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            aria-label={aiConfig.generativeEdit ? "Disable Generative Edit" : "Enable Generative Edit"}
                            title={aiConfig.generativeEdit ? "Disable Generative Edit" : "Enable Generative Edit"}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiConfig.generativeEdit ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        Auto-Tagging
                    </h3>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">Enable Auto-Tagging</p>
                            <p className="text-xs text-slate-500">Suggest album titles and categories based on content.</p>
                        </div>
                        <button
                            onClick={() => handleToggle('autoTagging')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${aiConfig.autoTagging ? 'bg-green-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            aria-label={aiConfig.autoTagging ? "Disable Auto-Tagging" : "Enable Auto-Tagging"}
                            title={aiConfig.autoTagging ? "Disable Auto-Tagging" : "Enable Auto-Tagging"}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aiConfig.autoTagging ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {aiConfig.autoTagging && (
                        <div className="mt-4 animate-fadeIn">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gemini API Key</label>
                            <input
                                type="password"
                                value={aiConfig.apiKey}
                                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                                placeholder="Enter API Key"
                            />
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AISettings;
