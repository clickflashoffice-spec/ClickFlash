/* global RTCPeerConnection, RTCDataChannel, RTCIceCandidateInit */
import { Bonjour } from 'bonjour-service';

import { logger } from '@/utils/logger';

export interface CRDTLogEntry {
  id: string;
  entityType: 'photo' | 'order' | 'session' | 'station';
  entityId: string;
  mutationType: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  nodeId: string;
}

export type SyncMessageType =
  | 'REGISTER'
  | 'HEARTBEAT'
  | 'PHOTO_INGESTED'
  | 'ORDER_STATE_CHANGED'
  | 'RECONCILE_REQUEST'
  | 'RECONCILE_RESPONSE'
  | 'BROADCAST_EVENT'
  | 'WEBRTC_OFFER'
  | 'WEBRTC_ANSWER'
  | 'WEBRTC_ICE';

export interface SyncMessage {
  type: SyncMessageType;
  senderId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface PhotoTransferMetadata {
  transferId: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface PeerTransferState {
  peerId: string;
  transferId: string;
  connection: RTCPeerConnection;
  channel: RTCDataChannel | null;
  metadata: PhotoTransferMetadata | null;
  chunks: ArrayBuffer[];
  receivedBytes: number;
  timeout: ReturnType<typeof setTimeout>;
}

type Listener = (payload: unknown) => void;

const DEFAULT_MASTER_URL = 'ws://127.0.0.1:8092';
const PHOTO_CHUNK_SIZE = 64 * 1024;
const MAX_BUFFERED_BYTES = 1024 * 1024;
const TRANSFER_TIMEOUT_MS = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function chunkArrayBuffer(
  buffer: ArrayBuffer,
  chunkSize = PHOTO_CHUNK_SIZE,
): ArrayBuffer[] {
  if (!Number.isSafeInteger(chunkSize) || chunkSize <= 0) {
    throw new RangeError('Photo chunk size must be a positive integer');
  }

  const chunks: ArrayBuffer[] = [];
  for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
    chunks.push(buffer.slice(offset, Math.min(offset + chunkSize, buffer.byteLength)));
  }
  return chunks;
}

function parseSyncMessage(value: unknown): SyncMessage | null {
  if (!isRecord(value) || !isRecord(value.payload)) return null;
  if (
    typeof value.type !== 'string' ||
    typeof value.senderId !== 'string' ||
    typeof value.timestamp !== 'number'
  ) {
    return null;
  }
  return value as unknown as SyncMessage;
}

export class TouchSyncClient {
  private static instance: TouchSyncClient;
  private ws: WebSocket | null = null;
  private bonjour: InstanceType<typeof Bonjour> | null = null;
  private readonly kioskId: string;
  private masterUrl = DEFAULT_MASTER_URL;
  private offlineQueue: CRDTLogEntry[] = [];
  private lastReconciledTimestamp = 0;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly peerTransfers = new Map<string, PeerTransferState>();
  private readonly pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>();

  private constructor() {
    this.kioskId = `kiosk-${crypto.randomUUID()}`;
  }

  public static getInstance(): TouchSyncClient {
    if (!TouchSyncClient.instance) TouchSyncClient.instance = new TouchSyncClient();
    return TouchSyncClient.instance;
  }

  public init(): void {
    logger.info(`[TouchSyncClient] Initializing kiosk instance: ${this.kioskId}`);
    this.discoverMasterViaBonjour();
    this.connect();
  }

  public on(event: string, callback: Listener): () => void {
    const callbacks = this.listeners.get(event) ?? new Set<Listener>();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
    return () => callbacks.delete(callback);
  }

  private emit(event: string, payload: unknown): void {
    for (const callback of this.listeners.get(event) ?? []) {
      try {
        callback(payload);
      } catch (error: unknown) {
        logger.error(
          `[TouchSyncClient] Event listener error for ${event}: ${errorMessage(error)}`,
        );
      }
    }
  }

  public async start(customMasterUrl?: string): Promise<void> {
    if (customMasterUrl) this.masterUrl = customMasterUrl;
    else this.discoverMasterViaBonjour();
    this.connect();
  }

