/**
 * Data Version Manager
 *
 * Manages data versions per collection for conflict detection and resolution.
 * Tracks when each collection was last updated and provides version comparison.
 *
 * Features:
 * - Per-collection version tracking
 * - Version comparison for conflict detection
 * - Conflict resolution strategies
 * - Version history tracking
 * - Integration with refresh mechanisms
 */

import { logger } from "../utils/logger";
import { db } from "./db";
import { safeStorage } from "../utils/safeStorage";

/** Record structure from Dexie dataVersions table */
interface DataVersionRecord {
  collection: string;
  version: number;
  lastUpdated: number | string;
}

export type CollectionName =
  | "albums"
  | "orders"
  | "photos"
  | "users"
  | "products"
  | "kiosks"
  | "settings"
  | "kiosk_sessions"
  | "all"
  | "global";

export interface CollectionVersion {
  collection: CollectionName;
  version: number;
  lastUpdated: string; // ISO timestamp
  lastRefreshTime?: string; // ISO timestamp of last refresh
  conflictCount: number;
}

export interface DataVersions {
  albums: CollectionVersion;
  orders: CollectionVersion;
  photos: CollectionVersion;
  users: CollectionVersion;
  products: CollectionVersion;
  kiosks: CollectionVersion;
  settings: CollectionVersion;
  kiosk_sessions: CollectionVersion;
  global: number;
  lastUpdated: string;
}

export type ConflictResolutionStrategy =
  | "server"
  | "client"
  | "merge"
  | "prompt";

export interface ConflictInfo {
  collection: CollectionName;
  localVersion: number;
  serverVersion: number;
  localLastUpdated: string;
  serverLastUpdated: string;
  resolution: ConflictResolutionStrategy;
}

/**
 * Data Version Manager Class
 *
 * Manages data versions via Dexie (IndexedDB) for scalability and quota protection.
 */
class DataVersionManager {
  private versions: DataVersions;
  private readonly STORAGE_KEY = "masterPortalDataVersions";
  private conflictCallbacks: Map<
    CollectionName,
    (conflict: ConflictInfo) => void
  > = new Map();
  private initialized: boolean = false;

  constructor() {
    this.versions = this.getDefaultVersions();
    // Start async initialization but provide synchronous defaults initially
    this.init();
  }

  private async init() {
    try {
      this.versions = await this.loadVersions();
      this.initialized = true;
      console.log("[DataVersionManager] Initialized:", this.initialized);
      logger.info("DataVersionManager initialized from storage");
    } catch (err) {
      logger.error("Failed to initialize DataVersionManager", err);
    }
  }

