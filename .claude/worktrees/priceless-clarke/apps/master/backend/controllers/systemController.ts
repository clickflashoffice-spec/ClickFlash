// backend/controllers/systemController.ts
// System Controller

import os from 'os';
import path from 'path';
import fs from 'fs';
import { IncomingMessage, ServerResponse } from 'http';
import DatabaseManager from '../shared/db';
import { Logger } from '../shared/logger';

interface Context {
    PORT: number | string;
    DATA_DIR: string;
    logger: Logger;
    dbManager: DatabaseManager;
}

interface IpInterface {
    name: string;
    ip: string;
    netmask: string;
    mac: string;
}

export default class SystemController {
    static async getHealth(req: IncomingMessage, res: ServerResponse, context: Context): Promise<void> {
        const { dbManager } = context;
        try {
            // Verify database connection
            // query returns array, if logic is correct
            dbManager.query('SELECT 1');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'online',
                code: 200,
                version: '4.1.0',
                db: 'sqlite',
                security: 'enabled',
                timestamp: new Date().toISOString()
            }));
        } catch (e) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                code: 503,
                error: 'Database connection failed',
                timestamp: new Date().toISOString()
            }));
        }
    }

    static async getMode(req: IncomingMessage, res: ServerResponse, context: Context): Promise<void> {
        const { PORT, logger } = context;
        try {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                mode: 'master',
                backendPort: PORT
            }));
        } catch (error: any) {
            logger.error('Mode endpoint error', { error: error.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    static async getIp(req: IncomingMessage, res: ServerResponse, context: Context): Promise<void> {
        const { logger } = context;
        try {
            const interfaces = os.networkInterfaces();
            const ipList: IpInterface[] = [];

            Object.keys(interfaces).forEach(name => {
                const iface = interfaces[name];
                if (iface) {
                    iface.forEach((net: os.NetworkInterfaceInfo) => {
                        if (net.family === 'IPv4' && !net.internal) {
                            ipList.push({
                                name: name,
                                ip: net.address,
                                netmask: net.netmask,
                                mac: net.mac
                            });
                        }
                    });
                }
            });

            // Always include localhost for local testing
            ipList.unshift({
                name: 'Loopback',
                ip: '127.0.0.1',
                netmask: '255.0.0.0',
                mac: '00:00:00:00:00:00'
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ interfaces: ipList }));
        } catch (error: any) {
            logger.error('IP endpoint error', { error: error.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    static async getNetworkSettings(req: IncomingMessage, res: ServerResponse, context: Context): Promise<void> {
        const { DATA_DIR, logger } = context;
        try {
            const settingsPath = path.join(DATA_DIR, 'network_settings.json');

            if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(settings));
            } else {
                // Return default settings if file doesn't exist
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    masterLocalIp: '127.0.0.1',
                    masterSharedImportFolder: '',
                    connectionMode: 'local',
                    cloudUrl: ''
                }));
            }
        } catch (error: any) {
            logger.error('Failed to load network settings', { error: error.message, stack: error.stack });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
    }

    static async saveNetworkSettings(req: IncomingMessage, res: ServerResponse, context: Context): Promise<void> {
        const { DATA_DIR, logger, dbManager } = context;
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const settings = JSON.parse(body);
                const settingsPath = path.join(DATA_DIR, 'network_settings.json');

                // Ensure pb_data directory exists
                const dir = path.dirname(settingsPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Save settings to file
                fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

                // Also save sharedFolderPath to database for backward compatibility and consistency
                if (settings.masterSharedImportFolder) {
                    try {
                        const existing = dbManager.get("SELECT * FROM settings WHERE key = 'sharedFolderPath'");
                        if (existing) {
                            dbManager.run("UPDATE settings SET value = ?, updatedAt = ? WHERE key = 'sharedFolderPath'",
                                [settings.masterSharedImportFolder, new Date().toISOString()]);
                        } else {
                            dbManager.run("INSERT INTO settings (key, value, createdAt, updatedAt) VALUES ('sharedFolderPath', ?, ?, ?)",
                                [settings.masterSharedImportFolder, new Date().toISOString(), new Date().toISOString()]);
                        }
                        logger.info('Synced sharedFolderPath to database settings');
                    } catch (dbErr: any) {
                        logger.warn('Failed to sync sharedFolderPath to database', { error: dbErr.message });
                    }
                }

                logger.info('Network settings saved', { settings });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Network settings saved successfully' }));
            } catch (error: any) {
                logger.error('Failed to save network settings', { error: error.message, stack: error.stack });
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    }

    static async getKioskSessions(req: IncomingMessage, res: ServerResponse, context: Context): Promise<void> {
        const { dbManager, logger } = context;
        try {
            // Get active kiosk sessions from database
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            interface KioskSessionRow {
                kioskId: string;
            }
            const sessions = dbManager.query<KioskSessionRow>(
                'SELECT kioskId FROM kiosk_sessions WHERE last_seen >= ?',
                [fiveMinutesAgo]
            );

            const activeKioskIds = sessions.map(s => s.kioskId).filter(Boolean);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ activeKioskIds }));
        } catch (error: any) {
            logger.error('Failed to get kiosk sessions', { error: error.message });
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
        }
    }
}
