import { hasPermission } from '../permissions.ts';
import { Permission, Photographer } from '../types.ts';

/**
 * usePermissions Hook
 * 
 * Custom React hook for checking user permissions.
 * 
 * Features:
 * - Permission checking based on user role
 * - Safe handling of null/undefined users
 * - Returns permission check function
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
    /**
     * Check if the current user has a specific permission
     * 
     * @param {Permission} permission - Permission to check
     * @returns {boolean} True if user has the permission, false otherwise
     */
    const can = (permission: Permission): boolean => {
        if (!user) {
            return false;
        }
        return hasPermission(user.role, permission);
    };

    return { can };
};