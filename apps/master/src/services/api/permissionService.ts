/**
 * Permission Service
 * 
 * Handles permission management operations
 */

import { pb } from '../pb';
import { AppRole, Permission } from '../../types';

export const permissionService = {
    /**
     * Get all permissions for all roles
     */
    async getPermissions(): Promise<Record<AppRole, Permission[]>> {
        const baseUrl = pb.baseUrlValue;
        const response = await fetch(`${baseUrl}/api/permissions`, {
            headers: {
                'Authorization': `Bearer ${pb.authStore.token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include cookies for authentication
        });

        if (!response.ok) {
            // 401 is expected if not authenticated - don't throw, return empty permissions
            if (response.status === 401) {
                return {} as Record<AppRole, Permission[]>;
            }
            throw new Error(`Failed to fetch permissions: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Update permissions for a specific role
     */
    async updatePermissions(role: AppRole, permissions: Permission[]): Promise<void> {
        const baseUrl = pb.baseUrlValue;
        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`${baseUrl}/api/permissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pb.authStore.token}`,
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            credentials: 'include', // Include cookies for authentication
            body: JSON.stringify({ role, permissions })
        });

        if (!response.ok) {
            throw new Error(`Failed to update permissions: ${response.status} ${response.statusText}`);
        }
    }
};

