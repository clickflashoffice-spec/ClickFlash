import { pb } from '../pb';
import { Photo } from '../../types';

// Types would normally be defined in a shared types file
export interface AICullingResult {
    id: string; // Group ID
    type: 'best' | 'duplicate' | 'reject';
    photos: (string | Photo)[];
}

const API_BASE = '/api/culling';

export const cullingService = {
    analyzeAlbum: async (albumId: string): Promise<AICullingResult[]> => {
        const response = await pb.request(`${API_BASE}/analyze/${albumId}`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to analyze album');
        return await response.json();
    },
    getResults: async (albumId: string): Promise<AICullingResult[]> => {
        const response = await pb.request(`${API_BASE}/results/${albumId}`);
        if (!response.ok) throw new Error('Failed to get result');
        return await response.json();
    },
    confirmCulling: async (albumId: string, actions: Record<string, unknown>) => {
        const response = await pb.request(`${API_BASE}/confirm/${albumId}`, {
            method: 'POST',
            body: JSON.stringify({ actions })
        });
        if (!response.ok) throw new Error('Failed to confirm culling');
        return await response.json();
    }
};
