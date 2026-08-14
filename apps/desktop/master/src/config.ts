/**
 * Application Configuration
 */

import { DEFAULT_MASTER_PORT } from "./constants";

// Handle Jest environment
export const IS_DEV =
  typeof jest !== "undefined"
    ? true
    : (typeof globalThis !== "undefined" &&
        (globalThis as any).import?.meta?.env?.DEV) ||
      false;
export const DEFAULT_API_PORT = DEFAULT_MASTER_PORT;
export const DEFAULT_API_HOST = "127.0.0.1";
export const DEFAULT_API_URL =
  typeof window !== "undefined"
    ? ""
    : `http://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}`;
export const DEFAULT_WS_URL =
  typeof window !== "undefined"
    ? `ws://${window.location.host}`
    : `ws://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}`;

// Local Storage Keys
export const STORAGE_KEYS = {
  CONNECTION_SETTINGS: "connectionSettings",
  CLOUD_SETTINGS: "masterCloudSettings",
  MASTER_LOCAL_IP: "masterLocalIPAddress",
  CURRENCY: "masterPortalCurrency",
  IMPORT_FOLDER: "masterSharedImportFolder",
};
