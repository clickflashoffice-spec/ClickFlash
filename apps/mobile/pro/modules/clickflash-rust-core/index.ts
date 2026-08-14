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
  }
};
