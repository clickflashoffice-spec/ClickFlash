import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { WhatsAppService, whatsappService } from '../services/whatsappService';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('WhatsAppService & Meta Cloud API Delivery', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Simulation Mode (Missing Credentials)', () => {
        it('simulates text message delivery when access token or phone ID is not configured', async () => {
            delete process.env.WHATSAPP_ACCESS_TOKEN;
            delete process.env.WHATSAPP_PHONE_NUMBER_ID;

            const service = new WhatsAppService();
            const result = await service.sendTextMessage('+1234567890', 'Your photos are ready!');

            expect(result).toBe(true);
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('simulates interactive button message delivery when credentials are missing', async () => {
            delete process.env.WHATSAPP_ACCESS_TOKEN;
            delete process.env.WHATSAPP_PHONE_NUMBER_ID;

            const service = new WhatsAppService();
            const result = await service.sendInteractiveButtonMessage('+1234567890', 'Select an option:', [
                { id: 'btn_view', title: 'View Album' },
                { id: 'btn_buy', title: 'Buy Pass ($49)' },
            ]);

            expect(result).toBe(true);
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });
    });

    describe('Live Meta Cloud API Delivery', () => {
        beforeEach(() => {
            process.env.WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0';
            process.env.WHATSAPP_ACCESS_TOKEN = 'test-meta-cloud-token';
            process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_id_98765';
        });

        it('sends plain text message with correct Meta Cloud API payload and Bearer token', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                status: 200,
                data: { messages: [{ id: 'wamid.HBgLMTIzNDU2Nzg5MA==' }] },
            });

            const service = new WhatsAppService();
            const success = await service.sendTextMessage('+15551234567', 'Click to view your roller coaster photos: https://gallery.clickflash.com/gallery/tok_abc');

            expect(success).toBe(true);
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://graph.facebook.com/v17.0/phone_id_98765/messages',
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: '+15551234567',
                    type: 'text',
                    text: {
                        preview_url: true,
                        body: 'Click to view your roller coaster photos: https://gallery.clickflash.com/gallery/tok_abc',
                    },
                },
                {
                    headers: {
                        Authorization: 'Bearer test-meta-cloud-token',
                        'Content-Type': 'application/json',
                    },
                }
            );
        });

        it('sends interactive button message with formatted reply actions', async () => {
            mockedAxios.post.mockResolvedValueOnce({
                status: 201,
                data: { messages: [{ id: 'wamid.HBgLMTIzNDU2Nzg5MA==' }] },
            });

            const service = new WhatsAppService();
            const buttons = [
                { id: 'btn_unlock', title: 'Unlock All (20% Off)' },
                { id: 'btn_help', title: 'Ask Photographer' },
            ];

            const success = await service.sendInteractiveButtonMessage('+15551234567', 'Exclusive 24h Offer!', buttons);

            expect(success).toBe(true);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://graph.facebook.com/v17.0/phone_id_98765/messages',
                {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: '+15551234567',
                    type: 'interactive',
                    interactive: {
                        type: 'button',
                        body: { text: 'Exclusive 24h Offer!' },
                        action: {
                            buttons: [
                                { type: 'reply', reply: { id: 'btn_unlock', title: 'Unlock All (20% Off)' } },
                                { type: 'reply', reply: { id: 'btn_help', title: 'Ask Photographer' } },
                            ],
                        },
                    },
                },
                expect.any(Object)
            );
        });

        it('catches and wraps Axios errors in typed internal error for text messages', async () => {
            mockedAxios.post.mockRejectedValueOnce({
                response: { data: { error: { message: 'Invalid OAuth access token' } } },
                message: 'Request failed with status code 401',
            });

            const service = new WhatsAppService();
            await expect(service.sendTextMessage('+123', 'Hi')).rejects.toThrow('Failed to send WhatsApp text message');
        });

        it('catches and wraps Axios errors in typed internal error for interactive messages', async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error('Network timeout'));

            const service = new WhatsAppService();
            await expect(
                service.sendInteractiveButtonMessage('+123', 'Offer', [{ id: '1', title: 'Yes' }])
            ).rejects.toThrow('Failed to send WhatsApp interactive message');
        });
    });

    describe('Default Export Singleton', () => {
        it('exports default whatsappService instance', () => {
            expect(whatsappService).toBeInstanceOf(WhatsAppService);
        });
    });
});
