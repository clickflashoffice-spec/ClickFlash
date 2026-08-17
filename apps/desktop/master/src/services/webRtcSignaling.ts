import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';

// Type declarations to avoid missing DOM types if they aren't fully configured
declare const RTCPeerConnection: any;
declare const RTCSessionDescription: any;
declare const RTCIceCandidate: any;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const RTCDataChannel: any;

export class WebRtcSignalingService {
  private wss: WebSocketServer | null = null;
  private peerConnections: Map<string, any> = new Map();
  private dataChannels: Map<string, any> = new Map();

  constructor(private port: number = 8092) {}

  public start() {
    this.wss = new WebSocketServer({ port: this.port });
    logger.info(`[WebRTC Signaling] WebSocket server listening on port ${this.port}`);

    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('[WebRTC Signaling] Client connected');
      const clientId = Math.random().toString(36).substring(7);

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleSignalingMessage(clientId, ws, data);
        } catch (error) {
          logger.error('[WebRTC Signaling] Message handling error', error);
        }
      });

      ws.on('close', () => {
        logger.info(`[WebRTC Signaling] Client disconnected: ${clientId}`);
        this.cleanupConnection(clientId);
      });
    });
  }

  private async handleSignalingMessage(clientId: string, ws: WebSocket, data: any) {
    if (data.type === 'auth') {
      const { token } = data;
      // Note: webrtcAuth token is matched here from Cloud backend's WhatsApp Magic Link
      logger.info(`[WebRTC Signaling] Client authenticated with token: ${token}`);
      this.initPeerConnection(clientId, ws);
      ws.send(JSON.stringify({ type: 'auth_success' }));
    } else if (data.type === 'offer') {
      const pc = this.peerConnections.get(clientId);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: 'answer', answer: pc.localDescription }));
    } else if (data.type === 'candidate') {
      const pc = this.peerConnections.get(clientId);
      if (!pc) return;
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } else if (data.type === 'request_file') {
      const { filePath } = data;
      this.streamFileToClient(clientId, filePath);
    }
  }

  private initPeerConnection(clientId: string, ws: WebSocket) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
      }
    };

    pc.ondatachannel = (event: any) => {
      const dc = event.channel;
      this.dataChannels.set(clientId, dc);
      
      dc.onopen = () => logger.info(`[WebRTC Signaling] DataChannel open for ${clientId}`);
      dc.onclose = () => logger.info(`[WebRTC Signaling] DataChannel closed for ${clientId}`);
      dc.onmessage = (e: any) => logger.info(`[WebRTC Signaling] DataChannel message: ${e.data}`);
    };

    this.peerConnections.set(clientId, pc);
  }

  private streamFileToClient(clientId: string, filePath: string) {
    const dc = this.dataChannels.get(clientId);
    if (!dc || dc.readyState !== 'open') {
      logger.error(`[WebRTC Signaling] Cannot stream file, DataChannel not open for ${clientId}`);
      return;
    }

    try {
      // For Node integration in Electron renderer, fs is available
      const fs = require('fs');
      const path = require('path');
      const resolvedPath = path.resolve(filePath);
      
      if (!fs.existsSync(resolvedPath)) {
         dc.send(JSON.stringify({ type: 'error', message: 'File not found' }));
         return;
      }

      logger.info(`[WebRTC Signaling] Streaming file to ${clientId}: ${resolvedPath}`);
      const fileStream = fs.createReadStream(resolvedPath);
      
      const stats = fs.statSync(resolvedPath);
      dc.send(JSON.stringify({
         type: 'file_metadata',
         filename: path.basename(resolvedPath),
         size: stats.size
      }));

      // Stream file chunks via DataChannel
      fileStream.on('data', (chunk: Buffer) => {
        const chunkSize = 16384; // 16KB to stay within standard safe limits
        for (let i = 0; i < chunk.length; i += chunkSize) {
           dc.send(chunk.subarray(i, i + chunkSize));
        }
      });

      fileStream.on('end', () => {
        dc.send(JSON.stringify({ type: 'file_complete', filename: path.basename(resolvedPath) }));
        logger.info(`[WebRTC Signaling] Finished streaming file to ${clientId}`);
      });
    } catch (error) {
      logger.error(`[WebRTC Signaling] File streaming error`, error);
      dc.send(JSON.stringify({ type: 'error', message: 'Failed to stream file' }));
    }
  }

  private cleanupConnection(clientId: string) {
    const dc = this.dataChannels.get(clientId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(clientId);
    }
    const pc = this.peerConnections.get(clientId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(clientId);
    }
  }

  public stop() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    for (const clientId of this.peerConnections.keys()) {
      this.cleanupConnection(clientId);
    }
  }
}
