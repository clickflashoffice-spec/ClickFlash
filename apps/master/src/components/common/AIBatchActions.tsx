import React from 'react';
import { Sparkles, Crop, User, X, Loader2 } from 'lucide-react';
// @ts-ignore — useAIBatch not yet implemented
import { useAIBatch } from '../hooks/useAIBatch';
// @ts-ignore — aiBatchService not yet implemented
import { AIBatchOperation } from '../services/aiBatchService';

interface AIBatchActionsProps {
    selectedPhotoIds: string[];
    onClose: () => void;
}

const AIBatchActions: React.FC<AIBatchActionsProps> = ({ selectedPhotoIds, onClose }) => {
    const { submitBatchJob, jobs, isProcessing } = useAIBatch();
    const [activeOperation, setActiveOperation] = React.useState<AIBatchOperation | null>(null);

    const handleBatchAction = async (operation: AIBatchOperation) => {
        if (selectedPhotoIds.length === 0) return;

        setActiveOperation(operation);
        try {
            await submitBatchJob(selectedPhotoIds, operation);
        } catch (error) {
            console.error('Batch action failed:', error);
        } finally {
            setActiveOperation(null);
        }
    };

    const currentJob = jobs.find((j: any) => j.status === 'processing');

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-purple-500" />
                        AI Batch Actions
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    {selectedPhotoIds.length} photo{selectedPhotoIds.length !== 1 ? 's' : ''} selected
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => handleBatchAction('auto-enhance')}
                        disabled={isProcessing || activeOperation !== null}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-900 dark:text-white">Auto-Enhance</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Optimize exposure, contrast & color</div>
                        </div>
                        {activeOperation === 'auto-enhance' && <Loader2 className="w-5 h-5 animate-spin" />}
                    </button>

                    <button
                        onClick={() => handleBatchAction('smart-crop')}
                        disabled={isProcessing || activeOperation !== null}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Crop className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-900 dark:text-white">Smart Crop</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">AI-driven composition framing</div>
                        </div>
                        {activeOperation === 'smart-crop' && <Loader2 className="w-5 h-5 animate-spin" />}
                    </button>

                    <button
                        onClick={() => handleBatchAction('face-retouch')}
                        disabled={isProcessing || activeOperation !== null}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-900 dark:text-white">Face Retouch</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400">Skin smoothing & enhancement</div>
                        </div>
                        {activeOperation === 'face-retouch' && <Loader2 className="w-5 h-5 animate-spin" />}
                    </button>
                </div>

                {currentJob && (
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Processing...</span>
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{currentJob.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                                style={{ width: `${currentJob.progress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIBatchActions;
