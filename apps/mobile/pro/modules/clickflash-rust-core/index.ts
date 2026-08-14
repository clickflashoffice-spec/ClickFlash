import { requireNativeModule } from 'expo-modules-core';

// Ensure the module exists in the native registry
let ClickFlashRustCore: any;
try {
  ClickFlashRustCore = requireNativeModule('ClickFlashRustCore');
} catch (e) {
  console.warn("ClickFlashRustCore native module not linked yet. Returning mock.");
  ClickFlashRustCore = {
    processSpotIntelligence: (data: string) => "Mock Rust Response"
  };
}

/**
 * Interface to the high-performance Rust Core for offline AI and syncing.
 */
export const RustCore = {
  /**
   * Processes large spot yield data offline using the Rust native core.
   */
  processSpotIntelligence(spotData: string): string {
    return ClickFlashRustCore.processSpotIntelligence(spotData);
  },

  /**
   * Saves a booking to the offline SQLite database using Rust core for maximum performance
   */
  saveBooking(payload: { dbPath: string, name: string, whatsapp: string, email: string }): string {
    if (ClickFlashRustCore.saveBooking) {
        return ClickFlashRustCore.saveBooking(payload.dbPath, payload.name, payload.whatsapp, payload.email);
    }
    return "Mock: Booking saved offline via Rust Core";
  },

  /**
   * Sweeps the offline SQLite database and pushes all pending bookings to the Master Node via HTTP.
   */
  syncPendingBookings(payload: { dbPath: string, masterUrl: string }): string {
    if (ClickFlashRustCore.syncPendingBookings) {
        return ClickFlashRustCore.syncPendingBookings(payload.dbPath, payload.masterUrl);
    }
    return "Mock: Bookings synced via Rust Core";
  }
};
