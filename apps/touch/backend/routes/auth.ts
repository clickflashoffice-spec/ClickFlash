import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyPassword, hashPassword } from '../shared/auth';
import { validateLogin } from '../shared/validation';
import { sendAuthError, sendInvalidInputError, sendInternalError, sendValidationError } from '../shared/errorHandler';
import { getDefaultUserConfig, shouldAutoCreateUser } from '../shared/defaultUserConfig';
import { isDefaultPassword } from '../shared/passwordValidator';
import { DatabaseManager } from '../shared/db';
import { Logger } from '../shared/logger';
import AuditLogger from '../shared/auditLogger';

interface AuthContext {
    dbManager: DatabaseManager;
    logger: Logger;
    auditLogger: AuditLogger;
    JWT_SECRET: string;
}

export default function createAuthRouter(context: AuthContext): Router {
    const router = Router();
    const { dbManager, logger, auditLogger, JWT_SECRET } = context;

    /**
     * @route POST /api/init/default-user
     * @description Initialize or reset default admin user
     */
    router.post('/init/default-user', async (req: Request, res: Response) => {
        try {
            const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
            const force = urlObj.searchParams.get('force') === 'true';

            const DEFAULT_USER = getDefaultUserConfig();
            const existingUser = dbManager.get<{ password?: string, email: string, role: string }>('SELECT * FROM users WHERE email = ?', [DEFAULT_USER.email]);

            const isPasswordHashed = existingUser?.password && (
                existingUser.password.startsWith('$2a$') ||
                existingUser.password.startsWith('$2b$') ||
                existingUser.password.startsWith('$2y$')
            );

            if (existingUser && isPasswordHashed && !force) {
                try {
                    const testPassword = await verifyPassword(DEFAULT_USER.password, existingUser.password!);
                    if (testPassword) {
                        return res.status(200).json({
                            success: true,
                            message: 'Default user already exists and password is valid.',
                            user: {
                                email: existingUser.email,
                                role: existingUser.role
                            }
                        });
                    }
                } catch (verifyErr: any) {
                    logger.warn('Password verification failed, will reset', {
                        error: verifyErr.message,
                        email: existingUser.email
                    });
                }
            }

            if (existingUser && (!isPasswordHashed || force)) {
                if (force) {
                    dbManager.run('DELETE FROM users WHERE email = ?', [DEFAULT_USER.email]);
                    logger.info('Deleted existing default user for recreation', { email: DEFAULT_USER.email });
                } else {
                    logger.info('Resetting invalid password for existing user', { email: DEFAULT_USER.email });
                }
            }

            const hashedPassword = await hashPassword(DEFAULT_USER.password);

            if (existingUser && !force && isPasswordHashed) {
                dbManager.run('UPDATE users SET password = ?, name = ?, role = ? WHERE email = ?', [
                    hashedPassword,
                    DEFAULT_USER.name,
                    DEFAULT_USER.role,
                    DEFAULT_USER.email
                ]);
                logger.info('Default user password updated via API', { email: DEFAULT_USER.email });
            } else {
                const insertSql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
                dbManager.run(insertSql, [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]);
                logger.info('Default user created/reset via API', { email: DEFAULT_USER.email, forced: force });
            }

            res.status(200).json({
                success: true,
                message: force
                    ? 'Default admin user reset successfully'
                    : (existingUser ? 'Default admin user password reset successfully' : 'Default admin user created successfully'),
                user: {
                    email: DEFAULT_USER.email,
                    role: DEFAULT_USER.role
                }
            });

        } catch (err: any) {
            logger.error('Failed to initialize default user', { error: err.message });
            sendInternalError(res, 'Failed to initialize default user: ' + err.message);
        }
    });

    /**
     * @route POST /api/auth/login
     * @description User authentication endpoint
     */
    router.post('/auth/login', async (req: Request, res: Response) => {
        try {
            const parsedBody = req.body;
            const validation = validateLogin(parsedBody);
            if (!validation.success) {
                return sendValidationError(res, 'Invalid login credentials. Please check your email and password format.', validation.details);
            }

            const { email, password } = validation.data!;
            const clientIp = req.socket.remoteAddress || 'unknown';
            const DEFAULT_USER = getDefaultUserConfig();

            let user = dbManager.get<{ id: string, email: string, name: string, role: string, password?: string, password_must_change?: number }>('SELECT * FROM users WHERE email = ?', [email]);

            if (!user && shouldAutoCreateUser()) {
                logger.info('Login attempt - user not found', { email, isDefaultUser: email === DEFAULT_USER.email });
                if (email === DEFAULT_USER.email && password === DEFAULT_USER.password) {
                    try {
                        const hashedPassword = await hashPassword(DEFAULT_USER.password);
                        const insertSql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;
                        dbManager.run(insertSql, [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]);
                        user = dbManager.get('SELECT * FROM users WHERE email = ?', [email]);
                        logger.info('Auto-created default user', { email: DEFAULT_USER.email });
                    } catch (createErr: any) {
                        logger.error('Failed to auto-create default user during login', { error: createErr.message });
                    }
                }
            }

            if (!user) {
                auditLogger.logLoginAttempt(email, false, clientIp, 'USER_NOT_FOUND');
                return sendAuthError(res, 'Invalid email or password. Please check your credentials and try again.');
            }

            let isValidPassword = false;
            const safeUser = user!;

            if (!safeUser.password) {
                isValidPassword = false;
            } else {
                const isPasswordHashed = safeUser.password && (safeUser.password.startsWith('$2a$') || safeUser.password.startsWith('$2b$') || safeUser.password.startsWith('$2y$'));
                if (isPasswordHashed) {
                    try {
                        isValidPassword = await verifyPassword(password, safeUser.password);
                    } catch (verifyErr: any) {
                        isValidPassword = false;
                    }
                } else {
                    isValidPassword = false;
                }
            }

            if (!isValidPassword && shouldAutoCreateUser() && email === DEFAULT_USER.email && password === DEFAULT_USER.password) {
                try {
                    const hashedPassword = await hashPassword(password);
                    dbManager.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
                    const updatedUser = dbManager.get<{ id: string, email: string, name: string, role: string, password?: string }>('SELECT * FROM users WHERE email = ?', [email]);
                    if (updatedUser && updatedUser.password) {
                        isValidPassword = await verifyPassword(password, updatedUser.password);
                        user = updatedUser as any;
                    }
                    logger.info('Reset password for default user', { email });
                } catch (resetErr: any) {
                    logger.error('Failed to reset password', { error: resetErr.message });
                }
            }

            if (!isValidPassword) {
                auditLogger.logLoginAttempt(email, false, clientIp, 'INVALID_PASSWORD');
                return sendAuthError(res, 'Invalid email or password. Please check your credentials and try again.');
            }

            const mustChange = (safeUser.password_must_change === 1) || isDefaultPassword(password);

            const token = jwt.sign(
                {
                    id: safeUser.id,
                    email: safeUser.email,
                    role: safeUser.role,
                    requirePasswordChange: mustChange
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            auditLogger.logLoginAttempt(email, true, clientIp);

            const userResponse = {
                id: safeUser.id,
                email: safeUser.email,
                name: safeUser.name,
                role: safeUser.role,
                requirePasswordChange: mustChange
            };

            res.status(200).json({
                token,
                user: userResponse
            });

        } catch (e: any) {
            const error = e instanceof Error ? e : new Error(String(e));
            const clientIp = req.socket.remoteAddress || 'unknown';
            logger.error('Login error', { error: error.message, stack: error.stack });
            auditLogger.logError(error, { endpoint: '/api/auth/login', ip: clientIp });

            if (error instanceof SyntaxError) {
                sendInvalidInputError(res, 'Invalid request format. Please ensure your request is valid JSON.');
            } else {
                sendInternalError(res, error, 'login endpoint');
            }
        }
    });

    /**
     * @route POST /api/collections/users/auth-with-password
     * @description Standard PocketBase authentication endpoint
     */
    router.post('/collections/users/auth-with-password', async (req: Request, res: Response) => {
        try {
            const parsedBody = req.body;
            const loginData = {
                email: parsedBody.identity,
                password: parsedBody.password
            };

            const validation = validateLogin(loginData);
            if (!validation.success) {
                return sendValidationError(res, 'Invalid login credentials.', validation.details);
            }

            const { email, password } = validation.data!;
            const clientIp = req.socket.remoteAddress || 'unknown';
            const DEFAULT_USER = getDefaultUserConfig();

            let user = dbManager.get<{ id: string, email: string, name: string, role: string, password?: string }>('SELECT * FROM users WHERE email = ?', [email]);

            if (!user && shouldAutoCreateUser()) {
                if (email === DEFAULT_USER.email && password === DEFAULT_USER.password) {
                    try {
                        const hashedPassword = await hashPassword(DEFAULT_USER.password);
                        dbManager.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`, [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role]);
                        user = dbManager.get('SELECT * FROM users WHERE email = ?', [email]);
                        logger.info('Auto-created default user via PocketBase endpoint', { email: DEFAULT_USER.email });
                    } catch (createErr: any) {
                        logger.error('Failed to auto-create user', { error: createErr.message });
                    }
                }
            }

            if (!user) {
                auditLogger.logLoginAttempt(email, false, clientIp, 'USER_NOT_FOUND');
                return sendAuthError(res, 'Invalid email or password.');
            }

            let isValidPassword = false;
            let safeUser = user!;

            if (safeUser.password) {
                const isPasswordHashed = safeUser.password.startsWith('$2a$') || safeUser.password.startsWith('$2b$') || safeUser.password.startsWith('$2y$');
                if (isPasswordHashed) {
                    try { isValidPassword = await verifyPassword(password, safeUser.password); } catch (e: any) { }
                }
            }

            if (!isValidPassword && shouldAutoCreateUser() && email === DEFAULT_USER.email && password === DEFAULT_USER.password) {
                try {
                    const hashedPassword = await hashPassword(password);
                    dbManager.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
                    const updatedUser = dbManager.get<{ id: string, email: string, name: string, role: string, password?: string }>('SELECT * FROM users WHERE email = ?', [email]);
                    if (updatedUser && updatedUser.password) {
                        isValidPassword = await verifyPassword(password, updatedUser.password);
                        safeUser = updatedUser;
                        user = updatedUser;
                    }
                } catch (e: any) {
                    logger.error('Failed to reset password', { error: e.message });
                }
            }

            if (!isValidPassword) {
                auditLogger.logLoginAttempt(email, false, clientIp, 'INVALID_PASSWORD');
                return sendAuthError(res, 'Invalid email or password.');
            }

            auditLogger.logLoginAttempt(email, true, clientIp);
            const token = jwt.sign({ id: safeUser.id, email: safeUser.email, role: safeUser.role }, JWT_SECRET, { expiresIn: '24h' });

            const { password: _p, ...userWithoutPassword } = safeUser;

            res.status(200).json({
                token,
                record: {
                    ...userWithoutPassword,
                    collectionId: 'users',
                    collectionName: 'users'
                }
            });

        } catch (e: any) {
            const error = e instanceof Error ? e : new Error(String(e));
            logger.error('Login error', { error: error.message });
            sendInternalError(res, error, 'auth endpoint');
        }
    });

    return router;
}
