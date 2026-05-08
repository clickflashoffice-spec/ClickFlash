
import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import Spinner from './common/Spinner';
import PageHeader from './common/PageHeader';
import { marketingService, Campaign, CampaignAnalytics } from '../services/api/marketingService';
import { Photographer } from '../types';
import CampaignEditor from './marketing/CampaignEditor';

interface MarketingDashboardProps {
    currentUser?: Photographer;
}

const MarketingDashboard: React.FC<MarketingDashboardProps> = ({ currentUser: _currentUser }) => {
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [showTestModal, setShowTestModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [campaignsData, analyticsData] = await Promise.all([
                marketingService.getCampaigns(),
                marketingService.getAnalytics()
            ]);
            // Validate campaigns data to ensure bodyTemplate is string
            const validatedCampaigns = campaignsData.map(c => ({
                ...c,
                bodyTemplate: typeof c.bodyTemplate === 'string' ? c.bodyTemplate : ''
            }));
            setCampaigns(validatedCampaigns);
            setAnalytics(analyticsData);
        } catch (error) {
            logger.error('Failed to load marketing data', error instanceof Error ? error : undefined);
        } finally {
            setLoading(false);
        }
    };

    const toggleCampaignStatus = async (campaignId: string, isActive: boolean) => {
        try {
            setSaving(true);
            await marketingService.toggleCampaignStatus(campaignId, isActive);
            setCampaigns(prev =>
                prev.map(c => c.id === campaignId ? { ...c, isActive } : c)
            );
            logger.info(`Campaign ${campaignId} ${isActive ? 'enabled' : 'disabled'}`);
        } catch (error) {
            logger.error('Failed to toggle campaign', error instanceof Error ? error : undefined);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
        if (!window.confirm(`Are you sure you want to delete "${campaignName}"?\n\nThis action cannot be undone.`)) {
            return;
        }
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

    const getCampaignTypeColor = (type: Campaign['type']) => {
        switch (type) {
            case 'post-event': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
            case 'abandoned-cart': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
            case 're-engagement': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
            case 'retention': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const getCampaignTypeIcon = (type: Campaign['type']) => {
        switch (type) {
            case 'post-event': return '📸';
            case 'abandoned-cart': return '🛒';
            case 're-engagement': return '💝';
            case 'retention': return '⏰';
            default: return '📧';
        }
    };

    const formatDelay = (minutes: number): string => {
        if (minutes < 60) return `${minutes} min`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)} hr`;
        return `${Math.floor(minutes / 1440)} days`;
    };

    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Spinner size="large" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-20">
            {/* Header */}
            <PageHeader
                title="Marketing Campaigns"
                subtitle="Automated email campaigns for customer engagement and retention."
                actions={
                    <button
                        onClick={() => { setSelectedCampaign(null); setIsEditorOpen(true); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Create Campaign
                    </button>
                }
            />

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Active Campaigns</div>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{analytics?.activeCampaigns || 0}</div>
                    <div className="text-xs text-slate-400 mt-2">of {analytics?.totalCampaigns || 0} total campaigns</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Total Sent</div>
                    <div className="text-4xl font-black text-blue-600 dark:text-blue-400">{analytics?.totalSent?.toLocaleString() || 0}</div>
                    <div className="text-xs text-slate-400 mt-2">Emails delivered</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Avg Open Rate</div>
                    <div className="text-4xl font-black text-green-600 dark:text-green-400">{analytics?.avgOpenRate || 0}%</div>
                    <div className="text-xs text-slate-400 mt-2">Industry avg: 21%</div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">Avg Click Rate</div>
                    <div className="text-4xl font-black text-purple-600 dark:text-purple-400">{analytics?.avgClickRate || 0}%</div>
                    <div className="text-xs text-slate-400 mt-2">Industry avg: 2.6%</div>
                </div>
            </div>

            {/* Campaigns List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                        </svg>
                        Active Campaigns
                    </h3>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {campaigns.map(campaign => (
                        <div key={campaign.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl">{getCampaignTypeIcon(campaign.type)}</span>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg">{campaign.name}</h4>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getCampaignTypeColor(campaign.type)}`}>
                                            {campaign.type}
                                        </span>
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded-full">
                                            Sends after {formatDelay(campaign.delayMinutes)}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">{campaign.subjectTemplate}</p>
                                    
                                    {campaign.totalSent !== undefined && campaign.totalSent > 0 && (
                                        <div className="flex gap-4 text-sm">
                                            <span className="text-slate-600 dark:text-slate-400">
                                                <strong className="text-slate-900 dark:text-white">{campaign.totalSent}</strong> sent
                                            </span>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                <strong className="text-green-600">{campaign.openRate}%</strong> opened
                                            </span>
                                            <span className="text-slate-600 dark:text-slate-400">
                                                <strong className="text-blue-600">{campaign.clickRate}%</strong> clicked
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { setSelectedCampaign(campaign); setShowTestModal(true); }}
                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                        title="Send Test Email"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => { setSelectedCampaign(campaign); setIsEditorOpen(true); }}
                                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                        title="Edit Campaign"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                                        disabled={deletingId === campaign.id}
                                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete Campaign"
                                    >
                                        {deletingId === campaign.id ? (
                                            <Spinner size="small" />
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={campaign.isActive}
                                                onChange={(e) => toggleCampaignStatus(campaign.id, e.target.checked)}
                                                disabled={saving}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                        </div>
                                        <span className={`text-sm font-medium ${campaign.isActive ? 'text-green-600' : 'text-slate-500'}`}>
                                            {campaign.isActive ? 'Active' : 'Paused'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How It Works */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30">
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    How Automated Campaigns Work
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                            <span className="text-blue-600 dark:text-blue-300 font-bold text-sm">1</span>
                        </div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Trigger</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">Event occurs (album published, cart abandoned)</p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                            <span className="text-blue-600 dark:text-blue-300 font-bold text-sm">2</span>
                        </div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Delay</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">Wait for configured time (1hr, 24hr, etc)</p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                            <span className="text-blue-600 dark:text-blue-300 font-bold text-sm">3</span>
                        </div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Send</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">Personalized email sent to customer</p>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-4">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                            <span className="text-blue-600 dark:text-blue-300 font-bold text-sm">4</span>
                        </div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Track</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">Monitor opens, clicks, and conversions</p>
                    </div>
                </div>
            </div>

            {/* Test Email Modal */}
            {showTestModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Send Test Email</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Test the &quot;{selectedCampaign.name}&quot; campaign
                        </p>
                        <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="Enter test email address"
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none mb-4"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowTestModal(false); setTestEmail(''); }}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendTest}
                                disabled={!testEmail}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Send Test
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Editor Modal */}
            <CampaignEditor
                campaign={selectedCampaign}
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={loadData}
            />
        </div>
    );
};

export default MarketingDashboard;
