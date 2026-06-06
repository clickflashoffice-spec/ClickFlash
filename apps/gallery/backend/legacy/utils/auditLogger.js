// apps/gallery/backend/utils/auditLogger.js
/**
 * Audit Logger for Gallery Cloud
 * Provides structured audit logging for sync operations
 */

const fs = require('fs');
const path = require('path');

class GalleryAuditLogger {
    constructor(dataDir) {
        this.dataDir = dataDir || './data';
        this.logDir = path.join(this.dataDir, 'audit_logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    getLogFile() {
        const today = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `gallery-audit-${today}.log`);
    }

    formatLogEntry(level, event, details) {
        const timestamp = new Date().toISOString();
        return JSON.stringify({
            timestamp,
            level,
            event,
            ...details,
            service: 'gallery-cloud'
        }) + '\n';
    }

    log(level, event, details) {
        const logEntry = this.formatLogEntry(level, event, details);
        const logFile = this.getLogFile();

        try {
            fs.appendFileSync(logFile, logEntry, 'utf8');
        } catch (error) {
            console.error('[GalleryAudit] Failed to write log:', error.message);
        }
    }

    logOrderReceived(orderData, correlationId) {
        this.log('INFO', 'ORDER_RECEIVED', {
            correlationId,
            orderId: orderData.id,
            orderNumber: orderData.orderNumber,
            albumId: orderData.albumId,
            customerEmail: orderData.email,
            totalAmount: orderData.totalAmount,
            deskId: orderData.desk_id,
            photoCount: orderData.items ? (Array.isArray(orderData.items) ? orderData.items.length : 0) : 0
        });
    }

    logOrderActivated(orderId, correlationId, accessPin) {
        this.log('INFO', 'ORDER_ACTIVATED', {
            correlationId,
            orderId,
            accessPin,
            activatedAt: new Date().toISOString()
        });
    }

    logPhotoUploaded(photoId, orderId, correlationId, fileSize) {
        this.log('INFO', 'PHOTO_UPLOADED', {
            correlationId,
            orderId,
            photoId,
            fileSize,
            uploadedAt: new Date().toISOString()
        });
    }

    logSyncError(operation, error, correlationId, details = {}) {
        this.log('ERROR', 'SYNC_ERROR', {
            correlationId,
            operation,
            error: error.message || String(error),
            ...details
        });
    }

    logAccessGranted(orderId, token, correlationId) {
        this.log('INFO', 'ACCESS_GRANTED', {
            correlationId,
            orderId,
            accessToken: token ? token.substring(0, 8) + '...' : null,
            grantedAt: new Date().toISOString()
        });
    }

    logPurchase(orderId, correlationId, amount) {
        this.log('INFO', 'PURCHASE_COMPLETED', {
            correlationId,
            orderId,
            amount,
            purchasedAt: new Date().toISOString()
        });
    }
}

module.exports = GalleryAuditLogger;
