import { useState, useEffect } from 'react';
import { PERMISSIONS as STATIC_PERMISSIONS } from '../permissions.ts';
import { Permission, Photographer, AppRole } from '../types.ts';
import { apiService } from '../services/apiService.ts';
import { logger } from '../utils/logger.ts';

// Global cache for permissions to avoid re-fetching
let cachedPermissions: Record<AppRole, Permission[]> | null = null;
let isFetching = false;
let listeners: (() => void)[] = [];

const fetchPermissions = async () => {
    if (cachedPermissions || isFetching) return;

    isFetching = true;
    try {
        const perms = await apiService.getPermissions();
        cachedPermissions = perms;
        // Notify all listeners
        listeners.forEach(l => l());
    } catch (error) {
        // Silently fail - 401 errors are expected if not authenticated
        // Fallback to static permissions is automatic since cachedPermissions remains null
        // Only log non-401 errors
        if (error instanceof Error && !error.message.includes('401')) {
            logger.error('Failed to fetch permissions:', error);
        }
    } finally {
        isFetching = false;
    }
};

/**
 * usePermissions Hook
 * 
 * Custom React hook for checking user permissions.
 * Fetches dynamic permissions from the backend and falls back to static definitions.
 * 
 * Features:
 * - Permission checking based on user role
 * - Safe handling of null/undefined users
 * - Returns permission check function
 * - Fetches and caches permissions from API
 * - Falls back to static permissions if API fetch fails or is not yet complete
 * 
 * Usage:
 * ```tsx
 * const { can } = usePermissions(currentUser);
 * 
 * if (can('managePhotographers')) {
 *   // Show admin features
 * }
 * ```
 * 
 * @param {Photographer | null} user - Current logged-in user
 * @returns {Object} Object with `can` function for permission checks
 * @returns {Function} can - Function to check if user has a specific permission
 * 
 * @example
 * ```tsx
 * const MyComponent = ({ currentUser }) => {
 *   const { can } = usePermissions(currentUser);
 *   
 *   return (
 *     <div>
 *       {can('viewAllOrders') && <AdminPanel />}
 *       {can('managePhotographers') && <UserManagement />}
 *     </div>
 *   );
 * };
 * ```
 */
export const usePermissions = (user: Photographer | null) => {
    // Force re-render when permissions update
    const [, setTick] = useState(0);

    useEffect(() => {
        const listener = () => setTick(t => t + 1);
        listeners.push(listener);

        // Trigger fetch if not already loaded
        if (!cachedPermissions) {
            fetchPermissions();
        }

        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    }, []);

    /**
     * Check if the current user has a specific permission
     * 
     * @param {Permission} permission - Permission to check
     * @returns {boolean} True if user has the permission, false otherwise
     */
    const can = (permission: Permission): boolean => {
        if (!user) {
            logger.warn('Permission check failed: No user provided', { permission });
            return false;
        }

        // Normalize role to match type definition (standardize on Capitalized words)
        // This handles cases like 'admin' -> 'Admin', 'photographer' -> 'Photographer'
        const rawRole = user.role || '';
        let finalRole = (rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase()) as AppRole;

        // Special cases for specific roles
        const lowerRole = rawRole.toLowerCase().trim();
        if (lowerRole === 'ceo') {
            finalRole = 'CEO';
        } else if (lowerRole.replace(/\s/g, '') === 'teamleader') {
            finalRole = 'Team Leader';
        }

        // Use cached dynamic permissions if available
        if (cachedPermissions) {
            // Check dynamic permissions using normalized role
            // We should also check the raw role in case backend is using something else
            const dynamicPerms = cachedPermissions[finalRole] || cachedPermissions[rawRole as AppRole];

            if (dynamicPerms && Array.isArray(dynamicPerms)) {
                const hasPermission = dynamicPerms.includes(permission);
                if (!hasPermission && import.meta.env.DEV) {
                    logger.debug(`[Permission] Check failed (Dynamic) for ${finalRole}`, { permission, hasPermission: false });
                }
                return hasPermission;
            }
        }

        // Fallback to static permissions
        const rolePermissions = STATIC_PERMISSIONS[finalRole];
        const hasPermission = rolePermissions?.includes(permission) || false;
        if (!hasPermission) {
            logger.warn('Permission check failed (static permissions)', {
                permission,
                role: finalRole,
                userRole: user.role,
                availablePermissions: rolePermissions,
                allStaticRoles: Object.keys(STATIC_PERMISSIONS),
                isRoleInStatic: finalRole in STATIC_PERMISSIONS
            });
        } else {
            logger.debug('Permission granted', { permission, role: finalRole });
        }
        return hasPermission;
    };

    return { can };
};