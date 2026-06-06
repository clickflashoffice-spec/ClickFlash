const crypto = require('crypto');

/**
 * TokenRefreshService for Gallery Backend
 * Handles secure rotatable refresh tokens backed by SQLite
 */
class TokenRefreshService {
    /**
     * @param {Object} dbManager - The database manager instance
     * @param {Object} logger - The logger instance
     * @param {Object} auditLogger - The audit logger instance (optional)
     */
    constructor(dbManager, logger, auditLogger = null) {
        this.db = dbManager;
        this.logger = logger;
        this.auditLogger = auditLogger;
    }

    /**
     * Generate a new cryptographically secure refresh token
     */
    async generateRefreshToken(userId, expiresInDays = 30) {
        const token = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000)).toISOString();
        const tokenId = crypto.randomUUID();

        this.db.run(
            'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
            [tokenId, userId, token, expiresAt]
        );

        return token;
    }

    /**
     * Validate and rotate the refresh token
     */
    async validateAndRotateToken(token, clientInfo) {
        if (!token) return null;

        const tokenData = this.db.get(
            'SELECT * FROM refresh_tokens WHERE token = ?',
            [token]
        );

        if (!tokenData) {
            if (this.logger) this.logger.warn('Refresh token not found', { token_hint: token.substring(0, 8) });
            return null;
        }

        // Reuse detection
        if (tokenData.revoked === 1) {
            if (this.logger) this.logger.error('CRITICAL: Refresh token reuse detected!', { userId: tokenData.user_id, tokenId: tokenData.id });
            if (this.auditLogger) this.auditLogger.log('security', 'refresh_token_reuse', { userId: tokenData.user_id });
            this.revokeAllUserTokens(tokenData.user_id);
            return null;
        }

        // Expiry check
        if (new Date() > new Date(tokenData.expires_at)) {
            this.db.run('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?', [tokenData.id]);
            return null;
        }

        // Issue new token (rotation)
        const newToken = await this.generateRefreshToken(tokenData.user_id);
        const newTokenRecord = this.db.get('SELECT id FROM refresh_tokens WHERE token = ?', [newToken]);

        // Mark old token as revoked and replaced
        this.db.run(
            'UPDATE refresh_tokens SET revoked = 1, replaced_by = ?, client_info = ? WHERE id = ?',
            [newTokenRecord.id, clientInfo, tokenData.id]
        );

        return { userId: tokenData.user_id, newToken };
    }

    /**
     * Revoke a single refresh token
     */
    revokeToken(token) {
        this.db.run('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [token]);
    }

    /**
     * Revoke all tokens for a user
     */
    revokeAllUserTokens(userId) {
        this.db.run('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId]);
        if (this.logger) this.logger.info('All refresh tokens revoked for user', { userId });
    }

    /**
     * Cleanup
     */
    cleanupExpiredTokens() {
        const result = this.db.run('DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP');
        if (result.changes > 0 && this.logger) {
            this.logger.info(`Cleaned up ${result.changes} expired refresh tokens.`);
        }
    }
}

module.exports = TokenRefreshService;
