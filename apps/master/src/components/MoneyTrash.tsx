import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../utils/logger.ts';
import { cloudService } from '../services/api/cloudService';
import Spinner from './common/Spinner.tsx';
import { UploadErrorBoundary } from './UploadErrorBoundary.tsx';
import { MoneyTrashHeader } from './moneytrash/MoneyTrashHeader';
import { MoneyTrashStats } from './moneytrash/MoneyTrashStats';
import { MoneyTrashConfig } from './moneytrash/MoneyTrashConfig';
import { MoneyTrashQueue } from './moneytrash/MoneyTrashQueue';
import { MoneyTrashCandidates } from './moneytrash/MoneyTrashCandidates';
import { MoneyTrashGuide } from './moneytrash/MoneyTrashGuide';
import { Photographer } from '../types.ts';

interface MoneyTrashProps {
    currentUser?: Photographer;
}

interface QueueStats {
    retention: number;
    fulfillment: number;
    retentionProgress?: number;
    fulfillmentProgress?: number;
}

interface MoneyTrashSyncStats {
    enabled?: boolean;
    retentionDays?: number;
    price?: number;
    status?: 'idle' | 'syncing' | 'paused' | 'error';
    lastSync?: string;
    error?: string;
    queues?: QueueStats;
}

interface RetentionCandidate {
    id: string;
    name: string;
    url: string;
    albumId: string;
    albumTitle: string;
    created_at: string;
}

