
import { authService } from './api/authService';
import { photoService } from './api/photoService';
import { orderService } from './api/orderService';
import { systemService } from './api/systemService';
import { logger } from '../utils/logger';

/**
 * Unified API Service
 * 
 * This service aggregates domain-specific modules into a single interface
 * for backward compatibility and ease of use.
 * 
 * Modules:
 * - Auth: Users, Login
 * - Photo: Albums, Photos
 * - Order: Orders, Products, Packs, Bookings
 * - System: Settings, Configuration Tables, Maintenance
 */
export const apiService = {
    ...authService,
    ...photoService,
    ...orderService,
    ...systemService,

    // --- Aggregated Data Operations ---

    async exportDataForSync(fullBackup: boolean = false): Promise<any> {
        try {
            // Helper function to safely fetch data
            const safeFetch = async <T>(fetchFn: () => Promise<T[]>, defaultValue: T[] = []): Promise<T[]> => {
                try {
                    return await fetchFn();
                } catch (err) {
                    logger.warn('Failed to fetch data for export:', err);
                    return defaultValue;
                }
            };

            // Gather all data from the database with error handling
            // We use 'this' to access the aggregate methods
            const [albums, photos, orders, users, products, packs, bookings, destinations, expenses, adjustments, loans, equipment, sessionTypes, expenseCategories] = await Promise.all([
                safeFetch(() => this.getAlbums()),
                safeFetch(() => this.getPhotos()),
                safeFetch(() => this.getOrders()),
                safeFetch(() => this.getUsers()),
                safeFetch(() => this.getProducts()),
                safeFetch(() => this.getPacks()),
                safeFetch(() => this.getBookings()),
                safeFetch(() => this.getDestinations()),
                safeFetch(() => this.getExpenses()),
                safeFetch(() => this.getAdjustments()),
                safeFetch(() => this.getLoans()),
                safeFetch(() => this.getEquipment()),
                safeFetch(() => this.getSessionTypes()),
                safeFetch(() => this.getExpenseCategories())
            ]);

            // Calculate summary
            const summary = {
                albums: albums.length,
                photos: photos.length,
                orders: orders.length,
                users: users.length,
                totalSizeMB: 0 // Estimate: roughly 0.1MB per photo, 0.01MB per record
            };

            // Rough size estimation (photos are the largest)
            summary.totalSizeMB = (photos.length * 0.1) + ((albums.length + orders.length + users.length) * 0.01);

            if (fullBackup) {
                // Return full data for backup
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
                        expenseCategories,
                        exportDate: new Date().toISOString(),
                        version: '1.0'
                    }
                };
            } else {
                // Return just summary for sync preview
                return { summary };
            }
        } catch (error) {
            logger.error('Failed to export data for sync:', error);
            throw new Error(`Failed to gather data from database: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    async importDataFromBackup(backupData: any): Promise<void> {
        try {
            const data = backupData.data || backupData;

            // Import users
            if (data.users && Array.isArray(data.users)) {
                for (const user of data.users) {
                    try {
                        await this.updateUser(user.id, user);
                    } catch {
                        try {
                            await this.createUser(user);
                        } catch (err) {
                            console.warn('Failed to import user:', user.id, err);
                        }
                    }
                }
            }

            // Import products
            if (data.products && Array.isArray(data.products)) {
                for (const product of data.products) {
                    try {
                        await this.updateProduct(product.id, product);
                    } catch {
                        try {
                            await this.createProduct(product);
                        } catch (err) {
                            console.warn('Failed to import product:', product.id, err);
                        }
                    }
                }
            }

            // Import packs
            if (data.packs && Array.isArray(data.packs)) {
                for (const pack of data.packs) {
                    try {
                        await this.updatePack(pack.id, pack);
                    } catch {
                        try {
                            await this.createPack(pack);
                        } catch (err) {
                            console.warn('Failed to import pack:', pack.id, err);
                        }
                    }
                }
            }

            // Import destinations
            if (data.destinations && Array.isArray(data.destinations)) {
                for (const destination of data.destinations) {
                    try {
                        await this.updateDestination(destination.id, destination);
                    } catch {
                        try {
                            await this.createDestination(destination);
                        } catch (err) {
                            console.warn('Failed to import destination:', destination.id, err);
                        }
                    }
                }
            }

            // Import albums
            if (data.albums && Array.isArray(data.albums)) {
                for (const album of data.albums) {
                    try {
                        await this.updateAlbum(album.id, album);
                    } catch {
                        try {
                            await this.createAlbum(album);
                        } catch (err) {
                            console.warn('Failed to import album:', album.id, err);
                        }
                    }
                }
            }

            // Import photos
            if (data.photos && Array.isArray(data.photos)) {
                for (const photo of data.photos) {
                    try {
                        await this.deletePhoto(photo.id);
                    } catch { }
                    try {
                        await this.createPhoto(photo);
                    } catch (err) {
                        console.warn('Failed to import photo:', photo.id, err);
                    }
                }
            }

            // Import orders
            if (data.orders && Array.isArray(data.orders)) {
                for (const order of data.orders) {
                    try {
                        await this.updateOrder(order.id, order);
                    } catch {
                        try {
                            await this.createOrder(order);
                        } catch (err) {
                            console.warn('Failed to import order:', order.id, err);
                        }
                    }
                }
            }

            // Import bookings
            if (data.bookings && Array.isArray(data.bookings)) {
                for (const booking of data.bookings) {
                    try {
                        await this.updateBooking(booking.id, booking);
                    } catch {
                        try {
                            await this.createBooking(booking);
                        } catch (err) {
                            console.warn('Failed to import booking:', booking.id, err);
                        }
                    }
                }
            }

            // Import expenses
            if (data.expenses && Array.isArray(data.expenses)) {
                for (const expense of data.expenses) {
                    try {
                        await this.updateExpense(expense.id, expense);
                    } catch {
                        try {
                            await this.createExpense(expense);
                        } catch (err) {
                            console.warn('Failed to import expense:', expense.id, err);
                        }
                    }
                }
            }

            // Import adjustments
            if (data.adjustments && Array.isArray(data.adjustments)) {
                for (const adjustment of data.adjustments) {
                    try {
                        await this.updateAdjustment(adjustment.id, adjustment);
                    } catch {
                        try {
                            await this.createAdjustment(adjustment);
                        } catch (err) {
                            console.warn('Failed to import adjustment:', adjustment.id, err);
                        }
                    }
                }
            }

            // Import loans
            if (data.loans && Array.isArray(data.loans)) {
                for (const loan of data.loans) {
                    try {
                        await this.updateLoan(loan.id, loan);
                    } catch {
                        try {
                            await this.createLoan(loan);
                        } catch (err) {
                            console.warn('Failed to import loan:', loan.id, err);
                        }
                    }
                }
            }

            // Import equipment
            if (data.equipment && Array.isArray(data.equipment)) {
                for (const item of data.equipment) {
                    try {
                        await this.updateEquipment(item.id, item);
                    } catch {
                        try {
                            await this.createEquipment(item);
                        } catch (err) {
                            logger.warn('Failed to import equipment', { id: item.id, error: err });
                        }
                    }
                }
            }

            // Import session types
            if (data.sessionTypes && Array.isArray(data.sessionTypes)) {
                for (const sessionType of data.sessionTypes) {
                    try {
                        await this.updateSessionType(sessionType.id, sessionType);
                    } catch {
                        try {
                            await this.createSessionType(sessionType);
                        } catch (err) {
                            console.warn('Failed to import session type:', sessionType.id, err);
                        }
                    }
                }
            }

            // Import expense categories
            if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
                for (const category of data.expenseCategories) {
                    try {
                        await this.updateExpenseCategory(category.id, category);
                    } catch {
                        try {
                            await this.createExpenseCategory(category);
                        } catch (err) {
                            console.warn('Failed to import expense category:', category.id, err);
                        }
                    }
                }
            }

            logger.info('[apiService] Backup import completed');
        } catch (error) {
            logger.error('Failed to import backup data:', error);
            throw new Error(`Failed to import backup: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
};
