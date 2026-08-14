import { DEFAULT_TOUCH_PORT, DEFAULT_MASTER_PORT } from "./constants";

export const IS_DEV =
  typeof jest !== "undefined"
    ? true
    : (typeof globalThis !== "undefined" &&
        (globalThis as any).import?.meta?.env?.DEV) ||
      false;

export const DEFAULT_API_PORT = DEFAULT_MASTER_PORT;
export const DEFAULT_API_HOST = "127.0.0.1";
export const DEFAULT_API_URL =
  typeof window !== "undefined" && !IS_DEV
    ? `http://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}`
    : `http://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}`;
export const DEFAULT_WS_URL =
  typeof window !== "undefined" && !IS_DEV
    ? `ws://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}`
    : `ws://${DEFAULT_API_HOST}:${DEFAULT_API_PORT}`;

export const STORAGE_KEYS = {
  CONNECTION_SETTINGS: "connectionSettings",
  CLOUD_SETTINGS: "touchCloudSettings",
  MASTER_LOCAL_IP: "masterLocalIPAddress",
  CURRENCY: "touchCurrency",
  IMPORT_FOLDER: "touchImportFolder",
};
