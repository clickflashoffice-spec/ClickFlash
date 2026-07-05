import logger from '../utils/logger';
import crypto from 'crypto';

export interface BookingPayload {
    bookingId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    tourDate: string;
    partySize: number;
    source: 'FareHarbor' | 'Rezgo' | 'Custom';
}

export class ReservationSyncService {
    
    /**
     * Processes an incoming webhook from a booking engine to pre-generate a gallery.
     */
    async handleBookingWebhook(payload: BookingPayload): Promise<{ galleryId: string; magicLink: string }> {
        logger.info(`[ReservationSync] Received booking from ${payload.source} for ${payload.customerName}`);
        
        // 1. Pre-generate a gallery ID
        const galleryId = `gal_${crypto.randomBytes(8).toString('hex')}`;
        
        // 2. Generate the magic link the guest will use to upload their selfie for face rec
        const magicLink = `https://clickflash.io/guest/${galleryId}?auth=${crypto.randomBytes(16).toString('hex')}`;
        
        // In a real DB, we would save:
        // db.galleries.insert({
        //     id: galleryId,
        //     bookingId: payload.bookingId,
        //     ownerEmail: payload.customerEmail,
        //     ownerPhone: payload.customerPhone,
        //     tourDate: payload.tourDate,
        //     status: 'PENDING_ARRIVAL'
        // });

        logger.info(`[ReservationSync] Pre-generated gallery ${galleryId} for booking ${payload.bookingId}`);
        
        // Optionally, send them a pre-arrival email/SMS asking them to upload a selfie now
        // to save time on the day of the tour.
        
        return { galleryId, magicLink };
    }
}

export default new ReservationSyncService();
