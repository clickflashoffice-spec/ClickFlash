import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { whatsappRoutes } from '../routes/whatsappRoutes';
import { aiSalesOrchestrator } from '../services/aiSalesOrchestrator';

vi.mock('../services/aiSalesOrchestrator', () => ({
    aiSalesOrchestrator: {
        handleIncomingReply: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('WhatsApp Fastify Webhook Routes', () => {
    let fastify: FastifyInstance;
    const originalEnv = process.env;

    beforeEach(async () => {
        vi.clearAllMocks();
        process.env = {
            ...originalEnv,
            WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'clickflash_secret_token_123',
        };

        fastify = Fastify({ logger: false });
        await fastify.register(whatsappRoutes);
        await fastify.ready();
    });

    afterEach(async () => {
        await fastify.close();
        process.env = originalEnv;
    });

    describe('GET /webhook/whatsapp - Meta Webhook Handshake Verification', () => {
        it('returns challenge with HTTP 200 when hub.mode is subscribe and token matches', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/webhook/whatsapp',
                query: {
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'clickflash_secret_token_123',
                    'hub.challenge': '1158201244',
                },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body).toBe('1158201244');
        });

        it('returns HTTP 403 Forbidden when verify token does not match', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/webhook/whatsapp',
                query: {
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'wrong_token',
                    'hub.challenge': '1158201244',
                },
            });

            expect(response.statusCode).toBe(403);
            expect(response.body).toBe('Forbidden');
        });

        it('returns HTTP 400 Bad Request when required hub parameters are missing', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/webhooks/whatsapp',
                query: {},
            });

            expect(response.statusCode).toBe(400);
            expect(response.body).toBe('Missing hub parameters');
        });

        it('verifies across alternative route aliases', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/whatsapp/webhook',
                query: {
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'clickflash_secret_token_123',
                    'hub.challenge': '999888777',
                },
            });

            expect(response.statusCode).toBe(200);
            expect(response.body).toBe('999888777');
        });
    });

    describe('POST /webhook/whatsapp - Inbound Message Ingestion', () => {
        it('parses incoming plain text WhatsApp message and triggers AI Negotiator Agent', async () => {
            const payload = {
                object: 'whatsapp_business_account',
                entry: [
                    {
                        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
                        changes: [
                            {
                                field: 'messages',
                                value: {
                                    messaging_product: 'whatsapp',
                                    metadata: { display_phone_number: '15550234567', phone_number_id: '123456' },
                                    contacts: [{ profile: { name: 'Alex' }, wa_id: '15551234567' }],
                                    messages: [
                                        {
                                            from: '15551234567',
                                            id: 'wamid.HBgLMTU1NTEyMzQ1NjcVAgASGBQzQTkyRDg5',
                                            timestamp: '1692182400',
                                            type: 'text',
                                            text: { body: 'Can you show me the roller coaster photos again?' },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/webhook/whatsapp',
                payload,
            });

            expect(response.statusCode).toBe(200);
            expect(response.body).toBe('EVENT_RECEIVED');

            expect(aiSalesOrchestrator.handleIncomingReply).toHaveBeenCalledWith(
                '15551234567',
                'Can you show me the roller coaster photos again?'
            );
        });

        it('parses incoming interactive button reply selection and triggers AI Negotiator Agent', async () => {
            const payload = {
                object: 'whatsapp_business_account',
                entry: [
                    {
                        changes: [
                            {
                                value: {
                                    messages: [
                                        {
                                            from: '15559876543',
                                            type: 'interactive',
                                            interactive: {
                                                type: 'button_reply',
                                                button_reply: {
                                                    id: 'btn_claim_20_percent',
                                                    title: 'Claim 20% Discount',
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                ],
            };

            const response = await fastify.inject({
                method: 'POST',
                url: '/api/webhook/whatsapp',
                payload,
            });

            expect(response.statusCode).toBe(200);
            expect(response.body).toBe('EVENT_RECEIVED');

            expect(aiSalesOrchestrator.handleIncomingReply).toHaveBeenCalledWith(
                '15559876543',
                'Claim 20% Discount'
            );
        });

        it('returns HTTP 404 when payload is missing the object root property', async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/webhook/whatsapp',
                payload: { invalid: 'structure' },
            });

            expect(response.statusCode).toBe(404);
            expect(response.body).toBe('Not Found');
            expect(aiSalesOrchestrator.handleIncomingReply).not.toHaveBeenCalled();
        });
    });
});
