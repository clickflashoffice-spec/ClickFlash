import { logger } from "../utils/logger";

export interface SMSPayload {
    phoneNumber: string;
    guestName?: string;
    galleryUrl: string;
    messageType: 'NEW_PHOTO' | 'GALLERY_READY' | 'REMINDER';
}

export class SMSDeliveryService {
    /**
     * Sends an SMS via Twilio (or similar provider) with a direct link to the guest's photos.
     * This simulates the "Drop" delivery mechanism.
     */
    async sendSMS(payload: SMSPayload): Promise<boolean> {
        logger.info(`[SMS Delivery] Preparing to send ${payload.messageType} SMS to ${payload.phoneNumber}`);
        
        let messageBody = '';
        switch(payload.messageType) {
            case 'NEW_PHOTO':
                messageBody = `Hi ${payload.guestName || 'there'}! A new photo of you was just captured at our venue. View it here: ${payload.galleryUrl}`;
                break;
            case 'GALLERY_READY':
                messageBody = `Your full photo gallery from today is ready! View and download your memories here: ${payload.galleryUrl}`;
                break;
            case 'REMINDER':
                messageBody = `Don't forget to download your photos before they expire! Access them here: ${payload.galleryUrl}`;
                break;
        }

        // Simulating external API call to SMS provider
        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Fake network latency
            logger.info(`[SMS Delivery] Successfully sent message to ${payload.phoneNumber}: "${messageBody}"`);
            return true;
        } catch (error) {
            logger.error(`[SMS Delivery] Failed to send SMS to ${payload.phoneNumber}`, error);
            return false;
        }
    }
}

export default new SMSDeliveryService();
