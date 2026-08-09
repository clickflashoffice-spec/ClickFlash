import { Spinner } from "@clickflash/ui";

import React, { useState, useEffect } from 'react';
import { marketingService, Campaign } from '../../services/api/marketingService';
import { logger } from '../../utils/logger';

interface CampaignEditorProps {
    campaign: Campaign | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

const TRIGGER_EVENTS = [
    { value: 'album_published', label: '📸 Album Published', description: 'When a new album is marked as finalized' },
    { value: 'cart_abandoned', label: '🛒 Cart Abandoned', description: 'When customer leaves without completing purchase' },
    { value: 'photo_expiring', label: '⏰ Photos Expiring', description: 'When photos approach MoneyTrash retention date' },
    { value: 'order_completed', label: '✅ Order Completed', description: 'After customer receives their photos' },
    { value: 'manual', label: '👤 Manual Only', description: 'No automation - send manually only' }
];

const DELAY_PRESETS = [
    { value: 15, label: '15 minutes' },
    { value: 60, label: '1 hour' },
    { value: 180, label: '3 hours' },
    { value: 360, label: '6 hours' },
    { value: 720, label: '12 hours' },
    { value: 1440, label: '1 day' },
    { value: 2880, label: '2 days' },
    { value: 4320, label: '3 days' },
    { value: 10080, label: '1 week' },
    { value: 20160, label: '2 weeks' }
];

const VARIABLES = [
    { code: '{{clientName}}', description: 'Customer first name' },
    { code: '{{clientEmail}}', description: 'Customer email address' },
    { code: '{{albumTitle}}', description: 'Album/event name' },
    { code: '{{albumDate}}', description: 'Event date' },
    { code: '{{galleryUrl}}', description: 'Customer gallery link' },
    { code: '{{cartUrl}}', description: 'Shopping cart link' },
    { code: '{{studioName}}', description: 'Your studio name' },
    { code: '{{price}}', description: 'Photo price' },
    { code: '{{days}}', description: 'Days until expiration' },
    { code: '{{orderNumber}}', description: 'Order reference number' }
];

export const CampaignEditor: React.FC<CampaignEditorProps> = ({
    campaign,
    isOpen,
    onClose,
    onSave
}) => {
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'settings' | 'content' | 'preview'>('settings');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [formData, setFormData] = useState<Partial<Campaign>>({
        name: '',
        type: 'post-event',
        triggerEvent: 'album_published',
        delayMinutes: 60,
        subjectTemplate: '',
        bodyTemplate: '',
        isActive: false
    });

    // Load campaign data when editing
    useEffect(() => {
        if (campaign) {
            // Ensure all string fields are valid strings
            setFormData({
                ...campaign,
                name: campaign.name || '',
                subjectTemplate: campaign.subjectTemplate || '',
                bodyTemplate: typeof campaign.bodyTemplate === 'string' ? campaign.bodyTemplate : getDefaultBodyTemplate(campaign.type || 'post-event'),
                type: campaign.type || 'post-event',
                triggerEvent: campaign.triggerEvent || 'album_published',
                delayMinutes: campaign.delayMinutes || 60
            });
        } else {
            // Default for new campaign
            setFormData({
                name: '',
                type: 'post-event',
                triggerEvent: 'album_published',
                delayMinutes: 60,
                subjectTemplate: 'Your photos are ready! 🎉',
                bodyTemplate: getDefaultBodyTemplate('post-event'),
                isActive: false
            });
        }
        setErrors({});
        setActiveTab('settings');
    }, [campaign, isOpen]);

    function getDefaultBodyTemplate(type: string): string {
        switch (type) {
            case 'post-event':
                return `Hi {{clientName}},\n\nGreat news! Your photos from {{albumTitle}} are now ready in your private gallery.\n\n📸 View Gallery: {{galleryUrl}}\n\nPhotos will be available for 30 days. Order prints and downloads directly from your gallery!\n\nBest regards,\n{{studioName}}`;
            case 'abandoned-cart':
                return `Hi {{clientName}},\n\nYou left some items in your cart. Don't miss out on these memories!\n\n🛒 Complete Your Order: {{cartUrl}}\n\nNeed help? Reply to this email and we'll assist you.\n\nBest regards,\n{{studioName}}`;
            case 'retention':
                return `Hi {{clientName}},\n\nYour photos from {{albumTitle}} will be archived in {{days}} days. This is your last chance to purchase them!\n\n💾 Buy Now - {{price}}/photo: {{galleryUrl}}\n\nAfter archiving, photos may not be recoverable.\n\nBest regards,\n{{studioName}}`;
            case 're-engagement':
                return `Hi {{clientName}},\n\nWe miss you! It's been a while since your last session with us.\n\n🎉 Book now and get 20% off your next session!\n\nView our availability: {{galleryUrl}}\n\nBest regards,\n{{studioName}}`;
            default:
                return `Hi {{clientName}},\n\n[Your message here]\n\nBest regards,\n{{studioName}}`;
        }
    }

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Campaign name is required';
        }

