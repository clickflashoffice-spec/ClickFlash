import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from "../utils/logger";

export class LiveStreamSocket {
    private io: Server | null = null;
    private connectedDevices: Map<string, string> = new Map(); // socketId -> deviceId
    private reverseDeviceMap: Map<string, string> = new Map(); // deviceId -> socketId

    /**
     * Initializes the Socket.io WebSocket server attached to the main Express HTTP server.
     */
    initialize(server: HttpServer) {
        this.io = new (Server as any)(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.io.on('connection', (socket: Socket) => {
            logger.info(`[LiveStream] Device connected: ${socket.id}`);

            // Guests will "join" a specific gallery room to listen for new photos
            socket.on('join_gallery', (galleryId: string) => {
                socket.join(`gallery_${galleryId}`);
                logger.info(`[LiveStream] Socket ${socket.id} joined gallery_${galleryId}`);
            });

            // --- WebRTC Signaling ---
            socket.on('register', (data: { deviceId: string }) => {
                this.connectedDevices.set(socket.id, data.deviceId);
                this.reverseDeviceMap.set(data.deviceId, socket.id);
                logger.info(`[LiveStream] Device registered for WebRTC: ${data.deviceId}`);
                
                // Notify manager that a device is live
                if (data.deviceId !== 'manager') {
                    this.io?.to(this.reverseDeviceMap.get('manager') || '').emit('device_status', { 
                        deviceId: data.deviceId, 
                        status: 'live' 
                    });
                }
            });

            socket.on('request_check_in', (data: { target: string, offer: any }) => {
                const targetSocket = this.reverseDeviceMap.get(data.target);
                if (targetSocket) {
                    this.io?.to(targetSocket).emit('INCOMING_CHECK_IN', { offer: data.offer, from: this.connectedDevices.get(socket.id) });
                }
            });

            socket.on('answer', (data: { target: string, answer: any }) => {
                const targetSocket = this.reverseDeviceMap.get(data.target);
                if (targetSocket) {
                    this.io?.to(targetSocket).emit('answer', { answer: data.answer, from: this.connectedDevices.get(socket.id) });
                }
            });

            socket.on('ice-candidate', (data: { target: string, candidate: any }) => {
                const targetSocket = this.reverseDeviceMap.get(data.target);
                if (targetSocket) {
                    this.io?.to(targetSocket).emit('ice-candidate', { candidate: data.candidate, from: this.connectedDevices.get(socket.id) });
                }
            });

            socket.on('disconnect', () => {
                const deviceId = this.connectedDevices.get(socket.id);
                if (deviceId) {
                    this.connectedDevices.delete(socket.id);
                    this.reverseDeviceMap.delete(deviceId);
                    
                    if (deviceId !== 'manager') {
                        this.io?.to(this.reverseDeviceMap.get('manager') || '').emit('device_status', { 
                            deviceId, 
                            status: 'offline' 
                        });
                    }
                }
                logger.info(`[LiveStream] Device disconnected: ${socket.id}`);
            });
        });

        logger.info('[LiveStream] WebSocket Server Initialized.');
    }

    /**
     * Broadcasts a new photo event to all guests connected to the specific gallery.
     * This achieves the "photos hit a guest's phone seconds after being captured" requirement.
     */
    broadcastNewPhoto(galleryId: string, photoData: { id: string; url: string; timestamp: Date }) {
        if (!this.io) {
            logger.error('[LiveStream] Cannot broadcast. WebSocket server not initialized.');
            return;
        }

        logger.info(`[LiveStream] Broadcasting NEW_PHOTO to gallery_${galleryId}`);
        this.io.to(`gallery_${galleryId}`).emit('new_photo_captured', photoData);
    }
}

export default new LiveStreamSocket();
