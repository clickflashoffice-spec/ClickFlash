
import { AppRole, Permission } from './types';

// Define all possible permissions in the application
export const ALL_PERMISSIONS: Permission[] = [
    // Master Portal
    'viewDashboard',
    'viewAlbums',
    'manageOwnAlbums',
    'manageAllAlbums',
    'viewOrders',
    'viewOwnOrders',
    'viewAllOrders',
    'viewPhotographers',
    'managePhotographers',
    'viewBookings',
    'manageBookings',
    'viewSettings',
    'manageLocalSettings',
    'manageSystemInfrastructure', // NEW: Critical settings (DB, Backup, Cloud)
    'manageSessionTypes',
    'viewProducts',
    'manageProducts',
    // Management Portal Permissions
    'viewManagementDashboard',
    'viewDestinations',
    'viewReports',
    'viewExpenses',
    'viewCapital',
    'viewAdjustments',
    'manageAdjustments',
    'viewPerformance',
    'viewWarehouse',
    'manageEquipmentCategories',
    'viewPayroll',
    'runPayroll',
    'viewEcommerceSettings',
    'viewGlobalSettings',
    'manageGlobalSettings',
    'viewDocumentation',
    'manageExpenseCategories',
    // New Page Permissions
    'viewMoneyTrash',
    'viewClients',
    'viewMarketing',
    'viewGrowth'
];

// Map roles to their permissions
export const PERMISSIONS: Record<AppRole, Permission[]> = {
    Photographer: [
        'viewDashboard',
        'viewAlbums',
        'manageOwnAlbums',
        'viewOrders',
        'viewOwnOrders',
        'viewBookings',
        'viewDocumentation',
        'viewProducts',
    ],
    'Team Leader': [
        'viewDashboard',
        'viewAlbums',
        'manageAllAlbums',
        'viewOrders',
        'viewAllOrders',
        'viewPhotographers',
        'viewBookings',
        'manageBookings',
        'viewSettings',
        'manageLocalSettings',
        'manageSessionTypes',
        'viewDocumentation',
        'viewProducts',
        'manageProducts',
        'viewClients', // Team Leaders view clients
        'viewGrowth',
    ],
    Admin: [
        'viewDashboard',
        'viewAlbums',
        'manageOwnAlbums',
        'manageAllAlbums',
        'viewOrders',
        'viewOwnOrders',
        'viewAllOrders',
        'viewPhotographers',
        'managePhotographers',
        'viewBookings',
        'manageBookings',
        'viewSettings',
        'manageLocalSettings',
        'manageSystemInfrastructure', // Critical: DB, Backup, Cloud
        'manageSessionTypes',
        'viewDocumentation',
        'viewProducts',
        'manageProducts',
        // Management Portal Permissions
        'viewManagementDashboard',
        'viewDestinations',
        'viewReports',
        'viewExpenses',
        'viewCapital',
        'viewAdjustments',
        'viewPerformance',
        'viewWarehouse',
        'viewPayroll',
        'viewEcommerceSettings',
        'viewGlobalSettings',
        // New Page Permissions
        'viewMoneyTrash',
        'viewClients',
        'viewMarketing',
        'viewGrowth'
    ],
    Manager: [ // Manager role for the Management Portal
        'viewManagementDashboard',
        'viewDestinations',
        'viewReports',
        'viewExpenses',
        'viewCapital',
        'viewAdjustments',
        'manageAdjustments',
        'viewPerformance',
        'viewWarehouse',
        'viewPayroll',
        'runPayroll',
        'viewEcommerceSettings',
        'viewGlobalSettings',
        'manageGlobalSettings',
        'manageExpenseCategories',
        'manageEquipmentCategories',
        'manageSessionTypes',
        'viewDocumentation',
        // Also give them master portal permissions for viewing and emergency local management
        'viewDashboard',
        'viewAlbums',
        'viewOrders',
        'viewPhotographers',
        'viewBookings',
        'viewSettings',
        'manageLocalSettings',
        'manageSystemInfrastructure', // Critical: DB, Backup, Cloud
        'viewProducts',
        'manageProducts',
        'viewMoneyTrash',
        'viewClients',
        'viewMarketing'
    ],
    CEO: [
        ...ALL_PERMISSIONS,
    ],
};

// Helper function to check permissions
export function hasPermission(role: AppRole, permission: Permission): boolean {
    return PERMISSIONS[role]?.includes(permission) || false;
}