  private discoverMasterViaBonjour(): void {
    try {
      this.bonjour = new Bonjour();
      const browser = this.bonjour.find({ type: 'clickflash-sync' });
      browser.on('up', (service: { host?: string; port?: number }) => {
        logger.info(`[TouchSyncClient] Discovered Master on ${service.host}:${service.port}`);
        if (!service.host || !service.port) return;
        const host = service.host === 'localhost' ? '127.0.0.1' : service.host;
        this.masterUrl = `ws://${host}:${service.port}`;
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) this.connect();
      });
      browser.on('error', (error: unknown) => {
        logger.warn(`[TouchSyncClient] Bonjour discovery error: ${errorMessage(error)}`);
      });
    } catch (error: unknown) {
      logger.warn(
        `[TouchSyncClient] Bonjour discovery initialization failed: ${errorMessage(error)}`,
      );
    }
  }

  public connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;
    this.isConnecting = true;

    try {
      logger.info(`[TouchSyncClient] Connecting to Master broker at ${this.masterUrl}`);
      this.ws = new WebSocket(this.masterUrl);
      this.ws.onopen = () => {
        this.isConnecting = false;
        this.emit('status', 'connected');
        this.send({
          type: 'REGISTER',
          senderId: this.kioskId,
          timestamp: Date.now(),
          payload: { name: `Touch-Station-${this.kioskId.slice(-4)}` },
        });
        this.startHeartbeat();
        this.flushOfflineQueue();
        this.requestReconcile();
      };
      this.ws.onmessage = (event) => {
        try {
          const message = parseSyncMessage(JSON.parse(String(event.data)));
          if (!message) throw new Error('Invalid sync message envelope');
          this.handleIncomingMessage(message);
        } catch (error: unknown) {
          logger.error(`[TouchSyncClient] Parse error: ${errorMessage(error)}`);
        }
      };
      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit('status', 'disconnected');
        this.scheduleReconnect();
      };
      this.ws.onerror = () => {
        this.isConnecting = false;
        logger.error('[TouchSyncClient] WebSocket connection error');
      };
    } catch (error: unknown) {
      this.isConnecting = false;
      logger.error(`[TouchSyncClient] Connection attempt failed: ${errorMessage(error)}`);
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'HEARTBEAT',
        senderId: this.kioskId,
        timestamp: Date.now(),
        payload: { status: 'online' },
      });
    }, 15_000);
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatTimer) return;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5_000);
  }

  private handleIncomingMessage(message: SyncMessage): void {
    if (
      message.type === 'WEBRTC_OFFER' ||
      message.type === 'WEBRTC_ANSWER' ||
      message.type === 'WEBRTC_ICE'
    ) {
      void this.handleWebRtcSignal(message).catch((error: unknown) => {
        logger.error(`[TouchSyncClient] WebRTC signaling failed: ${errorMessage(error)}`);
      });
      return;
    }

    if (message.type === 'RECONCILE_RESPONSE') {
      const deltaLogs = message.payload.deltaLogs;
      const serverTimestamp = message.payload.serverTimestamp;
      if (Array.isArray(deltaLogs)) {
        deltaLogs.forEach((delta) => this.emit('mutation:remote', delta));
      }
      if (typeof serverTimestamp === 'number') {
        this.lastReconciledTimestamp = Math.max(
          this.lastReconciledTimestamp,
          serverTimestamp,
        );
      }
      return;
    }

    if (message.type === 'BROADCAST_EVENT') {
      if (message.payload.event === 'WEBRTC_PEER_UNAVAILABLE') {
        this.emit('photo:transfer:fallback', message.payload);
      }
      this.emit('broadcast_event', message.payload);
      return;
    }

    if (message.type === 'PHOTO_INGESTED' || message.type === 'ORDER_STATE_CHANGED') {
      this.emit(message.type.toLowerCase(), message.payload);
    }
  }

  private createPeerTransfer(peerId: string, transferId: string): PeerTransferState {
    const existing = this.peerTransfers.get(transferId);
    if (existing) return existing;
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('WebRTC is unavailable in this runtime');
    }

    const connection = new RTCPeerConnection({ iceServers: [] });
    const state: PeerTransferState = {
      peerId,
      transferId,
      connection,
      channel: null,
      metadata: null,
      chunks: [],
      receivedBytes: 0,
      timeout: setTimeout(() => {
        this.emit('photo:transfer:fallback', {
          peerId,
          transferId,
          reason: 'WebRTC transfer timed out',
        });
        this.cleanupPeerTransfer(transferId);
      }, TRANSFER_TIMEOUT_MS),
    };

    connection.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      this.sendSignal('WEBRTC_ICE', peerId, transferId, {
        candidate: candidate.toJSON(),
      });
    };
    connection.ondatachannel = ({ channel }) => this.configureDataChannel(state, channel);
    connection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(connection.connectionState)) {
        this.emit('photo:transfer:fallback', {
          peerId,
          transferId,
          reason: `WebRTC connection ${connection.connectionState}`,
        });
        this.cleanupPeerTransfer(transferId);
      }
    };
    this.peerTransfers.set(transferId, state);
    return state;
  }

  private configureDataChannel(state: PeerTransferState, channel: RTCDataChannel): void {
    state.channel = channel;
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = MAX_BUFFERED_BYTES / 2;
    channel.onmessage = (event) => this.handleDataChannelMessage(state, event.data);
    channel.onerror = () => {
      this.emit('photo:transfer:fallback', {
        peerId: state.peerId,
        transferId: state.transferId,
        reason: 'RTCDataChannel error',
      });
      this.cleanupPeerTransfer(state.transferId);
    };
  }

  private handleDataChannelMessage(state: PeerTransferState, data: unknown): void {
    if (typeof data === 'string') {
      const message: unknown = JSON.parse(data);
      if (!isRecord(message) || typeof message.kind !== 'string') return;
      if (message.kind === 'metadata') {
        const { transferId, fileName, mimeType, size } = message;
        if (
          typeof transferId === 'string' &&
          typeof fileName === 'string' &&
          typeof mimeType === 'string' &&
          typeof size === 'number' &&
          size >= 0
        ) {
          state.metadata = { transferId, fileName, mimeType, size };
        }
      } else if (message.kind === 'complete') {
        const metadata = state.metadata;
        if (!metadata || state.receivedBytes !== metadata.size) {
          throw new Error('Received photo byte count does not match metadata');
        }
        const photo = new Blob(state.chunks, { type: metadata.mimeType });
        this.emit('photo:received', { ...metadata, photo, peerId: state.peerId });
        this.cleanupPeerTransfer(state.transferId);
      }
      return;
    }

    if (data instanceof ArrayBuffer) {
      state.chunks.push(data);
      state.receivedBytes += data.byteLength;
    }
  }

  private async handleWebRtcSignal(message: SyncMessage): Promise<void> {
    const targetId = message.payload.targetId;
    const transferId = message.payload.transferId;
    if (targetId !== this.kioskId || typeof transferId !== 'string') return;

    if (message.type === 'WEBRTC_OFFER') {
      const description = message.payload.description;
      if (!isRecord(description) || description.type !== 'offer' || typeof description.sdp !== 'string') {
        throw new Error('Invalid WebRTC offer');
      }
      const state = this.createPeerTransfer(message.senderId, transferId);
      await state.connection.setRemoteDescription({ type: 'offer', sdp: description.sdp });
      await this.flushPendingIce(transferId, state.connection);
      const answer = await state.connection.createAnswer();
      await state.connection.setLocalDescription(answer);
      this.sendSignal('WEBRTC_ANSWER', message.senderId, transferId, {
        description: state.connection.localDescription,
      });
      return;
    }

    const state = this.peerTransfers.get(transferId);
    if (message.type === 'WEBRTC_ANSWER') {
      const description = message.payload.description;
      if (!state || !isRecord(description) || description.type !== 'answer' || typeof description.sdp !== 'string') {
        throw new Error('Invalid or orphaned WebRTC answer');
      }
      await state.connection.setRemoteDescription({ type: 'answer', sdp: description.sdp });
      await this.flushPendingIce(transferId, state.connection);
      return;
    }

    const candidate = message.payload.candidate;
    if (!isRecord(candidate)) throw new Error('Invalid WebRTC ICE candidate');
    const candidateInit = candidate as RTCIceCandidateInit;
    if (!state || !state.connection.remoteDescription) {
      const pending = this.pendingIceCandidates.get(transferId) ?? [];
      pending.push(candidateInit);
      this.pendingIceCandidates.set(transferId, pending);
      return;
    }
    await state.connection.addIceCandidate(candidateInit);
  }

  private async flushPendingIce(
    transferId: string,
    connection: RTCPeerConnection,
  ): Promise<void> {
    const pending = this.pendingIceCandidates.get(transferId) ?? [];
    this.pendingIceCandidates.delete(transferId);
    for (const candidate of pending) await connection.addIceCandidate(candidate);
  }

  private sendSignal(
    type: 'WEBRTC_OFFER' | 'WEBRTC_ANSWER' | 'WEBRTC_ICE',
    targetId: string,
    transferId: string,
    payload: Record<string, unknown>,
  ): void {
    if (!this.send({
      type,
      senderId: this.kioskId,
      timestamp: Date.now(),
      payload: { ...payload, targetId, transferId },
    })) {
      throw new Error('WebSocket signaling channel is unavailable');
    }
  }

  private waitForChannelOpen(channel: RTCDataChannel): Promise<void> {
    if (channel.readyState === 'open') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('RTCDataChannel open timed out')), 10_000);
      channel.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      channel.addEventListener('error', () => {
        clearTimeout(timer);
        reject(new Error('RTCDataChannel failed to open'));
      }, { once: true });
    });
  }

  private waitForWritableChannel(channel: RTCDataChannel): Promise<void> {
    if (channel.bufferedAmount <= MAX_BUFFERED_BYTES) return Promise.resolve();
    return new Promise((resolve) => {
      channel.addEventListener('bufferedamountlow', () => resolve(), { once: true });
    });
  }

  public async transferPhoto(
    targetId: string,
    photo: Blob,
    fileName = `clickflash-${Date.now()}.jpg`,
  ): Promise<boolean> {
    const transferId = crypto.randomUUID();
    try {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket signaling channel is offline');
      }
      const state = this.createPeerTransfer(targetId, transferId);
      const channel = state.connection.createDataChannel(`photo:${transferId}`, { ordered: true });
      this.configureDataChannel(state, channel);
      const offer = await state.connection.createOffer();
      await state.connection.setLocalDescription(offer);
      this.sendSignal('WEBRTC_OFFER', targetId, transferId, {
        description: state.connection.localDescription,
      });
      await this.waitForChannelOpen(channel);

      const buffer = await photo.arrayBuffer();
      const metadata: PhotoTransferMetadata = {
        transferId,
        fileName,
        mimeType: photo.type || 'application/octet-stream',
        size: buffer.byteLength,
      };
      channel.send(JSON.stringify({ kind: 'metadata', ...metadata }));
      for (const chunk of chunkArrayBuffer(buffer)) {
        await this.waitForWritableChannel(channel);
        channel.send(chunk);
      }
      await this.waitForWritableChannel(channel);
      channel.send(JSON.stringify({ kind: 'complete', transferId }));
      this.emit('photo:transfer:sent', { ...metadata, peerId: targetId });
      setTimeout(() => this.cleanupPeerTransfer(transferId), 1_000);
      return true;
    } catch (error: unknown) {
      this.emit('photo:transfer:fallback', {
        targetId,
        transferId,
        photo,
        fileName,
        reason: errorMessage(error),
      });
      this.cleanupPeerTransfer(transferId);
      return false;
    }
  }

  private cleanupPeerTransfer(transferId: string): void {
    const state = this.peerTransfers.get(transferId);
    if (!state) return;
    clearTimeout(state.timeout);
    state.channel?.close();
    state.connection.close();
    this.peerTransfers.delete(transferId);
    this.pendingIceCandidates.delete(transferId);
  }

  public recordMutation(entry: Omit<CRDTLogEntry, 'nodeId' | 'timestamp'>): void {
    const fullEntry: CRDTLogEntry = {
      ...entry,
      nodeId: this.kioskId,
      timestamp: Date.now(),
    };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'ORDER_STATE_CHANGED',
        senderId: this.kioskId,
        timestamp: Date.now(),
        payload: { logEntry: fullEntry },
      });
    } else {
      this.offlineQueue.push(fullEntry);
      logger.info(
        `[TouchSyncClient] Offline: queued mutation ${fullEntry.id} (${this.offlineQueue.length} pending)`,
      );
    }
  }

  public requestReconcile(): void {
    this.send({
      type: 'RECONCILE_REQUEST',
      senderId: this.kioskId,
      timestamp: Date.now(),
      payload: {
        logs: this.offlineQueue,
        lastReconciledTimestamp: this.lastReconciledTimestamp,
      },
    });
  }

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return;
    this.requestReconcile();
    this.offlineQueue = [];
  }

  private send(message: SyncMessage): boolean {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(message));
    return true;
  }

  public getOfflineQueueLength(): number {
    return this.offlineQueue.length;
  }

  public stop(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.bonjour?.destroy();
    this.bonjour = null;
    this.ws?.close();
    this.ws = null;
    [...this.peerTransfers.keys()].forEach((transferId) => {
      this.cleanupPeerTransfer(transferId);
    });
  }
}

export const touchSyncClient = TouchSyncClient.getInstance();
