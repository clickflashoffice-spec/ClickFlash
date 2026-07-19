import { WebSocketServer } from 'ws';
// @ts-ignore
import { setupWSConnection } from 'y-websocket/bin/utils';
import { Server } from 'http';
import { Server as HttpsServer } from 'https';
import { logger } from '../utils/logger';

export class YjsWebsocketServer {
  private static wss: WebSocketServer | null = null;

  public static initialize(server: Server | HttpsServer, path: string = '/yjs'): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request, socket, head) => {
      if (request.url?.startsWith(path)) {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (conn, req) => {
      const docName = req.url?.split('/').pop() || 'default';
      logger.debug(`[Yjs] New connection to document: ${docName}`);
      setupWSConnection(conn, req, { docName });
    });

    logger.info(`[Yjs] WebSocket Server initialized on path ${path}`);
  }

  public static stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      logger.info('[Yjs] WebSocket Server stopped');
    }
  }
}
