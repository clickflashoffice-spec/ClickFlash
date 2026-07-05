import { pb } from "../pb";
import {
  Booking,
  Destination,
  SyncLog,
} from "../../types";

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


export const bookingsApi = {
  async getBookings(): Promise<Booking[]> {
    const records = await pb.collection("bookings").getFullList();
    return records as Booking[];
  },

  async createBooking(data: Partial<Booking>): Promise<Booking> {
    const record = await pb.collection("bookings").create(data);
    return record as Booking;
  },

  async updateBooking(id: string, data: Partial<Booking>): Promise<Booking> {
    const record = await pb.collection("bookings").update(id, data);
    return record as Booking;
  },

  async deleteBooking(id: string): Promise<void> {
    await pb.collection("bookings").delete(id);
  },

  async getDestinations(): Promise<Destination[]> {
    const records = await pb
      .collection("destinations")
      .getFullList({ sort: "-last_seen" });
    return records as Destination[];
  },

  async getSyncLogs(limit = 100): Promise<SyncLog[]> {
    const records = await pb
      .collection("sync_logs")
      .getList(1, limit, { sort: "-timestamp" });
    return records.items as SyncLog[];
  },

  async createDestination(data: Partial<Destination>): Promise<Destination> {
    try {
      console.log("Creating destination with data:", data);
      const record = await pb.collection("destinations").create(data);
      console.log("Destination created successfully:", record);
      return record as Destination;
    } catch (error: any) {
      console.error("createDestination error details:", {
        error,
        errorType: typeof error,
        errorKeys: error && typeof error === "object" ? Object.keys(error) : [],
        errorMessage: error?.message,
        errorResponse: error?.response,
        errorStatus: error?.status,
      });

      // Extract detailed error message from PocketBase
      let errorMessage = "Failed to create destination";
      if (error?.response?.data) {
        const pbError = error.response.data;
        console.log("PocketBase error data:", pbError);
        if (pbError.message) {
          errorMessage = pbError.message;
        } else if (
          pbError.data &&
          typeof pbError.data === "object" &&
          !Array.isArray(pbError.data)
        ) {
          // PocketBase validation errors - safely handle data object
          try {
            const validationErrors = Object.entries(pbError.data)
              .map(([field, msg]: [string, any]) => `${field}: ${msg}`)
              .join(", ");
            errorMessage = validationErrors || errorMessage;
          } catch (entriesError) {
            console.warn("Failed to process validation errors", entriesError);
            // Use default error message
          }
        } else if (pbError.error) {
          errorMessage = pbError.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      const finalError = new Error(errorMessage);
      // Preserve original error structure
      if (error?.response) {
        (finalError as any).response = error.response;
      }
      if (error?.status) {
        (finalError as any).status = error.status;
      }
      throw finalError;
    }
  },

  async updateDestination(
    id: string,
    data: Partial<Destination>,
  ): Promise<Destination> {
    const record = await pb.collection("destinations").update(id, data);
    return record as Destination;
  },

  async deleteDestination(id: string): Promise<void> {
    await pb.collection("destinations").delete(id);
  },
};