        if (!formData.subjectTemplate?.trim()) {
            newErrors.subjectTemplate = 'Subject line is required';
        }

        if (!formData.bodyTemplate?.trim()) {
            newErrors.bodyTemplate = 'Email body is required';
        }

        if (!formData.delayMinutes || formData.delayMinutes < 1) {
            newErrors.delayMinutes = 'Delay must be at least 1 minute';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            setActiveTab('settings');
            return;
        }

        try {
            setSaving(true);

            if (campaign?.id) {
                // Update existing
                await marketingService.updateCampaign(campaign.id, formData);
                logger.info('Campaign updated', { campaignId: campaign.id });
            } else {
                // Create new
                await marketingService.createCampaign(formData as Omit<Campaign, 'id'>);
                logger.info('Campaign created', { name: formData.name });
            }

            onSave();
            onClose();
        } catch (error) {
            logger.error('Failed to save campaign', error instanceof Error ? error : undefined);
            setErrors({ submit: 'Failed to save campaign. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handleTypeChange = (type: Campaign['type']) => {
        setFormData(prev => ({
            ...prev,
            type,
            triggerEvent: type === 'post-event' ? 'album_published' :
                type === 'abandoned-cart' ? 'cart_abandoned' :
                    type === 'retention' ? 'photo_expiring' : 'manual',
            bodyTemplate: getDefaultBodyTemplate(type)
        }));
    };

    const insertVariable = (variable: string) => {
        setFormData(prev => {
            const currentText = typeof prev.bodyTemplate === 'string' ? prev.bodyTemplate : '';
            return {
                ...prev,
                bodyTemplate: currentText + variable
            };
        });
    };

    const formatDelayDisplay = (minutes: number): string => {
        const preset = DELAY_PRESETS.find(p => p.value === minutes);
        if (preset) return preset.label;
        if (minutes < 60) return `${minutes} minutes`;
        if (minutes < 1440) return `${Math.floor(minutes / 60)} hours`;
        return `${Math.floor(minutes / 1440)} days`;
    };

    const renderPreview = (): string => {
        try {
            let preview = formData.bodyTemplate || '';
            // Safely replace template variables
            const safeReplace = (str: string, pattern: RegExp, replacement: string): string => {
                try {
                    return str.replace(pattern, replacement);
                } catch {
                    return str;
                }
            };

            preview = safeReplace(preview, /{{clientName}}/g, 'Sarah');
            preview = safeReplace(preview, /{{clientEmail}}/g, 'sarah@example.com');
            preview = safeReplace(preview, /{{albumTitle}}/g, 'Summer Wedding 2025');
            preview = safeReplace(preview, /{{albumDate}}/g, 'June 15, 2025');
            preview = safeReplace(preview, /{{galleryUrl}}/g, 'https://clickflash.com/gallery/abc123');
            preview = safeReplace(preview, /{{cartUrl}}/g, 'https://clickflash.com/cart/xyz789');
            preview = safeReplace(preview, /{{studioName}}/g, 'ClickFlash Photography');
            preview = safeReplace(preview, /{{price}}/g, '€4.99');
            preview = safeReplace(preview, /{{days}}/g, '5');
            preview = safeReplace(preview, /{{orderNumber}}/g, 'CF-2025-001');

            return preview;
        } catch (error) {
            logger.error('Error rendering preview', error instanceof Error ? error : undefined);
            return formData.bodyTemplate || '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            {campaign ? 'Edit Campaign' : 'Create Campaign'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {campaign ? `Editing: ${campaign.name}` : 'Set up automated email campaigns'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        title="Close Editor"
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    {[
                        { id: 'settings', label: 'Settings', icon: '⚙️' },
                        { id: 'content', label: 'Email Content', icon: '✉️' },
                        { id: 'preview', label: 'Preview', icon: '👁️' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 px-6 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === tab.id
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {errors.submit && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                            {errors.submit}
                        </div>
                    )}

                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            {/* Campaign Name */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Campaign Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Gallery Ready - 1 Hour"
                                    className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                            </div>

                            {/* Campaign Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                    Campaign Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: 'post-event', label: 'Post-Event', icon: '📸', desc: 'After photos are ready' },
                                        { id: 'abandoned-cart', label: 'Abandoned Cart', icon: '🛒', desc: 'Recover lost sales' },
                                        { id: 'retention', label: 'Retention', icon: '⏰', desc: 'Before photos expire' },
                                        { id: 're-engagement', label: 'Re-engagement', icon: '💝', desc: 'Win back old customers' }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => handleTypeChange(type.id as Campaign['type'])}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${formData.type === type.id
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="text-2xl mb-2">{type.icon}</div>
                                            <div className="font-semibold text-slate-900 dark:text-white">{type.label}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{type.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Trigger Event */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Trigger Event
                                </label>
                                <select
                                    value={formData.triggerEvent}
                                    onChange={e => setFormData(prev => ({ ...prev, triggerEvent: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {TRIGGER_EVENTS.map(event => (
                                        <option key={event.value} value={event.value}>
                                            {event.label} - {event.description}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Delay */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Send Delay
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {DELAY_PRESETS.map(preset => (
                                        <button
                                            key={preset.value}
                                            onClick={() => setFormData(prev => ({ ...prev, delayMinutes: preset.value }))}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${formData.delayMinutes === preset.value
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    Selected: {formatDelayDisplay(formData.delayMinutes || 60)}
                                </p>
                            </div>

                            {/* Active Status */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                <div>
                                    <div className="font-medium text-slate-900 dark:text-white">Activate Campaign</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">Start sending emails automatically</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={e => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Content Tab */}
                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            {/* Subject Line */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Subject Line *
                                </label>
                                <input
                                    type="text"
                                    value={formData.subjectTemplate || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, subjectTemplate: e.target.value }))}
                                    placeholder="e.g., Your photos are ready! 🎉"
                                    className={`w-full px-4 py-2.5 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all ${errors.subjectTemplate ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                />
                                {errors.subjectTemplate && <p className="mt-1 text-sm text-red-500">{errors.subjectTemplate}</p>}
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Tip: Use emojis and keep under 50 characters for best open rates
                                </p>
                            </div>

                            {/* Variables */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Insert Variables
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {VARIABLES.map(variable => (
                                        <button
                                            key={variable.code}
                                            onClick={() => insertVariable(variable.code)}
                                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                            title={variable.description}
                                        >
                                            {variable.code}
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                    Click to insert variables that will be replaced with actual customer data
                                </p>
                            </div>

                            {/* Email Body */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Email Body *
                                </label>
                                <textarea
                                    value={formData.bodyTemplate || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, bodyTemplate: e.target.value }))}
                                    rows={12}
                                    placeholder="Enter your email content..."
                                    className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm ${errors.bodyTemplate ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                />
                                {errors.bodyTemplate && <p className="mt-1 text-sm text-red-500">{errors.bodyTemplate}</p>}
                            </div>

                            {/* Tips */}
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    Writing Tips
                                </h4>
                                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                                    <li>Keep it personal - use {'{{clientName}}'} to address the customer</li>
                                    <li>Include clear call-to-action links ({'{{galleryUrl}}'}, {'{{cartUrl}}'})</li>
                                    <li>For retention emails, create urgency about expiration</li>
                                    <li>Always include your studio name {'{{studioName}}'}</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Preview Tab */}
                    {activeTab === 'preview' && (
                        <div className="space-y-6">
                            {/* Subject Preview */}
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl">
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-2">Subject</div>
                                <div className="text-slate-900 dark:text-white font-medium">
                                    {formData.subjectTemplate || '(No subject)'}
                                </div>
                            </div>

                            {/* Email Preview */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 ml-2">Email Preview</div>
                                </div>
                                <div className="p-6 whitespace-pre-wrap text-slate-800 dark:text-slate-200 font-sans leading-relaxed">
                                    {renderPreview()}
                                </div>
                            </div>

                            {/* Variable Legend */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                                <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Variable Values (Sample)</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    {VARIABLES.map(v => (
                                        <div key={v.code} className="flex justify-between py-1">
                                            <code className="text-blue-600 dark:text-blue-400">{v.code}</code>
                                            <span className="text-slate-600 dark:text-slate-400">{v.description}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <div className="flex gap-3">
                        {campaign && (
                            <button
                                onClick={() => {
                                    setActiveTab('preview');
                                }}
                                className="px-6 py-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-medium rounded-lg transition-colors"
                            >
                                Send Test
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Spinner size="small" className="border-white" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {campaign ? 'Save Changes' : 'Create Campaign'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignEditor;
