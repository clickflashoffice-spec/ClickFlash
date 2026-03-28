/**
 * Money Trash API Routes for Customer Gallery
 * Provides endpoints for browsing and purchasing archived photos
 */

const express = require('express');
const router = express.Router();
const { getDatabase } = require('../db');
const { authenticateToken } = require('../auth');
const crypto = require('crypto');

/**
 * GET /api/moneytrash/gallery/:accessCode
 * Fetch archived photos for a customer by access code
 */
router.get('/gallery/:accessCode', async (req, res) => {
    try {
        const { accessCode } = req.params;
        const db = getDatabase();
        
        // Verify access code exists and is valid
        const accessRecord = db.prepare(`
            SELECT * FROM access_codes 
            WHERE code = ? AND is_active = 1 
            AND (expires_at IS NULL OR expires_at > datetime('now'))
        `).get(accessCode);
        
        if (!accessRecord) {
            return res.status(404).json({
                success: false,
                error: 'Invalid or expired access code'
            });
        }
        
        // Get Money Trash configuration
        const config = db.prepare(`
            SELECT setting_value FROM gallery_settings 
            WHERE setting_key = 'money_trash_config'
        `).get();
        
        const trashConfig = config ? JSON.parse(config.setting_value) : {
            enabled: true,
            discountPercentage: 50,
            retentionDays: 30
        };
        
        if (!trashConfig.enabled) {
            return res.status(403).json({
                success: false,
                error: 'Money Trash feature is currently disabled'
            });
        }
        
        // Fetch archived photos
        const photos = db.prepare(`
            SELECT 
                ap.id,
                ap.original_photo_id,
                ap.album_id,
                ap.url,
                ap.thumbnail_url,
                ap.title,
                ap.archived_at,
                ap.expires_at,
                ap.metadata,
                a.title as album_name,
                a.date as event_date
            FROM archived_photos ap
            LEFT JOIN albums a ON ap.album_id = a.id
            WHERE ap.access_code = ?
            AND ap.status = 'available'
            AND ap.expires_at > datetime('now')
            ORDER BY ap.expires_at ASC
        `).all(accessCode);
        
        // Transform photos with pricing
        const transformedPhotos = photos.map(photo => {
            const originalPrice = 15; // Base price
            const discountPercentage = trashConfig.discountPercentage;
            const discountPrice = Math.round(originalPrice * (1 - discountPercentage / 100) * 100) / 100;
            
            const expiresAt = new Date(photo.expires_at);
            const now = new Date();
            const daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
            
            return {
                id: photo.id,
                originalPhotoId: photo.original_photo_id,
                url: photo.url,
                thumbnailUrl: photo.thumbnail_url,
                title: photo.title || 'Archived Photo',
                albumName: photo.album_name,
                eventDate: photo.event_date,
                archivedAt: photo.archived_at,
                expiresAt: photo.expires_at,
                daysRemaining,
                originalPrice,
                discountPrice,
                discountPercentage,
                metadata: photo.metadata ? JSON.parse(photo.metadata) : null
            };
        });
        
        if (transformedPhotos.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No archived photos available for this access code'
            });
        }
        
        // Calculate urgency
        const urgentPhotos = transformedPhotos.filter(p => p.daysRemaining <= 3);
        const totalRevenuePotential = transformedPhotos.reduce((sum, p) => sum + p.discountPrice, 0);
        
        res.json({
            success: true,
            data: {
                accessCode,
                eventName: transformedPhotos[0]?.albumName || 'Archived Photos',
                eventDate: transformedPhotos[0]?.eventDate,
                totalCount: transformedPhotos.length,
                urgentCount: urgentPhotos.length,
                totalRevenuePotential,
                discountPercentage: trashConfig.discountPercentage,
                expiresAt: transformedPhotos[0]?.expiresAt,
                photos: transformedPhotos
            }
        });
        
    } catch (error) {
        console.error('MoneyTrash gallery fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch archived photos',
            details: error.message
        });
    }
});

/**
 * POST /api/moneytrash/purchase
 * Purchase and recover a photo from trash
 */
