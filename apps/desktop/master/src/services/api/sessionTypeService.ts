/**
 * Session Type Service
 * 
 * Handles all CRUD operations for session types
 */

import { pb } from '../pb';
import { SessionType } from '../../types';

// Use relative path for API calls since we're serving from the same origin or proxy
const API_BASE = '/api/session-types';

export const sessionTypeService = {
    /**
     * Get all session types
     */
    async getSessionTypes(): Promise<SessionType[]> {
        const response = await pb.request(API_BASE);
        if (!response.ok) throw new Error('Failed to fetch session types');
        return await response.json();
    },

    /**
     * Create a new session type
     */
    async createSessionType(data: Omit<SessionType, 'id'>): Promise<SessionType> {
        const response = await pb.request(API_BASE, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to create session type');
        return await response.json();
    },

    /**
     * Update an existing session type
     */
    async updateSessionType(id: string, data: Partial<SessionType>): Promise<SessionType> {
        const response = await pb.request(`${API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update session type');
        return await response.json();
    },

    /**
     * Delete a session type
     */
    async deleteSessionType(id: string): Promise<void> {
        const response = await pb.request(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete session type');
    }
};

