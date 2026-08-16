/**
 * ClickFlash Ecosystem - BLE Proximity Types
 * 
 * Defines the BLE payload structures and UUIDs used for
 * proximity linking between the Guest (React Native Mobile Consumer)
 * or Photographer (Mobile Pro), and the Rust Edge Receiver.
 */

/**
 * Standard UUIDs for the ClickFlash BLE Proximity Service.
 * Used for advertising and GATT connections.
 */
export const BLE_CONSTANTS = {
  // Primary Service UUID for ClickFlash Proximity
  PROXIMITY_SERVICE_UUID: "C11C-F1A5-0000-1000-8000-00805F9B34FB", 
  
  // Characteristic UUIDs
  HANDSHAKE_CHARACTERISTIC_UUID: "C11C-F1A5-0001-1000-8000-00805F9B34FB",
  STATUS_CHARACTERISTIC_UUID: "C11C-F1A5-0002-1000-8000-00805F9B34FB",
} as const;

export enum BleRole {
  GUEST = 'GUEST',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  NODE = 'NODE',
}

/**
 * The payload broadcasted or written during the BLE Proximity Handshake.
 * Sent from React Native app, parsed by Rust receiver.
 */
export interface BleHandshakePayload {
  /** Protocol version, currently 1 */
  version: number;
  
  /** The role of the broadcasting device */
  role: BleRole;
  
  /** Unique ID of the Guest or Photographer */
  userId: string;
  
  /** Unique ID of the broadcasting device */
  deviceId: string;
  
  /** 
   * Cryptographic session token to prevent spoofing.
   * Typically a short-lived HMAC or JWT-like token.
   */
  sessionToken: string;
  
  /** Unix timestamp (ms) of the broadcast for replay protection */
  timestamp: number;
  
  /** Optional metadata, e.g., current location/zone ID */
  zoneId?: string;
  
  /** 
   * Measured Tx Power for distance approximation
   * (Optionally used by Rust receiver along with RSSI to compute distance)
   */
  txPower?: number;
}

/**
 * The response sent back from the Rust receiver upon successful handshake.
 */
export interface BleHandshakeResponse {
  success: boolean;
  
  /** Node ID of the Rust receiver */
  receiverId: string;
  
  /** Server timestamp for synchronization */
  timestamp: number;
  
  /** Error message if success is false */
  error?: string;
}

/**
 * Status payload for a BLE beacon emitted by mobile apps or touch kiosks.
 */
export interface BleBeaconStatus {
  deviceId: string;
  batteryLevel?: number; // 0-100
  isBroadcasting: boolean;
  uptime: number; // seconds since boot
  lastSync: number; // timestamp
}

/**
 * Match result when the orchestrator confirms proximity between a guest and a photographer/node.
 */
export interface GuestProximityMatch {
  matchId: string;
  guestId: string;
  nodeId: string; // Photographer or Kiosk ID
  timestamp: number;
  rssi: number; // Received Signal Strength Indicator
  estimatedDistanceMeters?: number;
  confidenceScore: number; // 0.0 to 1.0
  zoneId?: string;
}

/**
 * Redis stream event structure for BLE heartbeats.
 */
export interface BleHeartbeatEvent {
  type: 'ble:heartbeat';
  payload: BleBeaconStatus & {
    timestamp: number;
  };
}
