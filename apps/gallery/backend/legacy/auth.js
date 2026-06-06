// backend/auth.js
// Utility functions for password hashing using bcrypt

const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12; // Adjust as needed for security vs performance

/**
 * Hash a plain text password.
 * @param {string} password - Plain text password.
 * @returns {Promise<string>} - Hashed password.
 */
async function hashPassword(password) {
    // Validate input
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        if (!hash || !hash.startsWith('$2')) {
            throw new Error('Failed to generate valid bcrypt hash');
        }
        return hash;
    } catch (error) {
        console.error('[Auth] Password hashing error:', error.message);
        throw error;
    }
}

/**
 * Compare a plain text password with a hashed password.
 * @param {string} password - Plain text password.
 * @param {string} hash - Hashed password from DB.
 * @returns {Promise<boolean>} - True if match.
 */
async function verifyPassword(password, hash) {
    // Validate inputs
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    if (!hash || typeof hash !== 'string') {
        throw new Error('Hash must be a non-empty string');
    }
    
    // Verify using bcrypt
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        // If bcrypt.compare throws an error, log it and return false
        console.error('[Auth] Password verification error:', error.message);
        throw error;
    }
}

module.exports = { hashPassword, verifyPassword };
