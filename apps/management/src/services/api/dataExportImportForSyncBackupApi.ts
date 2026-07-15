import { apiService } from '../apiService';
import { pb } from "../pb";
import { logger } from "@/utils/logger";

/**
 * API Service - Wrapper around pb adapter for convenient data operations
 *
 * This service provides a clean interface for all CRUD operations with:
 * - Automatic retry logic for network failures
 * - Comprehensive error handling
 * - Request/response logging in development
 * - Type-safe operations
 *
 * All methods return Promises and handle errors gracefully.
 */


export const dataExportImportForSyncBackupApi = {
  async exportDataForSync(fullBackup: boolean = false): Promise<any> {
    try {
      // Helper function to safely fetch data
      const safeFetch = async <T>(
        fetchFn: () => Promise<T[]>,
        defaultValue: T[] = [],
      ): Promise<T[]> => {
        try {
          return await fetchFn();
        } catch (err) {
          logger.warn("Failed to fetch data for export:", err);
          return defaultValue;
        }
      };

      // Gather all data from the database with error handling
      const [
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
      ] = await Promise.all([
        safeFetch(() => apiService.getAlbums()),
        safeFetch(() => apiService.getPhotos()),
        safeFetch(() => apiService.getOrders()),
        safeFetch(() => apiService.getUsers()),
        safeFetch(() => apiService.getProducts()),
        safeFetch(() => apiService.getPacks()),
        safeFetch(() => apiService.getBookings()),
        safeFetch(() => apiService.getDestinations()),
        safeFetch(() => apiService.getExpenses()),
        safeFetch(() => apiService.getAdjustments()),
        safeFetch(() => apiService.getLoans()),
        safeFetch(() => apiService.getEquipment()),
        safeFetch(() => apiService.getSessionTypes()),
        safeFetch(() => apiService.getExpenseCategories()),
      ]);

      // Calculate summary
      const summary = {
        albums: albums.length,
        photos: photos.length,
        orders: orders.length,
        users: users.length,
        totalSizeMB: 0, // Estimate: roughly 0.1MB per photo, 0.01MB per record
      };

      // Rough size estimation (photos are the largest)
      summary.totalSizeMB =
        photos.length * 0.1 +
        (albums.length + orders.length + users.length) * 0.01;

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
            version: "1.0",
          },
        };
      } else {
        // Return just summary for sync preview
        return { summary };
      }
    } catch (error) {
      logger.error("Failed to export data for sync:", error);
      throw new Error(
        `Failed to gather data from database: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },

  async importDataFromBackup(backupData: any): Promise<void> {
    try {
      const data = backupData.data || backupData;

      // Clear existing data (optional - you might want to merge instead)
      // For now, we'll import by creating/updating records

      // Import users
      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          try {
            await apiService.updateUser(user.id, user);
          } catch {
            try {
              await apiService.createUser(user);
            } catch (err) {
              logger.warn("Failed to import user:", user.id, err);
            }
          }
        }
      }

      // Import products
      if (data.products && Array.isArray(data.products)) {
        for (const product of data.products) {
          try {
            await apiService.updateProduct(product.id, product);
          } catch {
            try {
              await apiService.createProduct(product);
            } catch (err) {
              logger.warn("Failed to import product:", product.id, err);
            }
          }
        }
      }

      // Import packs
      if (data.packs && Array.isArray(data.packs)) {
        for (const pack of data.packs) {
          try {
            await apiService.updatePack(pack.id, pack);
          } catch {
            try {
              await apiService.createPack(pack);
            } catch (err) {
              logger.warn("Failed to import pack:", pack.id, err);
            }
          }
        }
      }

      // Import destinations
      if (data.destinations && Array.isArray(data.destinations)) {
        for (const destination of data.destinations) {
          try {
            await apiService.updateDestination(destination.id, destination);
          } catch {
            try {
              await apiService.createDestination(destination);
            } catch (err) {
              logger.warn(
                "Failed to import destination:",
                destination.id,
                err,
              );
            }
          }
        }
      }

      // Import albums
      if (data.albums && Array.isArray(data.albums)) {
        for (const album of data.albums) {
          try {
            await apiService.updateAlbum(album.id, album);
          } catch {
            try {
              await apiService.createAlbum(album);
            } catch (err) {
              logger.warn("Failed to import album:", album.id, err);
            }
          }
        }
      }

      // Import photos
      if (data.photos && Array.isArray(data.photos)) {
        for (const photo of data.photos) {
          try {
            await apiService.deletePhoto(photo.id);
          } catch {
            // Ignore — photo may not exist yet
          }
          try {
            await apiService.createPhoto(photo);
          } catch (err) {
            logger.warn("Failed to import photo:", photo.id, err);
          }
        }
      }

      // Import orders
      if (data.orders && Array.isArray(data.orders)) {
        for (const order of data.orders) {
          try {
            await apiService.updateOrder(order.id, order);
          } catch {
            try {
              await apiService.createOrder(order);
            } catch (err) {
              logger.warn("Failed to import order:", order.id, err);
            }
          }
        }
      }

      // Import bookings
      if (data.bookings && Array.isArray(data.bookings)) {
        for (const booking of data.bookings) {
          try {
            await apiService.updateBooking(booking.id, booking);
          } catch {
            try {
              await apiService.createBooking(booking);
            } catch (err) {
              logger.warn("Failed to import booking:", booking.id, err);
            }
          }
        }
      }

      // Import expenses
      if (data.expenses && Array.isArray(data.expenses)) {
        for (const expense of data.expenses) {
          try {
            await apiService.updateExpense(expense.id, expense);
          } catch {
            try {
              await apiService.createExpense(expense);
            } catch (err) {
              logger.warn("Failed to import expense:", expense.id, err);
            }
          }
        }
      }

      // Import adjustments
      if (data.adjustments && Array.isArray(data.adjustments)) {
        for (const adjustment of data.adjustments) {
          try {
            await apiService.updateAdjustment(adjustment.id, adjustment);
          } catch {
            try {
              await apiService.createAdjustment(adjustment);
            } catch (err) {
              logger.warn("Failed to import adjustment:", adjustment.id, err);
            }
          }
        }
      }

      // Import loans
      if (data.loans && Array.isArray(data.loans)) {
        for (const loan of data.loans) {
          try {
            await apiService.updateLoan(loan.id, loan);
          } catch {
            try {
              await apiService.createLoan(loan);
            } catch (err) {
              logger.warn("Failed to import loan:", loan.id, err);
            }
          }
        }
      }

      // Import equipment
      if (data.equipment && Array.isArray(data.equipment)) {
        for (const item of data.equipment) {
          try {
            await apiService.updateEquipment(item.id, item);
          } catch {
            try {
              await apiService.createEquipment(item);
            } catch (err) {
              logger.warn("Failed to import equipment:", item.id, err);
            }
          }
        }
      }

      // Import session types
      if (data.sessionTypes && Array.isArray(data.sessionTypes)) {
        for (const sessionType of data.sessionTypes) {
          try {
            await apiService.updateSessionType(sessionType.id, sessionType);
          } catch {
            try {
              await apiService.createSessionType(sessionType);
            } catch (err) {
              logger.warn(
                "Failed to import session type:",
                sessionType.id,
                err,
              );
            }
          }
        }
      }

      // Import expense categories
      if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
        for (const category of data.expenseCategories) {
          try {
            await apiService.updateExpenseCategory(category.id, category);
          } catch {
            try {
              await apiService.createExpenseCategory(category);
            } catch (err) {
              logger.warn(
                "Failed to import expense category:",
                category.id,
                err,
              );
            }
          }
        }
      }

      logger.info("[apiService] Backup import completed");
    } catch (error) {
      logger.error("Failed to import backup data:", error);
      throw new Error(
        `Failed to import backup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
};
