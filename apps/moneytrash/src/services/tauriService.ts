/**
 * Tauri API Service
 * Provides safe access to Tauri APIs with initialization checks
 */

let isTauriReady = false;
let invokeFn: typeof import('@tauri-apps/api/core').invoke | null = null;

export const initTauriApi = async (): Promise<boolean> => {
  if (isTauriReady && invokeFn) {
    return true;
  }

  if (typeof window === 'undefined' || !('__TAURI__' in window)) {
    console.warn('[TauriService] Not running in Tauri context');
    return false;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    invokeFn = invoke;
    isTauriReady = true;
    console.log('[TauriService] Tauri API ready');
    return true;
  } catch (e) {
    console.error('[TauriService] Failed to initialize Tauri API:', e);
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
    console.error(`[TauriService] Command '${cmd}' failed:`, e);
    throw e;
  }
};
