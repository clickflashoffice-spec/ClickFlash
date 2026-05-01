import { create } from 'zustand';

/**
 * Real-time connection status enum.
 *
 * Lifecycle:
 *   idle  →  connecting  →  connected
 *                              │
 *                              ▼
 *                          reconnecting  →  connected
 *                              │
 *                              ▼
 *                          disconnected (after retry budget exhausted)
 */
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

interface ConnectionState {
  /** Current websocket / SSE connection status. */
  status: ConnectionStatus;
  /** Cumulative error count since the last successful connection. */
  errorCount: number;
  /** Unix-ms timestamp of the most recent heartbeat from the server, or null if none received. */
  lastHeartbeat: number | null;

  // Actions
  setStatus: (status: ConnectionStatus) => void;
  resetErrors: () => void;
  recordHeartbeat: () => void;
  incrementError: () => void;
}

/**
 * Realtime connection state store. Read by sentryService.ts to tag error events
 * with realtime context (status / error_count / last_heartbeat) and written by
 * the PocketBase EventSource subscriber in services/pb.ts as the connection
 * lifecycle progresses.
 *
 * Consumers use `getState()` rather than the React hook because all reads
 * happen inside non-component code paths (Sentry beforeSend, EventSource
 * onopen / onmessage / onerror handlers).
 */
export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'idle',
  errorCount: 0,
  lastHeartbeat: null,

  setStatus: (status) => set({ status }),
  resetErrors: () => set({ errorCount: 0 }),
  recordHeartbeat: () => set({ lastHeartbeat: Date.now() }),
  incrementError: () =>
    set((state) => ({ errorCount: state.errorCount + 1 })),
}));
