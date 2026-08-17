import { RoverTelemetry, RoverCommand } from '@clickflash/types';
/* global RTCPeerConnection, RTCDataChannel */
import { redisCache } from '../../backend/services/redisCacheService';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export class RoverFleetOrchestrator extends EventEmitter {
  private static instance: RoverFleetOrchestrator;
  private rovers: Map<string, RoverTelemetry> = new Map();
  private maxRovers = 100;
  
  // WebRTC peer connections mapped by roverId
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  // WebRTC data channels mapped by roverId
  private dataChannels: Map<string, RTCDataChannel> = new Map();

  private constructor() {
    super();
    this.initPubSub();
  }

  public static getInstance(): RoverFleetOrchestrator {
    if (!RoverFleetOrchestrator.instance) {
      RoverFleetOrchestrator.instance = new RoverFleetOrchestrator();
    }
    return RoverFleetOrchestrator.instance;
  }

  private initPubSub(): void {
    logger.info('[RoverFleetOrchestrator] Initialized Redis pub/sub for rover telemetry.');
    // Simulated subscription logic since redisCache publishEvent is available,
    // and we assume a corresponding consumer pushes updates to this class.
  }

  public async dispatchRover(roverId: string, destination: { lat: number; lng: number }): Promise<void> {
    if (this.rovers.size >= this.maxRovers && !this.rovers.has(roverId)) {
      throw new Error(`Maximum number of concurrent rovers reached (${this.maxRovers}).`);
    }

    const command: RoverCommand = {
      commandId: crypto.randomUUID(),
      roverId,
      action: 'dispatch',
      payload: destination,
      timestamp: new Date().toISOString()
    };

    // Use publishEvent to Redis Streams (Kafka-like) as per ClickFlash rules
    await redisCache.publishEvent('rover_commands', {
      ...command,
      payload: JSON.stringify(command.payload)
    });

    logger.info(`[RoverFleetOrchestrator] Dispatched command to rover ${roverId}`);
  }

  public async commandRover(roverId: string, action: RoverCommand['action'], payload?: Record<string, unknown>): Promise<void> {
    const command: RoverCommand = {
      commandId: crypto.randomUUID(),
      roverId,
      action,
      payload,
      timestamp: new Date().toISOString()
    };

    await redisCache.publishEvent('rover_commands', {
      ...command,
      payload: JSON.stringify(command.payload)
    });

    logger.info(`[RoverFleetOrchestrator] Sent ${action} command to rover ${roverId}`);
  }

  public updateTelemetry(telemetry: RoverTelemetry): void {
    this.rovers.set(telemetry.roverId, telemetry);
    this.emit('telemetry_updated', telemetry);
  }

  public getTelemetry(roverId: string): RoverTelemetry | undefined {
    return this.rovers.get(roverId);
  }

  public getAllRovers(): RoverTelemetry[] {
    return Array.from(this.rovers.values());
  }

  /**
   * Set up WebRTC Data Channel for real-time video preview and low-latency control
   */
  public setupWebRTC(roverId: string): RTCPeerConnection {
    if (this.peerConnections.has(roverId)) {
      return this.peerConnections.get(roverId)!;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Create Data Channel for preview / control
    const dataChannel = peerConnection.createDataChannel('rover_video_preview', {
      ordered: false, // Unordered for lower latency video frames
      maxRetransmits: 0
    });

    dataChannel.onopen = () => {
      logger.info(`[RoverFleetOrchestrator] WebRTC DataChannel open for rover ${roverId}`);
    };

    dataChannel.onmessage = (event) => {
      // In a real scenario, this would be binary video frames from the rover
      this.emit('video_frame', { roverId, frame: event.data });
    };

    dataChannel.onclose = () => {
      logger.info(`[RoverFleetOrchestrator] WebRTC DataChannel closed for rover ${roverId}`);
      this.cleanupWebRTC(roverId);
    };

    peerConnection.oniceconnectionstatechange = () => {
      if (peerConnection.iceConnectionState === 'disconnected' || peerConnection.iceConnectionState === 'failed') {
        this.cleanupWebRTC(roverId);
      }
    };

    this.peerConnections.set(roverId, peerConnection);
    this.dataChannels.set(roverId, dataChannel);

    return peerConnection;
  }

  private cleanupWebRTC(roverId: string): void {
    const pc = this.peerConnections.get(roverId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(roverId);
    }
    
    const dc = this.dataChannels.get(roverId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(roverId);
    }
  }
}

export const roverFleetOrchestrator = RoverFleetOrchestrator.getInstance();
