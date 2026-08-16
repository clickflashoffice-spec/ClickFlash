import axios from 'axios';
import { logger } from '@clickflash/logger';
import { internal } from '@clickflash/errors';

/**
 * Service to handle WhatsApp Meta Cloud API communication.
 */
export class WhatsAppService {
    private readonly apiUrl: string;
    private readonly accessToken: string;
    private readonly phoneNumberId: string;

    constructor() {
        // Defaults assume Meta Cloud API configuration
        this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    }

    /**
     * Sends a plain text message to a customer.
     */
    async sendTextMessage(to: string, message: string): Promise<boolean> {
        if (!this.accessToken || !this.phoneNumberId) {
            logger.warn('[WhatsAppService] Access token or phone number ID not configured. Simulating send.');
            logger.info(`[SIMULATED WHATSAPP] To: ${to} | Message: ${message}`);
            return true;
        }

        try {
            const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { preview_url: true, body: message }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.status === 200 || response.status === 201;
        } catch (error: any) {
            logger.error('[WhatsAppService] Failed to send message:', error.response?.data || error.message);
            throw internal('Failed to send WhatsApp text message', error);
        }
    }

    /**
     * Sends a rich interactive message (e.g. quick reply buttons to view photos).
     */
    async sendInteractiveButtonMessage(to: string, bodyText: string, buttons: { id: string; title: string }[]): Promise<boolean> {
        if (!this.accessToken || !this.phoneNumberId) {
             logger.warn('[WhatsAppService] Access token or phone number ID not configured. Simulating interactive send.');
             logger.info(`[SIMULATED WHATSAPP INTERACTIVE] To: ${to} | Text: ${bodyText} | Buttons: ${JSON.stringify(buttons)}`);
             return true;
        }

        try {
            const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: bodyText },
                    action: {
                        buttons: buttons.map(b => ({
                            type: 'reply',
                            reply: { id: b.id, title: b.title }
                        }))
                    }
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.status === 200 || response.status === 201;
        } catch (error: any) {
             logger.error('[WhatsAppService] Failed to send interactive message:', error.response?.data || error.message);
             throw internal('Failed to send WhatsApp interactive message', error);
        }
    }
}

export const whatsappService = new WhatsAppService();
