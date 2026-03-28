import { pb } from '../pb';
import { Photographer } from '../../types';

const API_BASE = '/api/faces';

export const faceService = {
    async registerFace(imageBlob: Blob, userId?: string): Promise<void> {
        const formData = new FormData();
        formData.append('image', imageBlob, 'register.jpg');
        if (userId) {
            formData.append('userId', userId);
        }

        const response = await pb.request(`${API_BASE}/register`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            console.error('[FaceService] Register Error Response:', error);
            throw new Error(error.message || error.error || 'Failed to register face');
        }
    },

    async loginWithFace(imageBlob: Blob): Promise<{ user: Photographer; token: string }> {
        const formData = new FormData();
        formData.append('image', imageBlob, 'login.jpg');

        const response = await pb.request(`${API_BASE}/login`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: response.statusText }));
            console.error('[FaceService] Login Error Response:', error);
            throw new Error(error.message || error.error || 'Failed to login with face');
        }

        return await response.json();
    }
};
