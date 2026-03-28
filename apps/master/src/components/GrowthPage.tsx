
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '../utils/logger';
import { cloudService } from '../services/api/cloudService';
import { marketingService, Campaign, CampaignAnalytics } from '../services/api/marketingService';
import Spinner from './common/Spinner';
import PageHeader from './common/PageHeader';
import { UploadErrorBoundary } from './UploadErrorBoundary';
import { Photographer } from '../types';
import CampaignEditor from './marketing/CampaignEditor';

interface GrowthPageProps {
    currentUser?: Photographer;
}

// MoneyTrash / Retention Types
interface MoneyTrashStats {
    enabled?: boolean;
    retentionDays?: number;
    price?: number;
    status?: 'idle' | 'syncing' | 'paused' | 'error';
    lastSync?: string;
    error?: string;
    queues?: {
        retention: number;
        fulfillment: number;
        retentionProgress?: number;
        fulfillmentProgress?: number;
    };
}

interface RetentionCandidate {
    id: string;
    name: string;
    url: string;
    albumId: string;
    albumTitle: string;
    created_at: string;
}

const GrowthPage: React.FC<GrowthPageProps> = ({ currentUser }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'campaigns' | 'retention'>('campaigns');

    // --- Marketing State ---
    const [marketingLoading, setMarketingLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [marketingAnalytics, setMarketingAnalytics] = useState<CampaignAnalytics | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [showTestModal, setShowTestModal] = useState(false);
    const [marketingSaving, setMarketingSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // --- Retention State ---
    const [retentionLoading, setRetentionLoading] = useState(true);
    const [retentionStats, setRetentionStats] = useState<MoneyTrashStats | null>(null);
    const [cloudStatus, setCloudStatus] = useState<'online' | 'offline' | 'checking'>('checking');
    const [candidates, setCandidates] = useState<RetentionCandidate[]>([]);
    const [showCandidates, setShowCandidates] = useState(false);
    const [retentionSuccess, setRetentionSuccess] = useState(false);
    const [retentionError, setRetentionError] = useState<string | null>(null);

    // Config State (Retention)
    const [retentionEnabled, setRetentionEnabled] = useState(false);
    const [retentionDays, setRetentionDays] = useState(7);
    const [retentionPrice, setRetentionPrice] = useState(4.99);
    const [retentionSaving, setRetentionSaving] = useState(false);
    const [watermarkEnabled, setWatermarkEnabled] = useState(true);
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);

    // Refs
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // -------------------------------------------------------------------------
    // Marketing Logic
    // -------------------------------------------------------------------------
    const loadMarketingData = async () => {
        try {
            setMarketingLoading(true);
            const [campaignsData, analyticsData] = await Promise.all([
                marketingService.getCampaigns(),
                marketingService.getAnalytics()
            ]);
            // Validate
            const validatedCampaigns = campaignsData.map(c => ({
                ...c,
                bodyTemplate: typeof c.bodyTemplate === 'string' ? c.bodyTemplate : ''
            }));
            setCampaigns(validatedCampaigns);
            setMarketingAnalytics(analyticsData);
        } catch (error) {
            logger.error('Failed to load marketing data', error instanceof Error ? error : undefined);
        } finally {
            setMarketingLoading(false);
        }
    };

    const toggleCampaignStatus = async (campaignId: string, isActive: boolean) => {
        try {
            setMarketingSaving(true);
            await marketingService.toggleCampaignStatus(campaignId, isActive);
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, isActive } : c));
            logger.info(`Campaign ${campaignId} ${isActive ? 'enabled' : 'disabled'}`);
        } catch (error) {
            logger.error('Failed to toggle campaign', error instanceof Error ? error : undefined);
        } finally {
            setMarketingSaving(false);
        }
    };

    const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${campaignName}"?\n\nThis action cannot be undone.`)) return;
        try {
            setDeletingId(campaignId);
            await marketingService.deleteCampaign(campaignId);
            setCampaigns(prev => prev.filter(c => c.id !== campaignId));
            logger.info('Campaign deleted', { campaignId });
        } catch (error) {
            logger.error('Failed to delete campaign', error instanceof Error ? error : undefined);
            alert('Failed to delete campaign');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSendTest = async () => {
        if (!selectedCampaign || !testEmail) return;
        try {
            await marketingService.sendTestEmail(selectedCampaign.id, testEmail);
            setShowTestModal(false);
            setTestEmail('');
            alert('Test email sent!');
        } catch (error) {
            alert('Failed to send test email');
        }
    };

    // -------------------------------------------------------------------------
    // Retention Logic
    // -------------------------------------------------------------------------
    const loadRetentionData = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setRetentionLoading(true);
            setRetentionError(null);

            const statsData = await cloudService.getStats();
            if (statsData) {
                setRetentionEnabled(statsData.enabled ?? false);
                setRetentionDays(Math.round(statsData.retentionDays ?? 7));
                setRetentionPrice(statsData.price ? Number(statsData.price) : 4.99);

                setRetentionStats({
                    enabled: statsData.enabled,
                    retentionDays: statsData.retentionDays,
                    price: Number(statsData.price),
                    status: statsData.status,
                    queues: statsData.queues || { retention: 0, fulfillment: 0 },
                    lastSync: statsData.lastSync,
                    error: statsData.error
                });
            } else {
                setRetentionStats({ enabled: false, queues: { retention: 0, fulfillment: 0 }, status: 'idle' });
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to fetch retention stats';
            logger.error('Failed to fetch MoneyTrash stats', e instanceof Error ? e : undefined);
            setRetentionError(msg);
        } finally {
            if (showLoading) setRetentionLoading(false);
        }
    }, []);

    const fetchCandidates = useCallback(async () => {
        try {
            const data = await cloudService.getCandidates();
            setCandidates(data || []);
        } catch (e) {
            setCandidates([]);
        }
    }, []);

    const checkCloudStatus = useCallback(async () => {
        try {
            const data = await cloudService.getStatus();
            setCloudStatus(data?.status === 'online' ? 'online' : 'offline');
        } catch (e) {
            setCloudStatus('offline');
        }
    }, []);

    const handleSaveRetention = async () => {
        try {
            setRetentionSaving(true);
            setRetentionError(null);

            const payload = {
                moneytrash: {
                    enabled: retentionEnabled,
                    retentionDays: Math.max(1, Math.min(365, Math.round(retentionDays || 7))),
                    price: Math.max(0.01, Math.min(999.99, retentionPrice || 4.99)).toFixed(2),
                    watermarkEnabled,
                    watermarkOpacity
                }
            };

            const response = await fetch('/api/network-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save settings');

            await loadRetentionData(false);
            setRetentionSuccess(true);
            setTimeout(() => setRetentionSuccess(false), 3000);
            logger.info('MoneyTrash settings saved', { userId: currentUser?.id });
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to save settings';
            setRetentionError(msg);
        } finally {
            setRetentionSaving(false);
        }
    };

    const triggerRetention = async () => {
        try {
            await cloudService.triggerRetention();
            logger.info('Retention batch triggered');
            setTimeout(() => { loadRetentionData(false); fetchCandidates(); }, 1000);
        } catch (e) {
            setRetentionError('Failed to trigger retention');
        }
    };

    const handleCandidateAction = async (photoId: string, action: 'exclude' | 'upload' | 'delete') => {
        try {
            await cloudService.processCandidate(photoId, action);
            await fetchCandidates();
            await loadRetentionData(false);
        } catch (e) {
            logger.error(`Failed to ${action} candidate`, e instanceof Error ? e : undefined);
        }
    };


    // -------------------------------------------------------------------------
    // Effects
    // -------------------------------------------------------------------------
    useEffect(() => {
        loadMarketingData();
        loadRetentionData();
        checkCloudStatus();
        fetchCandidates();

        refreshIntervalRef.current = setInterval(() => {
            if (activeTab === 'retention') {
                loadRetentionData(false);
                checkCloudStatus();
            }
        }, 30000);

        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [loadRetentionData, checkCloudStatus, fetchCandidates, activeTab]);


    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------
    const getCampaignTypeColor = (type: Campaign['type']) => {
        switch (type) {
            case 'post-event': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
            case 'abandoned-cart': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
            case 're-engagement': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
            case 'retention': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        Growth Hub
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage marketing campaigns and asset retention strategies.
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'campaigns'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Campaigns
                    </button>
                    <button
                        onClick={() => setActiveTab('retention')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'retention'
                                ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Retention (Money Trash)
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'campaigns' ? (
                    <motion.div
                        key="campaigns"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Marketing Analytics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* ... Analytics Cards ... */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Active Campaigns</div>
                                <div className="text-4xl font-black text-slate-900 dark:text-white">{marketingAnalytics?.activeCampaigns || 0}</div>
                                <div className="text-xs text-slate-400 mt-2">of {marketingAnalytics?.totalCampaigns || 0} total</div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Sent</div>
                                <div className="text-4xl font-black text-blue-600 dark:text-blue-400">{marketingAnalytics?.totalSent?.toLocaleString() || 0}</div>
                                <div className="text-xs text-slate-400 mt-2">Emails delivered</div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Avg Open Rate</div>
                                <div className="text-4xl font-black text-green-600 dark:text-green-400">{marketingAnalytics?.avgOpenRate || 0}%</div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Avg Click Rate</div>
                                <div className="text-4xl font-black text-purple-600 dark:text-purple-400">{marketingAnalytics?.avgClickRate || 0}%</div>
                            </div>
                        </div>

                        {/* Create Button */}
                        <div className="flex justify-end">
                            <button
                                onClick={() => { setSelectedCampaign(null); setIsEditorOpen(true); }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Create Campaign
                            </button>
                        </div>

                        {/* Campaigns List */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                {campaigns.map(campaign => (
                                    <div key={campaign.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">{campaign.name}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getCampaignTypeColor(campaign.type)}`}>
                                                        {campaign.type}
                                                    </span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">Subject: {campaign.subjectTemplate}</p>
                                                <div className="flex gap-4 text-sm text-slate-500">
                                                    <span>Delays: {campaign.delayMinutes}m</span>
                                                    <span>Sent: {campaign.totalSent}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => { setSelectedCampaign(campaign); setShowTestModal(true); }}
                                                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                                    title="Send Test"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedCampaign(campaign); setIsEditorOpen(true); }}
                                                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                                                    title="Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                                                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>

                                                <label className="flex items-center gap-2 cursor-pointer ml-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={campaign.isActive}
                                                        onChange={(e) => toggleCampaignStatus(campaign.id, e.target.checked)}
                                                        className="sr-only"
                                                    />
                                                    <span className={`text-sm font-bold ${campaign.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {campaign.isActive ? 'ON' : 'OFF'}
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {campaigns.length === 0 && (
                                    <div className="p-12 text-center text-slate-500">
                                        <p>No campaigns found. Create one to start.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="retention"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6"
                    >
                        {/* Retention Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Queue Size</div>
                                <div className="text-4xl font-black text-slate-900 dark:text-white">{retentionStats?.queues?.retention || 0}</div>
                                <div className="text-xs text-slate-400 mt-2">Photos pending upload</div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Potential Value</div>
                                <div className="text-4xl font-black text-green-600 dark:text-green-400">
                                    €{((retentionStats?.queues?.retention || 0) * retentionPrice).toFixed(2)}
                                </div>
                                <div className="text-xs text-slate-400 mt-2">@ €{retentionPrice} / photo</div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Status</div>
                                <div className={`text-xl font-bold uppercase ${retentionStats?.status === 'syncing' ? 'text-blue-500' : retentionStats?.status === 'paused' ? 'text-yellow-500' : 'text-green-500'}`}>
                                    {retentionStats?.status || 'Idle'}
                                </div>
                                <div className="text-xs text-slate-400 mt-2">
                                    Cloud: {cloudStatus === 'online' ? 'Online' : 'Offline'}
                                </div>
                            </div>
                        </div>

                        {/* Config Panel */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Strategy Settings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Retention (Days)</label>
                                    <input
                                        type="number"
                                        value={retentionDays}
                                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Price Per Photo (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={retentionPrice}
                                        onChange={(e) => setRetentionPrice(Number(e.target.value))}
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button
                                        onClick={handleSaveRetention}
                                        disabled={retentionSaving}
                                        className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                                    >
                                        {retentionSaving ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>

                            {/* Toggle Enable */}
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Auto-Retention System</h4>
                                    <p className="text-sm text-slate-500">Automatically upload unsold photos to the cloud gallery for later purchase.</p>
                                </div>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{retentionEnabled ? 'Enabled' : 'Disabled'}</span>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={retentionEnabled}
                                            onChange={(e) => setRetentionEnabled(e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Candidates List */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div
                                className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center cursor-pointer"
                                onClick={() => setShowCandidates(!showCandidates)}
                            >
                                <h3 className="font-bold text-slate-900 dark:text-white">Retention Candidates ({candidates.length})</h3>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${showCandidates ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                            {showCandidates && (
                                <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {candidates.map(candidate => (
                                        <div key={candidate.id} className="relative group rounded-lg overflow-hidden aspect-square">
                                            <img src={candidate.url} alt={candidate.name} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleCandidateAction(candidate.id, 'upload')}
                                                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
                                                    title="Upload"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleCandidateAction(candidate.id, 'exclude')}
                                                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                    title="Exclude"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {candidates.length === 0 && (
                                        <p className="col-span-full text-center text-slate-500">No candidates found.</p>
                                    )}
                                </div>
                            )}
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* Test Email Modal */}
            {showTestModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Send Test Email</h3>
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Enter test email address"
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowTestModal(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400">Cancel</button>
                            <button onClick={handleSendTest} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">Send Test</button>
                        </div>
                    </div>
                </div>
            )}

            <CampaignEditor
                campaign={selectedCampaign}
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={loadMarketingData}
            />
        </div>
    );
};

export default GrowthPage;
