import { proxy } from 'valtio';
import type { NetworkStatusSnapshot } from '../services/NetworkRoutingService';
import type { CaptureLedgerCounts } from '../services/CaptureLedgerService';
import type { CameraTetherStatus } from '../../modules/camera-tether';

export interface AppState {
  network: {
    status: NetworkStatusSnapshot;
    offlineQueueSize: number;
    relayQueueStatus: {
      discoveredPeers: number;
      connectedPeers: number;
    };
  };
  tether: {
    status: CameraTetherStatus;
    error: string | null;
    lastVerifiedPreview: {
      captureObjectId: string;
      filename: string;
      localUri: string;
      sha256: string;
    } | null;
  };
  ledger: CaptureLedgerCounts;
  shift: {
    isClockedIn: boolean;
  };
  activeRole: 'PHOTOGRAPHER' | 'STAFF' | 'STUDIO' | 'ADMIN';
}

export const appState = proxy<AppState>({
  activeRole: 'PHOTOGRAPHER',
  network: {
    status: {
      tier: 'OFFLINE',
      masterIp: null,
      masterLatencyMs: null,
      cloudLatencyMs: null,
      meshPeersCount: 0,
      pendingOfflineCount: 0,
      lastChecked: Date.now()
    },
    offlineQueueSize: 0,
    relayQueueStatus: {
      discoveredPeers: 0,
      connectedPeers: 0,
    }
  },
  tether: {
    status: {
      connected: false,
      phase: 'UNAVAILABLE',
      storage: { 
        availableBytes: 0, 
        level: 'OK', 
        totalBytes: 0, 
        safetyReserveBytes: 0, 
        pendingObjectBytes: 0, 
        requiredAvailableBytes: 0, 
        deficitBytes: 0, 
        canImport: false,
        checkedAt: Date.now()
      }
    } as CameraTetherStatus,
    error: null,
    lastVerifiedPreview: null,
  },
  ledger: {
    detected: 0,
    importing: 0,
    storageBlocked: 0,
    localVerified: 0,
    failed: 0,
    pairedSets: 0,
    awaitingCompanion: 0,
    standaloneCaptures: 0,
    ambiguousPairs: 0,
    masterPending: 0,
    kioskPending: 0,
    cloudPending: 0,
    readyDeliveries: 0,
    deliveryAttention: 0,
  },
  shift: {
    isClockedIn: false,
  }
});
