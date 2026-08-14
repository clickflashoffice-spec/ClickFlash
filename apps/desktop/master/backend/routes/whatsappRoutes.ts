import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { aiSalesOrchestrator } from '../services/aiSalesOrchestrator';

export async function whatsappRoutes(fastify: FastifyInstance) {
    const handleVerify = async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as any;
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'clickflash_whatsapp_verify';

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('[WhatsApp Webhook] Verification challenge passed.');
                return reply.status(200).send(challenge);
            } else {
                console.warn('[WhatsApp Webhook] Verification token mismatch.');
                return reply.status(403).send('Forbidden');
            }
        }
        return reply.status(400).send('Missing hub parameters');
    };

    const handlePayload = async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as any;

        if (body && body.object) {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const message = change?.value?.messages?.[0];

            if (message) {
                const from = message.from; // sender's phone number
                let msgBody = '';

                if (message.type === 'text' && message.text?.body) {
                    msgBody = message.text.body;
                } else if (message.type === 'interactive') {
                    // Handle button reply or list reply
                    msgBody = message.interactive?.button_reply?.title || message.interactive?.button_reply?.id || message.interactive?.list_reply?.title || '';
                }

                if (from && msgBody) {
                    console.log(`[WhatsApp Webhook] Inbound from ${from}: "${msgBody}"`);
                    aiSalesOrchestrator.handleIncomingReply(from, msgBody).catch(err => {
                        console.error('[WhatsApp Webhook] Error in aiSalesOrchestrator:', err);
                    });
                }
            }
            return reply.status(200).send('EVENT_RECEIVED');
        } else {
            return reply.status(404).send('Not Found');
        }
    };

    // Register primary, API-prefixed, and reverse-order routes
    fastify.get('/webhook/whatsapp', handleVerify);
    fastify.get('/api/webhook/whatsapp', handleVerify);
    fastify.get('/api/webhooks/whatsapp', handleVerify);
    fastify.get('/whatsapp/webhook', handleVerify);
    fastify.get('/api/whatsapp/webhook', handleVerify);

    fastify.post('/webhook/whatsapp', handlePayload);
    fastify.post('/api/webhook/whatsapp', handlePayload);
    fastify.post('/api/webhooks/whatsapp', handlePayload);
    fastify.post('/whatsapp/webhook', handlePayload);
    fastify.post('/api/whatsapp/webhook', handlePayload);
}
