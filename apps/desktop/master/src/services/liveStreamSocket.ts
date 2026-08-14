import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { logger } from "../utils/logger";

export class LiveStreamSocket {
    private io: Server | null = null;

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

            socket.on('disconnect', () => {
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
