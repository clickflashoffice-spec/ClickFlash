/**
 * Data Export/Import Service
 * 
 * Handles data export and import operations for sync and backup
 */


import { logger } from '../../utils/logger';

// Import services for data fetching
import { albumService } from './albumService';
import { photoService } from './photoService';
import { orderService } from './orderService';
import { userService } from './userService';
import { productService } from './productService';
import { packService } from './packService';
import { bookingService } from './bookingService';
import { destinationService } from './destinationService';
import { expenseService } from './expenseService';
import { loanService } from './loanService';
import { sessionTypeService } from './sessionTypeService';
import { pb } from '../pb';

/**
 * Helper function to safely fetch data
 */
async function safeFetch<T>(fetchFn: () => Promise<T[] | { data: T[] }>, defaultValue: T[] = []): Promise<T[]> {
    try {
        const result = await fetchFn();
        if (Array.isArray(result)) return result;
        if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as any).data)) {
            return (result as any).data;
        }
        return defaultValue;
    } catch (err) {
        logger.warn('Failed to fetch data for export:', err);
        return defaultValue;
    }
}

export const dataExportService = {
    /**
     * Export data for sync or backup
     */
    async exportDataForSync(fullBackup: boolean = false): Promise<any> {
        try {
            // Gather all data from the database with error handling
            const [albums, photos, orders, users, products, packs, bookings, destinations, expenses, adjustments, loans, equipment, sessionTypes, expenseCategories] = await Promise.all([
                safeFetch(() => albumService.getAlbums()),
                safeFetch(() => photoService.getPhotos()),
                safeFetch(() => orderService.getOrders() as any),
                safeFetch(() => userService.getUsers()),
                safeFetch(() => productService.getProducts()),
                safeFetch(() => packService.getPacks()),
                safeFetch(() => bookingService.getBookings()),
                safeFetch(() => destinationService.getDestinations()),
                safeFetch(() => expenseService.getExpenses()),
                safeFetch(() => expenseService.getAdjustments()),
                safeFetch(() => loanService.getLoans()),
                safeFetch(() => expenseService.getEquipment()),
                safeFetch(() => sessionTypeService.getSessionTypes()),
                safeFetch(() => expenseService.getExpenseCategories())
            ]);

            // Calculate summary
            const summary = {
                albums: albums.length,
                photos: photos.length,
                orders: orders.length,
                users: users.length,
                products: products.length,
                packs: packs.length,
                bookings: bookings.length,
                destinations: destinations.length,
                expenses: expenses.length,
                adjustments: adjustments.length,
                loans: loans.length,
                equipment: equipment.length,
                sessionTypes: sessionTypes.length,
                expenseCategories: expenseCategories.length,
                exportedAt: new Date().toISOString(),
                fullBackup: fullBackup
            };

            return {
                summary,
                data: {
                    albums,
                    photos,
                    orders,
                    users,
                    products,
                    packs,
                    bookings,
                    destinations,
                    expenses,
                    adjustments,
                    loans,
                    equipment,
                    sessionTypes,
                    expenseCategories
                }
            };
        } catch (error) {
            logger.error('Failed to export data', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Import data from export
     */
    async importDataFromExport(exportData: { data?: Record<string, any[]> }): Promise<{ success: boolean; imported: Record<string, number> }> {
        try {
            const imported: Record<string, number> = {};

            // Import each collection
            const collections = [
                { name: 'albums', data: exportData.data?.albums || [], service: albumService },
                { name: 'photos', data: exportData.data?.photos || [], service: photoService },
                { name: 'orders', data: exportData.data?.orders || [], service: orderService },
                { name: 'users', data: exportData.data?.users || [], service: userService },
                { name: 'products', data: exportData.data?.products || [], service: productService },
                { name: 'packs', data: exportData.data?.packs || [], service: packService },
                { name: 'bookings', data: exportData.data?.bookings || [], service: bookingService },
                { name: 'destinations', data: exportData.data?.destinations || [], service: destinationService },
                { name: 'expenses', data: exportData.data?.expenses || [], service: expenseService },
                { name: 'adjustments', data: exportData.data?.adjustments || [], service: expenseService },
                { name: 'loans', data: exportData.data?.loans || [], service: loanService },
                { name: 'equipment', data: exportData.data?.equipment || [], service: expenseService },
                { name: 'sessionTypes', data: exportData.data?.sessionTypes || [], service: sessionTypeService },
                { name: 'expenseCategories', data: exportData.data?.expenseCategories || [], service: expenseService }
            ];

            for (const collection of collections) {
                let count = 0;
                for (const item of collection.data) {
                    try {
                        if (item.id) {
                            // Try to update first
                            try {
                                const svc = collection.service as any;
                                if (svc.update) {
                                    await svc.update(item.id, item);
                                } else {
                                    await svc.create(item);
                                }
                            } catch {
                                // If update fails, try to create
                                await (collection.service as any).create(item);
                            }
                        } else {
                            await (collection.service as any).create(item);
                        }
                        count++;
                    } catch (error) {
                        logger.warn(`Failed to import ${collection.name} item`, { itemId: item?.id, error });
                    }
                }
                imported[collection.name] = count;
            }

            return {
                success: true,
                imported
            };
        } catch (error) {
            logger.error('Failed to import data', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Perform maintenance operations
     */
    async performMaintenance(): Promise<{ success: boolean; cleaned: number }> {
        try {
            const baseUrl = pb.baseUrlValue;
            const response = await fetch(`${baseUrl}/api/maintenance/vacuum`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                }
            });

            if (!response.ok) throw new Error(response.statusText);

            return {
                success: true,
                cleaned: 0
            };
        } catch (error) {
            logger.error('Failed to perform maintenance', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Clean up old import files
     */
    async cleanup(settings: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
        try {
            const baseUrl = pb.baseUrlValue;
            const response = await fetch(`${baseUrl}/api/maintenance/cleanup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) throw new Error(response.statusText);
            return await response.json();
        } catch (error) {
            logger.error('Failed to cleanup data', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Create system backup
     */
    async backup(): Promise<{ success: boolean; message: string; path?: string }> {
        try {
            const baseUrl = pb.baseUrlValue;
            const response = await fetch(`${baseUrl}/api/maintenance/backup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                }
            });

            if (!response.ok) throw new Error(response.statusText);
            return await response.json();
        } catch (error) {
            logger.error('Failed to create backup', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Restore system from backup file
     */
    async restore(file: File): Promise<{ success: boolean; message: string }> {
        try {
            const baseUrl = pb.baseUrlValue;
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${baseUrl}/api/maintenance/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${pb.authStore.token}`
                    // Content-Type header is auto-set by fetch when using FormData
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || 'Restore failed');
            }
            return await response.json();
        } catch (error) {
            logger.error('Failed to restore backup', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Verify data integrity
     */
    async verifyDataIntegrity(): Promise<{
        counts: { albums: number; photos: number; orders: number };
        issues: string[];
        storageUsageBytes: number;
    }> {
        try {
            const [albums, photos, orders] = await Promise.all([
                safeFetch(() => albumService.getAlbums()),
                safeFetch(() => photoService.getPhotos()),
                safeFetch(() => (orderService as any).getOrders())
            ]);

            const issues: string[] = [];

            // Check for orphaned photos
            const albumIds = new Set(albums.map(a => a.id));
            const orphanedPhotos = photos.filter(p => !albumIds.has(p.albumId));
            if (orphanedPhotos.length > 0) {
                issues.push(`Found ${orphanedPhotos.length} orphaned photos`);
            }

            // Check for orders with invalid items
            orders.forEach((order: any) => {
                if (!order.items || (order.items as any[]).length === 0) {
                    issues.push(`Order ${order.id} has no items`);
                }
            });

            // Calculate storage usage (mock estimation)
            const storageUsageBytes = photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);

            return {
                counts: {
                    albums: albums.length,
                    photos: photos.length,
                    orders: orders.length
                },
                issues,
                storageUsageBytes
            };
        } catch (error) {
            logger.error('Failed to verify data integrity', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Reset database (Factory Reset)
     */
    async resetDb(): Promise<void> {
        try {
            logger.warn('Factory reset requested');
            const baseUrl = pb.baseUrlValue;
            const response = await fetch(`${baseUrl}/api/maintenance/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || 'Factory reset failed');
            }
        } catch (error) {
            logger.error('Failed to reset database', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Prune old kiosk sessions
     */
    async pruneSessions(days: number = 1): Promise<{ success: boolean; message: string }> {
        try {
            const baseUrl = pb.baseUrlValue;
            const response = await fetch(`${baseUrl}/api/maintenance/prune-sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${pb.authStore.token}`
                },
                body: JSON.stringify({ days })
            });

            if (!response.ok) throw new Error(response.statusText);
            return await response.json();
        } catch (error) {
            logger.error('Failed to prune sessions', error instanceof Error ? error : undefined);
            throw error;
        }
    },

    /**
     * Download database file
     */
    exportDb(): void {
        try {
            const baseUrl = pb.baseUrlValue;
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = `${baseUrl}/api/maintenance/export-db`;
            link.setAttribute('download', 'master.db'); // Filename logic handled by server, but this helps
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            logger.error('Failed to trigger DB export', error instanceof Error ? error : undefined);
            throw error;
        }
    }
};