router.post('/purchase', async (req, res) => {
    try {
        const { photoId, accessCode, customerEmail, paymentMethod, orderId } = req.body;
        
        if (!photoId || !accessCode || !customerEmail) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: photoId, accessCode, customerEmail'
            });
        }
        
        const db = getDatabase();
        
        // Check if photo exists and is available
        const photo = db.prepare(`
            SELECT * FROM archived_photos 
            WHERE id = ? AND access_code = ? AND status = 'available'
        `).get(photoId, accessCode);
        
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found or no longer available'
            });
        }
        
        // Get pricing
        const config = db.prepare(`
            SELECT setting_value FROM gallery_settings 
            WHERE setting_key = 'money_trash_config'
        `).get();
        
        const trashConfig = config ? JSON.parse(config.setting_value) : { discountPercentage: 50 };
        const originalPrice = 15;
        const discountPrice = Math.round(originalPrice * (1 - trashConfig.discountPercentage / 100) * 100) / 100;
        
        // Create or update order
        let finalOrderId = orderId;
        if (!finalOrderId) {
            finalOrderId = `ORD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            
            db.prepare(`
                INSERT INTO orders (id, clientName, email, total, status, date, paymentMethod)
                VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
            `).run(finalOrderId, customerEmail.split('@')[0], customerEmail, discountPrice, 'Pending', paymentMethod);
        } else {
            // Update existing order total
            const existingOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(finalOrderId);
            if (existingOrder) {
                const newTotal = existingOrder.total + discountPrice;
                db.prepare('UPDATE orders SET total = ? WHERE id = ?').run(newTotal, finalOrderId);
            }
        }
        
        // Add order item
        db.prepare(`
            INSERT INTO order_items (id, order_id, name, format, quantity, price, photo_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            `ITEM-${Date.now()}`,
            finalOrderId,
            photo.title || 'Archived Photo',
            'Digital Download',
            1,
            discountPrice,
            photoId
        );
        
        // Mark photo as purchased
        db.prepare(`
            UPDATE archived_photos 
            SET status = 'purchased', 
                purchased_at = datetime('now'),
                order_id = ?
            WHERE id = ?
        `).run(finalOrderId, photoId);
        
        // Generate download URL
        const downloadUrl = `/api/download/archived/${photoId}?token=${generateDownloadToken(photoId)}`;
        
        res.json({
            success: true,
            data: {
                orderId: finalOrderId,
                photoId,
                price: discountPrice,
                downloadUrl,
                message: 'Photo purchased successfully'
            }
        });
        
    } catch (error) {
        console.error('MoneyTrash purchase error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to purchase photo',
            details: error.message
        });
    }
});

/**
 * GET /api/moneytrash/stats/:accessCode
 * Get recovery statistics for a gallery
 */
router.get('/stats/:accessCode', authenticateToken, async (req, res) => {
    try {
        const { accessCode } = req.params;
        const db = getDatabase();
        
        const stats = db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN status = 'purchased' THEN 1 ELSE 0 END) as purchased,
                SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
                SUM(CASE WHEN status = 'purchased' THEN price ELSE 0 END) as revenue
            FROM archived_photos
            WHERE access_code = ?
        `).get(accessCode);
        
        res.json({
            success: true,
            data: {
                totalArchived: stats.total,
                available: stats.available,
                purchased: stats.purchased,
                expired: stats.expired,
                revenue: stats.revenue || 0,
                conversionRate: stats.total > 0 ? (stats.purchased / stats.total * 100).toFixed(2) : 0
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/download/archived/:photoId
 * Download a purchased archived photo
 */
router.get('/download/archived/:photoId', async (req, res) => {
    try {
        const { photoId } = req.params;
        const { token } = req.query;
        
        // Verify token
        if (!verifyDownloadToken(photoId, token)) {
            return res.status(403).json({
                success: false,
                error: 'Invalid download token'
            });
        }
        
        const db = getDatabase();
        
        const photo = db.prepare(`
            SELECT * FROM archived_photos 
            WHERE id = ? AND status = 'purchased'
        `).get(photoId);
        
        if (!photo) {
            return res.status(404).json({
                success: false,
                error: 'Photo not found or not purchased'
            });
        }
        
        // Serve file
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'uploads', 'archived', photo.url);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        
        res.setHeader('Content-Disposition', `attachment; filename="${photo.title || 'photo'}.jpg"`);
        res.setHeader('Content-Type', 'image/jpeg');
        
        fs.createReadStream(filePath).pipe(res);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper functions
function generateDownloadToken(photoId) {
    const secret = process.env.JWT_SECRET || 'default-secret';
    return crypto.createHmac('sha256', secret).update(photoId).digest('hex');
}

function verifyDownloadToken(photoId, token) {
    if (!token) return false;
    const expected = generateDownloadToken(photoId);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

module.exports = router;