const MoneyTrash: React.FC<MoneyTrashProps> = ({ currentUser }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState<MoneyTrashSyncStats | null>(null);
    const [cloudStatus, setCloudStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [candidates, setCandidates] = useState<RetentionCandidate[]>([]);
    const [showCandidates, setShowCandidates] = useState(false);
    const [lastError, setLastError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Config State
    const [enabled, setEnabled] = useState(false);
    const [retentionDays, setRetentionDays] = useState(7);
    const [price, setPrice] = useState(4.99);
    const [watermarkEnabled, setWatermarkEnabled] = useState(true);
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Refs for intervals
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch all data
    const fetchData = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setLastError(null);

            // Fetch stats and config from backend
            const statsData = await cloudService.getStats();

            if (statsData) {
                // Update config states from backend
                setEnabled(statsData.enabled ?? false);
                setRetentionDays(Math.round(statsData.retentionDays ?? 7));
                setPrice(statsData.price ? Number(statsData.price) : 4.99);

                setStats({
                    enabled: statsData.enabled,
                    retentionDays: statsData.retentionDays,
                    price: Number(statsData.price),
                    status: statsData.status,
                    queues: statsData.queues || { retention: 0, fulfillment: 0 },
                    lastSync: statsData.lastSync,
                    error: statsData.error
                });
            } else {
                setStats({
                    enabled: false,
                    queues: { retention: 0, fulfillment: 0 },
                    status: 'idle'
                });
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to fetch stats';
            logger.error('Failed to fetch MoneyTrash stats', e instanceof Error ? e : undefined);
            setLastError(errorMsg);
            setStats(prev => ({
                ...prev,
                enabled: false,
                status: 'error',
                error: errorMsg
            }));
        } finally {
            if (showLoading) setLoading(false);
        }
    }, []);

    // Fetch candidates for retention
    const fetchCandidates = useCallback(async () => {
        try {
            const data = await cloudService.getCandidates();
            setCandidates(data || []);
        } catch (e) {
            logger.error('Failed to fetch candidates', e instanceof Error ? e : undefined);
            setCandidates([]);
        }
    }, []);

    // Check cloud status
    const checkCloudStatus = useCallback(async () => {
        try {
            const data = await cloudService.getStatus();
            setCloudStatus(data?.status === 'online' ? 'online' : 'offline');
        } catch {
            setCloudStatus('offline');
        }
    }, []);

    // Initial data fetch
    useEffect(() => {
        fetchData();
        checkCloudStatus();
        fetchCandidates();

        // Set up auto-refresh every 30 seconds
        refreshIntervalRef.current = setInterval(() => {
            fetchData(false);
            checkCloudStatus();
        }, 30000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
            if (successTimeoutRef.current) {
                clearTimeout(successTimeoutRef.current);
            }
        };
    }, [fetchData, checkCloudStatus, fetchCandidates]);

    // Validate field
    const validateField = (name: string, value: string | number | boolean | null): string | null => {
        switch (name) {
            case 'retentionDays':
                if (typeof value !== 'number' || isNaN(value)) {
                    return 'Retention days must be a valid number';
                }
                if (value < 1) return 'Retention days must be at least 1';
                if (value > 365) return 'Retention days cannot exceed 365';
                return null;
            case 'price':
                if (typeof value !== 'number' || isNaN(value)) {
                    return 'Price must be a valid number';
                }
                if (value < 0.01) return 'Price must be at least €0.01';
                if (value > 999.99) return 'Price cannot exceed €999.99';
                return null;
            case 'watermarkOpacity':
                if (typeof value !== 'number' || isNaN(value)) {
                    return 'Opacity must be a valid number';
                }
                if (value < 0.1) return 'Opacity must be at least 10%';
                if (value > 1) return 'Opacity cannot exceed 100%';
                return null;
            default:
                return null;
        }
    };

    // Handle retention days change with validation
    const handleRetentionDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setRetentionDays(NaN);
            return;
        }
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            const clampedValue = Math.max(1, Math.min(365, numValue));
            setRetentionDays(clampedValue);
            const error = validateField('retentionDays', clampedValue);
            setValidationErrors(prev => ({ ...prev, retentionDays: error || '' }));
        }
    };

    // Handle price change with validation
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            setPrice(value);
            const error = validateField('price', value);
            setValidationErrors(prev => ({ ...prev, price: error || '' }));
        }
    };

    // Handle save configuration
    const handleSave = async () => {
        try {
            // Validate all fields before saving
            const errors: Record<string, string> = {};
            const retentionError = validateField('retentionDays', retentionDays);
            if (retentionError) errors.retentionDays = retentionError;
            const priceError = validateField('price', price);
            if (priceError) errors.price = priceError;
            const opacityError = validateField('watermarkOpacity', watermarkOpacity);
            if (opacityError) errors.watermarkOpacity = opacityError;

            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                setLastError('Please fix validation errors before saving');
                return;
            }

            setSaving(true);
            setLastError(null);

            // Ensure retentionDays is a valid number before sending
            const sanitizedRetentionDays = Math.max(1, Math.min(365, Math.round(retentionDays || 7)));
            const sanitizedPrice = Math.max(0.01, Math.min(999.99, price || 4.99));

            const payload = {
                moneytrash: {
                    enabled,
                    retentionDays: sanitizedRetentionDays,
                    price: sanitizedPrice.toFixed(2),
                    watermarkEnabled,
                    watermarkOpacity
                }
            };

            const response = await fetch('/api/network/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to save settings');
            }

            // Refresh stats to ensure backend synced
            await fetchData(false);

            // Show success state
            setSaveSuccess(true);
            successTimeoutRef.current = setTimeout(() => setSaveSuccess(false), 3000);

            logger.info('MoneyTrash settings saved', { userId: currentUser?.id });
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to save settings';
            setLastError(errorMsg);
            logger.error('Failed to save MoneyTrash settings', e instanceof Error ? e : undefined);
        } finally {
            setSaving(false);
        }
    };

    // Toggle pause/resume
    const togglePause = async () => {
        try {
            const action = stats?.status === 'paused' ? 'resume' : 'pause';
            const response = await fetch(`/api/cloud/queue/${action}`, { method: 'POST' });

            if (!response.ok) throw new Error(`Failed to ${action} queue`);

            await fetchData(false);
            logger.info(`MoneyTrash queue ${action}d`, { userId: currentUser?.id });
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to toggle queue';
            setLastError(errorMsg);
            logger.error('Failed to toggle MoneyTrash queue', e instanceof Error ? e : undefined);
        }
    };

    // Purge queue
    const purgeQueue = async () => {
        if (!window.confirm('Are you sure? This will remove all pending photos from the upload queue.\n\nThis action cannot be undone.')) return;

        try {
            const response = await fetch('/api/cloud/queue/purge', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to purge queue');

            await fetchData(false);
            logger.info('MoneyTrash queue purged', { userId: currentUser?.id });
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to purge queue';
            setLastError(errorMsg);
            logger.error('Failed to purge MoneyTrash queue', e instanceof Error ? e : undefined);
        }
    };

    // Trigger retention batch
    const triggerRetention = async () => {
        try {
            await cloudService.triggerRetention();
            logger.info('MoneyTrash retention batch triggered', { userId: currentUser?.id });

            // Refresh stats after trigger
            setTimeout(() => {
                fetchData(false);
                fetchCandidates();
            }, 1000);
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to trigger retention';
            setLastError(errorMsg);
            logger.error('Failed to trigger retention', e instanceof Error ? e : undefined);
        }
    };

    // Handle candidate action
    const handleCandidateAction = async (photoId: string, action: 'exclude' | 'upload' | 'delete') => {
        try {
            await cloudService.processCandidate(photoId, action);
            logger.info(`Candidate ${action}d`, { photoId });

            // Refresh candidates list
            await fetchCandidates();
            await fetchData(false);
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : `Failed to ${action} candidate`;
            setLastError(errorMsg);
            logger.error(`Failed to ${action} candidate`, e instanceof Error ? e : undefined);
        }
    };

    // Format date
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleString();
    };



    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Spinner size="large" />
            </div>
        );
    }

    return (
        <UploadErrorBoundary onReset={() => fetchData()}>
            <div className="space-y-6 animate-fadeIn pb-20">
                <MoneyTrashHeader
                    enabled={enabled}
                    cloudStatus={cloudStatus}
                    status={stats?.status || 'idle'}
                />

                {lastError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-red-700 dark:text-red-300">{lastError}</p>
                        <button
                            onClick={() => setLastError(null)}
                            className="ml-auto text-red-500 hover:text-red-700"
                            aria-label="Close error message"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                )}

                {saveSuccess && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-green-700 dark:text-green-300 font-medium">Settings saved successfully!</p>
                    </div>
                )}

                <MoneyTrashQueue
                    status={stats?.status || 'idle'}
                    lastSync={stats?.lastSync}
                    onRefresh={() => { fetchData(); fetchCandidates(); }}
                    onTogglePause={togglePause}
                    onPurge={purgeQueue}
                    enabled={enabled}
                    retentionSize={stats?.queues?.retention || 0}
                    formatDate={formatDate}
                />

                <MoneyTrashStats
                    queues={stats?.queues}
                    price={price}
                />

                <MoneyTrashConfig
                    enabled={enabled}
                    setEnabled={setEnabled}
                    retentionDays={retentionDays}
                    handleRetentionDaysChange={handleRetentionDaysChange}
                    price={price}
                    handlePriceChange={handlePriceChange}
                    watermarkEnabled={watermarkEnabled}
                    setWatermarkEnabled={setWatermarkEnabled}
                    watermarkOpacity={watermarkOpacity}
                    setWatermarkOpacity={setWatermarkOpacity}
                    triggerRetention={triggerRetention}
                    handleSave={handleSave}
                    saving={saving}
                    validationErrors={validationErrors}
                />

                <MoneyTrashCandidates
                    candidates={candidates}
                    showCandidates={showCandidates}
                    setShowCandidates={setShowCandidates}
                    retentionDays={retentionDays}
                    onAction={handleCandidateAction}
                />

                <MoneyTrashGuide
                    retentionDays={retentionDays}
                    price={price}
                />
            </div>
        </UploadErrorBoundary>
    );
};

export default MoneyTrash;
