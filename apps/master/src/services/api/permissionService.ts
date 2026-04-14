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
     * P3-D2 Fix: Handle 404 gracefully - return empty permissions instead of throwing
     */
    async getPermissions(): Promise<Record<AppRole, Permission[]>> {
        try {
            const baseUrl = pb.baseUrlValue;
            const response = await fetch(`${baseUrl}/api/permissions`, {
                headers: {
                    'Authorization': `Bearer ${pb.authStore.token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                // 401 — not authenticated, return empty permissions silently.
                // 404 — endpoint not yet implemented on this backend build, degrade gracefully.
                if (response.status === 401 || response.status === 404) {
                    return {} as Record<AppRole, Permission[]>;
                }
                throw new Error(`Failed to fetch permissions: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            // Don't let fetch errors pollute the console - return empty permissions
            console.debug(`[PermissionService] Could not fetch permissions: ${(error as Error).message}`);
            return {} as Record<AppRole, Permission[]>;
        }
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

