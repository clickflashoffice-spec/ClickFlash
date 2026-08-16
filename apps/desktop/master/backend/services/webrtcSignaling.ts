import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Logger } from '../utils/logger';
import { SDPMessage, ICECandidateMessage } from '@clickflash/types/webrtc';

const logger = new Logger('data', 'INFO');

export class WebRTCSignalingServer {
  private io: SocketIOServer;
  // Keep track of connected devices (photographers and managers)
  private clients: Map<string, string> = new Map();

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // Adjust in production
        methods: ['GET', 'POST']
      }
    });

    this.setupListeners();
  }

  private setupListeners() {
    this.io.on('connection', (socket) => {
      logger.info(`[WebRTC] Client connected: ${socket.id}`);

      socket.on('register', (data: { deviceId: string }) => {
        logger.info(`[WebRTC] Device registered: ${data.deviceId} -> ${socket.id}`);
        this.clients.set(data.deviceId, socket.id);
        socket.join(data.deviceId); // Allow direct messaging by deviceId
      });

      // Signaling: Offer
      socket.on('offer', (data: SDPMessage) => {
        logger.info(`[WebRTC] Offer from ${socket.id} to ${data.targetId}`);
        this.io.to(data.targetId).emit('INCOMING_CHECK_IN', { offer: data.sdp });
      });

      // Signaling: Answer
      socket.on('answer', (data: SDPMessage) => {
        logger.info(`[WebRTC] Answer from ${socket.id} to ${data.targetId}`);
        this.io.to(data.targetId).emit('answer', { answer: data.sdp });
      });

      // Signaling: ICE Candidate
      socket.on('ice-candidate', (data: ICECandidateMessage) => {
        this.io.to(data.targetId).emit('ice-candidate', { candidate: data.candidate });
      });

      socket.on('disconnect', () => {
        logger.info(`[WebRTC] Client disconnected: ${socket.id}`);
        // Remove from tracking map
        for (const [deviceId, socketId] of this.clients.entries()) {
          if (socketId === socket.id) {
            this.clients.delete(deviceId);
            break;
          }
        }
      });
    });
  }
}
