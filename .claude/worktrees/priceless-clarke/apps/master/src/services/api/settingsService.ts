/**
 * Settings Service
 * 
 * Handles application settings operations
 */

import { pb } from '../pb';

export const settingsService = {
    /**
     * Get a setting by key
     */
    async getSetting(key: string): Promise<any> {
        try {
            const record = await pb.collection('settings').getOne(key);
            return record.value;
        } catch {
            return null;
        }
    },

    /**
     * Set a setting value
     */
    async setSetting(key: string, value: unknown): Promise<void> {
        try {
            await pb.collection('settings').update(key, { value });
        } catch {
            await pb.collection('settings').create({ key, value });
        }
    },

    /**
     * Upload logo file
     */
    async uploadLogo(file: File): Promise<{ success: boolean; url: string }> {
        const formData = new FormData();
        formData.append('logo', file);

        const response = await pb.request('/api/settings/logo', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to upload logo' }));
            throw new Error(errorData.message || 'Failed to upload logo');
        }

        return await response.json();
    },

    /**
     * Get logo URL
     */
    getLogoUrl(): string {
        return `${pb.baseUrlValue}/api/settings/logo`;
    }
};

