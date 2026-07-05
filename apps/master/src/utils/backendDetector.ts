/**
 * Backend Mode Detector
 * 
 * Detects which backend is running (Node.js or C++) and configures
 * the frontend API client accordingly.
 */

import { logger } from '../utils/logger';

export type BackendMode = 'node' | 'cpp' | 'unknown';

interface BackendInfo {
  mode: BackendMode;
  version: string;
  port: number;
  url: string;
}

const NODE_PORT = 8090;
const CPP_PORT = 8092;
const HEALTH_TIMEOUT = 2000;

/**
 * Check if a backend is running on a specific port
 */
async function checkBackend(port: number): Promise<{ running: boolean; version: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);
    
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      return { running: true, version: data.version || 'unknown' };
    }
    
    return { running: false, version: '' };
  } catch {
    return { running: false, version: '' };
  }
}

/**
 * Detect which backend is running
 */
export async function detectBackend(): Promise<BackendInfo> {
  // Check C++ backend first (preferred)
  const cppStatus = await checkBackend(CPP_PORT);
  if (cppStatus.running) {
    logger.info('[BackendDetector] C++ backend detected on port', CPP_PORT);
    return {
      mode: 'cpp',
      version: cppStatus.version,
      port: CPP_PORT,
      url: `http://127.0.0.1:${CPP_PORT}`,
    };
  }
  
  // Check Node.js backend
  const nodeStatus = await checkBackend(NODE_PORT);
  if (nodeStatus.running) {
    logger.info('[BackendDetector] Node.js backend detected on port', NODE_PORT);
    return {
      mode: 'node',
      version: nodeStatus.version,
      port: NODE_PORT,
      url: `http://127.0.0.1:${NODE_PORT}`,
    };
  }
  
  logger.warn('[BackendDetector] No backend detected');
  return {
    mode: 'unknown',
    version: '',
    port: 0,
    url: '',
  };
}

/**
 * Set global backend mode flag
 */
export function setBackendMode(mode: BackendMode): void {
  (window as any).__CF_BACKEND_MODE = mode;
  logger.info('[BackendDetector] Backend mode set to:', mode);
}

/**
 * Get current backend mode
 */
export function getBackendMode(): BackendMode {
  return (window as any).__CF_BACKEND_MODE || 'node';
}

/**
 * Initialize backend detection on app startup
 */
export async function initializeBackendDetection(): Promise<BackendInfo> {
  const info = await detectBackend();
  
  if (info.mode !== 'unknown') {
    setBackendMode(info.mode);
  }
  
  return info;
}

// Auto-detect on module load (for early detection)
initializeBackendDetection().catch(err => {
  logger.error('[BackendDetector] Auto-detection failed:', err);
});