  private async loadVersions(): Promise<DataVersions> {
    try {
      // Try Dexie first
      const records = await db.table("dataVersions").toArray();
      if (records && records.length > 0) {
        const versions = this.getDefaultVersions();
        records.forEach((r: DataVersionRecord) => {
          if (r.collection === "global") {
            versions.global = r.version;
          } else if ((versions as unknown as Record<string, unknown>)[r.collection]) {
            (versions as unknown as Record<string, unknown>)[r.collection] = {
              collection: r.collection,
              version: r.version,
              lastUpdated: new Date(r.lastUpdated).toISOString(),
              conflictCount: 0,
            };
          }
        });
        versions.lastUpdated = new Date().toISOString();
        return versions;
      }

      // Fallback/Migration from localStorage
      const stored = safeStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const versions = this.mergeWithDefaults(parsed);
        // Migrate to Dexie
        await this.persistToDexie(versions);
        return versions;
      }
    } catch (error) {
      logger.warn("Failed to load data versions", error);
    }
    return this.getDefaultVersions();
  }

  private async persistToDexie(versions: DataVersions) {
    const records = (Object.keys(versions)
      .map((key) => {
        if (key === "global") {
          return {
            collection: "global",
            version: versions.global,
            lastUpdated: Date.now(),
          };
        }
        if (key === "lastUpdated") return null;
        const v = (versions as unknown as Record<string, unknown>)[
          key
        ] as CollectionVersion;
        if (!v || !v.collection) return null;
        return {
          collection: v.collection,
          version: v.version,
          lastUpdated: new Date(v.lastUpdated).getTime(),
        };
      })
      .filter((r) => r !== null)) as DataVersionRecord[];

    await db.table("dataVersions").bulkPut(records);
  }

  /**
   * Get default versions structure
   */
  private getDefaultVersions(): DataVersions {
    const now = new Date().toISOString();
    const defaultVersion: CollectionVersion = {
      collection: "all",
      version: 0,
      lastUpdated: now,
      conflictCount: 0,
    };

    return {
      albums: { ...defaultVersion, collection: "albums" },
      orders: { ...defaultVersion, collection: "orders" },
      photos: { ...defaultVersion, collection: "photos" },
      users: { ...defaultVersion, collection: "users" },
      products: { ...defaultVersion, collection: "products" },
      kiosks: { ...defaultVersion, collection: "kiosks" },
      settings: { ...defaultVersion, collection: "settings" },
      kiosk_sessions: { ...defaultVersion, collection: "kiosk_sessions" },
      global: 0,
      lastUpdated: now,
    };
  }

  /**
   * Merge stored versions with defaults to handle schema changes
   */
  private mergeWithDefaults(stored: Partial<DataVersions>): DataVersions {
    const defaults = this.getDefaultVersions();
    const now = new Date().toISOString();

    return {
      albums: stored.albums || defaults.albums,
      orders: stored.orders || defaults.orders,
      photos: stored.photos || defaults.photos,
      users: stored.users || defaults.users,
      products: stored.products || defaults.products,
      kiosks: stored.kiosks || defaults.kiosks,
      settings: stored.settings || defaults.settings,
      kiosk_sessions: stored.kiosk_sessions || defaults.kiosk_sessions,
      global: stored.global ?? defaults.global,
      lastUpdated: stored.lastUpdated || now,
    };
  }

  /**
   * Save versions to localStorage
   */
  private saveVersions(): void {
    try {
      safeStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.versions));
    } catch (error) {
      logger.warn(
        "Failed to save data versions to storage",
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Set version for a specific collection explicitly
   *
   * @param {CollectionName} collection - Collection to set version for
   * @param {number} version - New version number
   */
  public setVersion(collection: CollectionName, version: number): void {
    if (collection === "all") return;

    const coll = collection as keyof DataVersions;
    (this.versions[coll] as CollectionVersion).version = version;
    (this.versions[coll] as CollectionVersion).lastUpdated =
      new Date().toISOString();

    this.saveVersions();
    logger.debug("Data version set explicitly", { collection, version });
  }

  /**
   * Increment version for a specific collection
   *
   * @param {CollectionName} collection - Collection to increment version for
   * @param {string} [source] - Source of the update (e.g., 'websocket', 'manual', 'auto')
   * @returns {number} New version number
   */
  public incrementVersion(collection: CollectionName, source?: string): number {
    const now = new Date().toISOString();

    if (collection === "all") {
      // Increment all collections and global version
      Object.keys(this.versions).forEach((key) => {
        if (key !== "global" && key !== "lastUpdated") {
          const coll = key as keyof DataVersions;
          (this.versions[coll] as CollectionVersion).version++;
          (this.versions[coll] as CollectionVersion).lastUpdated = now;
        }
      });
      this.versions.global++;
    } else {
      // Increment specific collection
      const coll = collection as keyof DataVersions;
      (this.versions[coll] as CollectionVersion).version++;
      (this.versions[coll] as CollectionVersion).lastUpdated = now;
      // Also increment global for backward compatibility
      this.versions.global++;
    }

    this.versions.lastUpdated = now;
    this.saveVersions();

    // Get the version to return and log
    let versionToReturn: number = 0;
    if (collection === "all" || collection === "global") {
      versionToReturn = this.versions.global;
    } else {
      const coll = collection as keyof DataVersions;
      const v = this.versions[coll];
      if (v && typeof v === "object" && "version" in v) {
        versionToReturn = (v as CollectionVersion).version;
      } else if (typeof v === "number") {
        versionToReturn = v;
      }
    }

    logger.debug("Data version incremented", {
      collection,
      version: versionToReturn,
      global: this.versions.global,
      source,
    });

    return versionToReturn;
  }

  /**
   * Get current version for a collection
   *
   * @param {CollectionName} collection - Collection to get version for
   * @returns {CollectionVersion} Current version info
   */
  public getVersion(collection: CollectionName): CollectionVersion {
    if (collection === "all") {
      // Return a combined version (use global)
      return {
        collection: "all",
        version: this.versions.global,
        lastUpdated: this.versions.lastUpdated,
        conflictCount: Object.values(this.versions)
          .filter(
            (v): v is CollectionVersion =>
              typeof v === "object" && "conflictCount" in v,
          )
          .reduce((sum, v) => sum + (v.conflictCount || 0), 0),
      };
    }
    return {
      ...(this.versions[collection as keyof DataVersions] as CollectionVersion),
    };
  }

  /**
   * Get all versions
   *
   * @returns {DataVersions} All collection versions
   */
  public getAllVersions(): DataVersions {
    return { ...this.versions };
  }

  /**
   * Get global version (for backward compatibility)
   *
   * @returns {number} Global version number
   */
  public getGlobalVersion(): number {
    return this.versions.global;
  }

  /**
   * Compare versions and detect conflicts
   *
   * @param {CollectionName} collection - Collection to check
   * @param {number} serverVersion - Server version number
   * @param {string} [serverLastUpdated] - Server last updated timestamp
   * @returns {ConflictInfo | null} Conflict info if conflict detected, null otherwise
   */
  public detectConflict(
    collection: CollectionName,
    serverVersion: number,
    serverLastUpdated?: string,
  ): ConflictInfo | null {
    const localVersion = this.getVersion(collection);

    // If server version is higher, there's a potential conflict
    if (serverVersion > localVersion.version) {
      const conflict: ConflictInfo = {
        collection,
        localVersion: localVersion.version,
        serverVersion,
        localLastUpdated: localVersion.lastUpdated,
        serverLastUpdated: serverLastUpdated || new Date().toISOString(),
        resolution: "server", // Default to server wins
      };

      // Increment conflict count
      (this.versions[collection as keyof DataVersions] as CollectionVersion)
        .conflictCount++;
      this.saveVersions();

      logger.warn("Data version conflict detected", {
        collection,
        localVersion: localVersion.version,
        serverVersion,
        conflictCount: (
          this.versions[collection as keyof DataVersions] as CollectionVersion
        ).conflictCount,
      });

      return conflict;
    }

    return null;
  }

  /**
   * Resolve conflict using specified strategy
   *
   * @param {ConflictInfo} conflict - Conflict information
   * @param {ConflictResolutionStrategy} strategy - Resolution strategy
   * @returns {boolean} True if conflict was resolved, false otherwise
   */
  public resolveConflict(
    conflict: ConflictInfo,
    strategy: ConflictResolutionStrategy,
  ): boolean {
    logger.info("Resolving data version conflict", {
      collection: conflict.collection,
      strategy,
      localVersion: conflict.localVersion,
      serverVersion: conflict.serverVersion,
    });

    switch (strategy) {
      case "server":
        // Server wins - update local version to server version
        (
          this.versions[
            conflict.collection as keyof DataVersions
          ] as CollectionVersion
        ).version = conflict.serverVersion;
        (
          this.versions[
            conflict.collection as keyof DataVersions
          ] as CollectionVersion
        ).lastUpdated = conflict.serverLastUpdated;
        this.saveVersions();
        return true;

      case "client":
        // Client wins - keep local version (server should update)
        // Don't update version, but log the conflict
        return true;

      case "merge": {
        // Merge strategy - use the higher version
        const higherVersion = Math.max(
          conflict.localVersion,
          conflict.serverVersion,
        );
        (
          this.versions[
            conflict.collection as keyof DataVersions
          ] as CollectionVersion
        ).version = higherVersion;
        (
          this.versions[
            conflict.collection as keyof DataVersions
          ] as CollectionVersion
        ).lastUpdated = new Date().toISOString();
        this.saveVersions();
        return true;
      }

      case "prompt": {
        // Prompt user - trigger callback if registered
        const callback = this.conflictCallbacks.get(conflict.collection);
        if (callback) {
          callback(conflict);
          return true;
        }
        // Fall back to server wins if no callback
        return this.resolveConflict(conflict, "server");
      }

      default:
        logger.warn("Unknown conflict resolution strategy", { strategy });
        return false;
    }
  }

  /**
   * Register conflict callback for a collection
   *
   * @param {CollectionName} collection - Collection to register callback for
   * @param {(conflict: ConflictInfo) => void} callback - Callback function
   */
  public onConflict(
    collection: CollectionName,
    callback: (conflict: ConflictInfo) => void,
  ): void {
    this.conflictCallbacks.set(collection, callback);
  }

  /**
   * Unregister conflict callback for a collection
   *
   * @param {CollectionName} collection - Collection to unregister callback for
   */
  public offConflict(collection: CollectionName): void {
    this.conflictCallbacks.delete(collection);
  }

  /**
   * Update version from server response
   *
   * @param {CollectionName} collection - Collection updated
   * @param {number} serverVersion - Server version number
   * @param {string} [serverLastUpdated] - Server last updated timestamp
   * @param {ConflictResolutionStrategy} [strategy] - Conflict resolution strategy
   * @returns {boolean} True if update was successful, false if conflict occurred
   */
  public updateFromServer(
    collection: CollectionName,
    serverVersion: number,
    serverLastUpdated?: string,
    strategy: ConflictResolutionStrategy = "server",
  ): boolean {
    const conflict = this.detectConflict(
      collection,
      serverVersion,
      serverLastUpdated,
    );

    if (conflict) {
      return this.resolveConflict(conflict, strategy);
    }

    // No conflict - update version
    (
      this.versions[collection as keyof DataVersions] as CollectionVersion
    ).version = serverVersion;
    if (serverLastUpdated) {
      (
        this.versions[collection as keyof DataVersions] as CollectionVersion
      ).lastUpdated = serverLastUpdated;
    }
    (
      this.versions[collection as keyof DataVersions] as CollectionVersion
    ).lastRefreshTime = new Date().toISOString();
    this.saveVersions();

    return true;
  }

  /**
   * Update last refresh time for a collection
   *
   * @param {CollectionName} collection - Collection to update
   */
  public updateLastRefreshTime(collection: CollectionName): void {
    const now = new Date().toISOString();
    if (collection === "all") {
      Object.keys(this.versions).forEach((key) => {
        if (key !== "global" && key !== "lastUpdated") {
          (
            this.versions[key as keyof DataVersions] as CollectionVersion
          ).lastRefreshTime = now;
        }
      });
    } else {
      (
        this.versions[collection as keyof DataVersions] as CollectionVersion
      ).lastRefreshTime = now;
    }
    this.saveVersions();
  }

  /**
   * Get last refresh time for a collection
   *
   * @param {CollectionName} collection - Collection to get refresh time for
   * @returns {string | null} Last refresh time or null if never refreshed
   */
  public getLastRefreshTime(collection: CollectionName): string | null {
    if (collection === "all") {
      // Return the most recent refresh time across all collections
      const times = Object.values(this.versions)
        .filter(
          (v): v is CollectionVersion =>
            typeof v === "object" && "lastRefreshTime" in v,
        )
        .map((v) => v.lastRefreshTime)
        .filter((t): t is string => t != null);
      return times.length > 0 ? times.sort().reverse()[0] : null;
    }
    return (
      (this.versions[collection as keyof DataVersions] as CollectionVersion)
        .lastRefreshTime || null
    );
  }

  /**
   * Reset all versions (useful for testing or full refresh)
   */
  public reset(): void {
    this.versions = this.getDefaultVersions();
    this.saveVersions();
    logger.info("Data versions reset");
  }

  /**
   * Get version statistics
   *
   * @returns {Object} Version statistics
   */
  public getStats(): {
    totalConflicts: number;
    lastUpdated: string;
    collectionVersions: Record<string, number>;
  } {
    const totalConflicts = Object.values(this.versions)
      .filter(
        (v): v is CollectionVersion =>
          typeof v === "object" && "conflictCount" in v,
      )
      .reduce((sum, v) => sum + (v.conflictCount || 0), 0);

    const collectionVersions: Record<string, number> = {};
    Object.keys(this.versions).forEach((key) => {
      if (key !== "global" && key !== "lastUpdated") {
        collectionVersions[key] = (
          this.versions[key as keyof DataVersions] as CollectionVersion
        ).version;
      }
    });

    return {
      totalConflicts,
      lastUpdated: this.versions.lastUpdated,
      collectionVersions,
    };
  }
}

// Export singleton instance
export const dataVersionManager = new DataVersionManager();
