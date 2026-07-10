/**
 * Tauri API Service
 * Provides safe access to Tauri APIs with initialization checks
 */

import { logger } from '@/utils/logger';

let isTauriReady = false;
let invokeFn: typeof import('@tauri-apps/api/core').invoke | null = null;

export interface DualChecksumResult {
  sha256: string;
  crc32: string;
  bytes_processed: number;
}

export const initTauriApi = async (): Promise<boolean> => {
  if (isTauriReady && invokeFn) {
    return true;
  }

  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    logger.warn('[TauriService] Not running in Tauri context');
    return false;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    invokeFn = invoke;
    isTauriReady = true;
    logger.info('[TauriService] Tauri API ready');
    return true;
  } catch (e) {
    logger.error('[TauriService] Failed to initialize Tauri API:', e instanceof Error ? e : new Error(String(e)));
    return false;
  }
};

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const invoke = async <T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> => {
  if (!invokeFn) {
    await initTauriApi();
  }

  if (!invokeFn) {
    throw new Error('Tauri API not available');
  }

  return invokeFn<T>(cmd, args);
};

export const tauriCommand = async <T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> => {
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    logger.error(`[TauriService] Command '${cmd}' failed:`, e instanceof Error ? e : new Error(String(e)));
    throw e;
  }
};

export const calculateFileChecksums = async (path: string): Promise<DualChecksumResult> => {
  return await invoke<DualChecksumResult>('calculate_file_checksums', { path });
};
