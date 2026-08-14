import { pb } from '../pb';

export interface CloudStatus {
    status: 'online' | 'offline';
    success?: boolean;
    msg?: string;
}

export interface CloudStats {
    enabled: boolean;
    status: 'idle' | 'syncing' | 'paused' | 'error';
    retentionDays: number;
    price: string;
    queues: {
        retention: number;
        fulfillment: number;
        retentionProgress?: number;
        fulfillmentProgress?: number;
    };
    lastSync: string;
    error?: string;
}

export interface RetentionCandidate {
    id: string;
    name: string;
    url: string;
    albumId: string;
    albumTitle: string;
    created_at: string;
}

/**
 * Cloud Service API
 * 
 * Provides methods for interacting with cloud synchronization,
 * retention queue management, and MoneyTrash functionality.
 */
export const cloudService = {
    /**
     * Get cloud service status
     * @returns Cloud connection status
     */
    getStatus: async (): Promise<any> => {
        const response = await pb.request('/api/cloud/status');
        if (!response.ok) throw new Error('Failed to fetch cloud status');
        return response.json();
    },

    getStats: async (): Promise<any> => {
        const response = await pb.request('/api/analytics/dashboard');
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    },

    /**
     * Get retention candidates
     * @returns List of photos eligible for retention upload
     */
    getCandidates: async (): Promise<RetentionCandidate[]> => {
        const response = await pb.request('/api/cloud/candidates');
        if (!response.ok) throw new Error('Failed to fetch retention candidates');
        return response.json();
    },

    /**
     * Process a retention candidate
     * @param id - Photo ID
     * @param action - Action to perform ('exclude', 'upload', 'delete')
     */
    processCandidate: async (id: string, action: 'exclude' | 'upload' | 'delete'): Promise<{ success: boolean }> => {
        const response = await pb.request(`/api/cloud/candidates/${id}/action`, {
            method: 'POST',
            body: JSON.stringify({ action })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `Failed to ${action} candidate`);
        }
        return response.json();
    },

    /**
     * Sync a specific album to cloud
     * @param albumId - Album ID to sync
     */
    syncAlbum: async (albumId: string): Promise<{ success: boolean; message?: string }> => {
        const response = await pb.request(`/api/cloud/sync/album/${albumId}`, {
            method: 'POST'
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to sync album');
        }
        return response.json();
    },

    triggerSync: async (): Promise<{ success: boolean; message: string }> => {
        const response = await pb.request('/api/cloud/sync', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to trigger sync');
        return response.json();
    },

    /**
     * Trigger retention batch processing
     */
    triggerRetention: async (): Promise<{ success: boolean; message: string }> => {
        const response = await pb.request('/api/cloud/retention', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to trigger retention batch');
        return response.json();
    },

    /**
     * Pause cloud sync queue
     */
    pauseQueue: async (): Promise<{ success: boolean; message: string }> => {
        const response = await pb.request('/api/cloud/queue/pause', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to pause queue');
        return response.json();
    },

    /**
     * Resume cloud sync queue
     */
    resumeQueue: async (): Promise<{ success: boolean; message: string }> => {
        const response = await pb.request('/api/cloud/queue/resume', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to resume queue');
        return response.json();
    },

    /**
     * Purge cloud sync queue
     */
    purgeQueue: async (): Promise<{ success: boolean; message: string }> => {
        const response = await pb.request('/api/cloud/queue/purge', { method: 'POST' });
        if (!response.ok) throw new Error('Failed to purge queue');
        return response.json();
    }
};

export default cloudService;
