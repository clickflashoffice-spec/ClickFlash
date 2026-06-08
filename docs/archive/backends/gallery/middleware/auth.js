const jwt = require('jsonwebtoken');
const { sendAuthError } = require('../errorHandler');

/**
 * Authentication Middleware for Express
 * Validates the JWT token in the Authorization header
 */
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const clientIp = req.socket.remoteAddress || 'unknown';
    const auditLogger = req.app.get('auditLogger');
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (auditLogger) auditLogger.logUnauthorizedAccess(req.url, clientIp, 'NO_TOKEN');
        return sendAuthError(res, 'Authentication required. Please provide a valid token in the Authorization header.');
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        if (auditLogger) auditLogger.logUnauthorizedAccess(req.url, clientIp, 'INVALID_TOKEN');
        const message = e.name === 'TokenExpiredError'
            ? 'Your session has expired. Please log in again.'
            : 'Invalid authentication token. Please log in again.';
        sendAuthError(res, message);
    }
};

module.exports = authMiddleware;
