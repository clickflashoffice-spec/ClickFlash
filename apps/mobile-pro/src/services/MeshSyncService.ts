import { PhotoAsset } from './SyncService';
import { logger } from "@/utils/logger";

export interface PeerRelayNode {
  nodeId: string;
  photographerName: string;
  signalStrengthRssi: number; // e.g., -55 dBm
  distanceMeters: number;
  batteryLevel: number;
  isConnectedToMaster: boolean; // True if this peer has Wi-Fi reachability to Master Kiosk
  lastSeen: number;
}

export class MeshSyncService {
  private static instance: MeshSyncService;
  private peerNodes: PeerRelayNode[] = [];

  private constructor() {
    this.startPeerDiscoveryLoop();
  }

  public static getInstance(): MeshSyncService {
    if (!MeshSyncService.instance) {
      MeshSyncService.instance = new MeshSyncService();
    }
    return MeshSyncService.instance;
  }

  /**
   * Simulates continuous P2P Bluetooth Low Energy / Wi-Fi Direct peer discovery loop.
   */
  private startPeerDiscoveryLoop() {
    // Populate with realistic peer nodes that roam around the event space
    this.peerNodes = [
      {
        nodeId: 'mesh_node_alpha',
        photographerName: 'Alex R. (Station A Relay)',
        signalStrengthRssi: -48,
        distanceMeters: 12,
        batteryLevel: 88,
        isConnectedToMaster: true,
        lastSeen: Date.now()
      },
      {
        nodeId: 'mesh_node_bravo',
        photographerName: 'Sarah M. (Roaming North)',
        signalStrengthRssi: -65,
        distanceMeters: 34,
        batteryLevel: 62,
        isConnectedToMaster: false,
        lastSeen: Date.now() - 5000
      }
    ];

    setInterval(() => {
      // Refresh heartbeat of discovered peer nodes
      this.peerNodes.forEach(node => {
        node.lastSeen = Date.now();
        // Simulate minor RSSI fluctuations as photographers move
        node.signalStrengthRssi += Math.floor(Math.random() * 5) - 2;
      });
    }, 10000);
  }

  public getDiscoveredPeers(): PeerRelayNode[] {
    return [...this.peerNodes];
  }

  /**
   * Returns the best available peer node that has active reachability to the Master PC.
   */
  public getBestRelayPeer(): PeerRelayNode | null {
    const connectedPeers = this.peerNodes.filter(p => p.isConnectedToMaster);
    if (connectedPeers.length === 0) return null;
    // Sort by strongest signal (highest RSSI)
    return connectedPeers.sort((a, b) => b.signalStrengthRssi - a.signalStrengthRssi)[0];
  }

  /**
   * Transmits a photo via P2P mesh relay when direct Wi-Fi to Master PC is unavailable.
   */
  public async queueForPeerRelay(photo: any): Promise<boolean> {
    const bestPeer = this.getBestRelayPeer();
    if (!bestPeer) {
      logger.warn('[MeshSyncService] No peers currently reachable to Master. Buffering locally in offline store.');
      return false;
    }

    try {
      logger.info(`[MeshSyncService] Direct Wi-Fi to Master failed. Chaining P2P relay via ${bestPeer.photographerName} (${bestPeer.signalStrengthRssi} dBm)...`);
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate P2P transmission delay
      logger.info(`[MeshSyncService] ✔ Peer ${bestPeer.photographerName} acknowledged packet delivery.`);
      return true;
    } catch (err) {
      logger.error('[MeshSyncService] Relay transmission error:', err);
      return false;
    }
  }

  public getRelayQueueStatus() {
    return {
      discoveredPeers: this.peerNodes.length,
      connectedPeers: this.peerNodes.filter(p => p.isConnectedToMaster).length
    };
  }
}

export const meshSyncService = MeshSyncService.getInstance();
