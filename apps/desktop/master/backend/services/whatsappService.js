import axios from 'axios';
/**
 * Service to handle WhatsApp Meta Cloud API communication.
 */
export class WhatsAppService {
    apiUrl;
    accessToken;
    phoneNumberId;
    constructor() {
        // Defaults assume Meta Cloud API configuration
        this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    }
    /**
     * Sends a plain text message to a customer.
     */
    async sendTextMessage(to, message) {
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('WhatsAppService: Access token or phone number ID not configured. Simulating send.');
            console.log(`[SIMULATED WHATSAPP] To: ${to} | Message: ${message}`);
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
        }
        catch (error) {
            console.error('WhatsAppService: Failed to send message:', error.response?.data || error.message);
            return false;
        }
    }
    /**
     * Sends a rich interactive message (e.g. quick reply buttons to view photos).
     */
    async sendInteractiveButtonMessage(to, bodyText, buttons) {
        if (!this.accessToken || !this.phoneNumberId) {
            console.warn('WhatsAppService: Access token or phone number ID not configured. Simulating interactive send.');
            console.log(`[SIMULATED WHATSAPP INTERACTIVE] To: ${to} | Text: ${bodyText} | Buttons: ${JSON.stringify(buttons)}`);
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
        }
        catch (error) {
            console.error('WhatsAppService: Failed to send interactive message:', error.response?.data || error.message);
            return false;
        }
    }
}
export const whatsappService = new WhatsAppService();
