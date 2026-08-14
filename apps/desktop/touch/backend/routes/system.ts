import { Router, Request, Response } from 'express';
import os from 'os';
import { Logger } from '../shared/logger';
const logger = new Logger('logs');
import {
    sendError,
    sendInternalError,
    sendNotFoundError,
    ERROR_CODES,
    sendValidationError
} from '../shared/errorHandler';
import { customRoutesSchemas } from '../shared/validation';

const TABLE_MAP: Record<string, string> = {
    'users': 'users',
    'albums': 'albums',
    'photos': 'photos',
    'orders': 'orders',
    'products': 'products',
    'kiosks': 'kiosks',
    'settings': 'settings',
    'destinations': 'destinations',
    'session_types': 'session_types'
};

interface SystemContext {
    dbManager: any;
    logger: any;
    auditLogger: any;
    PORT: number;
    authMiddleware: any;
    rateLimiter: any;
}

interface BonjourService {
    name: string;
    referer: { address: string };
    port: number;
    txt?: { mode?: string; version?: string };
}

export default function createSystemRouter(context: SystemContext): Router {
    const router = Router();
    const {
        dbManager,
        logger,
        auditLogger,
        PORT,
        authMiddleware,
        rateLimiter
    } = context;

    /**
     * @route GET /api/health
     * @description Health check endpoint - returns server status
     */
    router.get('/health', async (req: Request, res: Response) => {
        try {
            const { getDefaultUserConfig } = await import('../shared/defaultUserConfig');
            const DEFAULT_USER = getDefaultUserConfig();

            const result = dbManager.get('SELECT COUNT(*) as count FROM users');
            const userCount = result ? result.count : 0;
            const defaultUserExists = dbManager.get('SELECT * FROM users WHERE email = ?', [DEFAULT_USER.email]);

            res.status(200).json({
                status: 'online',
                code: 200,
                version: '4.1.0',
                db: 'sqlite',
                security: 'enabled',
                userCount: userCount,
                defaultUserExists: !!defaultUserExists
            });
        } catch (err: any) {
            res.status(200).json({ status: 'online', code: 200, version: '4.1.0', db: 'sqlite', security: 'enabled', error: err.message });
        }
    });

    /**
     * @route GET /api/mode
     * @description Backend mode endpoint - returns backend mode and port
     */
    router.get('/mode', (req: Request, res: Response) => {
        res.status(200).json({
            mode: 'touch',
            backendPort: PORT
        });
    });

    /**
     * @route GET /api/ip
     * @description Network interface discovery endpoint
     */
    router.get('/ip', (req: Request, res: Response) => {
        logger.info('IP discovery endpoint accessed', { path: req.path, method: req.method });
        try {
            const results: { name: string, ip: string }[] = [];
            const nets = os.networkInterfaces();

            for (const name of Object.keys(nets)) {
                const interfaces = nets[name];
                if (interfaces) {
                    for (const net of interfaces) {
                        if (net.family === 'IPv4' && !net.internal) {
                            results.push({ name: name, ip: net.address });
                        }
                    }
                }
            }

            if (results.length === 0) {
                results.push({ name: 'Loopback', ip: '127.0.0.1' });
            }

            res.status(200).json({ interfaces: results });
        } catch (error: any) {
            logger.error('IP discovery error', {
                error: error.message,
                stack: error.stack,
            });
            res.status(200).json({ interfaces: [{ name: 'Loopback', ip: '127.0.0.1' }] });
        }
    });

    /**
     * @route GET /api/discovery
     * @description mDNS discovery for master server
     */
    router.get('/discovery', async (req: Request, res: Response) => {
        try {
            const g = global as any;
            if (!g.bonjourBrowser) {
                const { Bonjour } = await import('bonjour-service');
                const bonjour = new Bonjour();
                g.bonjourBrowser = bonjour;
                g.discoveredMasters = [];

                logger.info('[Discovery] Starting mDNS browser...');
                bonjour.find({ type: 'http' }, (service: BonjourService) => {
                    if (service.name === 'StarMaster' || (service.txt && service.txt.mode === 'master')) {
                        logger.info('[Discovery] Found Master:', service.name, service.referer.address);
                        const exists = g.discoveredMasters.find((s: any) => s.ip === service.referer.address);
                        if (!exists) {
                            g.discoveredMasters.push({
                                name: service.name,
                                ip: service.referer.address,
                                port: service.port,
                                version: service.txt ? service.txt.version : 'unknown'
                            });
                        }
                    }
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            res.status(200).json({ servers: g.discoveredMasters || [] });
        } catch (error: any) {
            if (typeof logger !== 'undefined' && logger.error) {
                logger.error('Discovery error', { error: error.message });
            }
            res.status(500).json({ error: error.message, servers: [] });
        }
    });

    /**
     * @route POST /api/data/refresh
     * @description Refresh data for specified collections or all collections
     */
    router.post('/data/refresh', rateLimiter, authMiddleware, async (req: Request, res: Response) => {
        try {
            const requestData = req.body || {};
            const refreshStartTime = Date.now();
            const collections: string[] | null = requestData.collections || null;
            const incremental = requestData.incremental !== false;

            logger.info('Data refresh requested', {
                collections: collections || 'all',
                incremental,
            });

            const refreshStatus: any = {
                startTime: new Date().toISOString(),
                collections: {},
                errors: []
            };

            const availableCollections = Object.keys(TABLE_MAP);
            const collectionsToRefresh = collections
                ? collections.filter(c => availableCollections.includes(c))
                : availableCollections;

            for (const collection of collectionsToRefresh) {
                try {
                    const table = TABLE_MAP[collection] || collection;
                    const result = dbManager.get(`SELECT COUNT(*) as count FROM ${table}`);
                    const count = result ? result.count : 0;

                    refreshStatus.collections[collection] = {
                        status: 'refreshed',
                        recordCount: count,
                        incremental: incremental
                    };

                    logger.info('Collection refreshed', {
                        collection,
                        table,
                        recordCount: refreshStatus.collections[collection].recordCount
                    });
                } catch (collectionError: any) {
                    refreshStatus.errors.push({
                        collection,
                        error: collectionError.message
                    });
                    logger.error('Collection refresh failed', {
                        collection,
                        error: collectionError.message,
                        stack: collectionError.stack
                    });
                }
            }

            const refreshDuration = Date.now() - refreshStartTime;
            refreshStatus.endTime = new Date().toISOString();
            refreshStatus.duration = `${refreshDuration}ms`;
            refreshStatus.success = refreshStatus.errors.length === 0;

            logger.info('Data refresh completed', {
                collectionsRefreshed: collectionsToRefresh.length,
                errors: refreshStatus.errors.length,
                duration: refreshStatus.duration
            });

            if (!res.headersSent) {
                res.status(200).json({
                    success: refreshStatus.success,
                    refreshed: collectionsToRefresh,
                    status: refreshStatus
                });
            }
        } catch (e: any) {
            logger.error('Data refresh error', {
                error: e.message,
                stack: e.stack,
            });
            auditLogger.logError(e, { endpoint: req.originalUrl, operation: 'POST' });
            if (!res.headersSent) {
                sendInternalError(res, e, 'data refresh');
            }
        }
    });

    /**
     * @route POST /api/settings
     * @description Save system settings
     */
    router.post('/settings', authMiddleware, async (req: Request, res: Response) => {
        try {
            const validation = customRoutesSchemas.systemSettings.safeParse(req.body);
            if (!validation.success) {
                return sendValidationError(res, "Invalid settings request", validation.error);
            }
            const { settings } = validation.data;
            logger.info('Saving system settings', { settings });

            dbManager.transaction(() => {
                const stmt = dbManager.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
                for (const [key, value] of Object.entries(settings)) {
                    const valToStore = typeof value === 'object' ? JSON.stringify(value) : String(value);
                    stmt.run(key, valToStore);
                }
            })();

            res.status(200).json({ success: true });
        } catch (e: any) {
            logger.error('Failed to save settings', { error: e.message });
            sendInternalError(res, e, 'saving settings');
        }
    });

    return router;
}
