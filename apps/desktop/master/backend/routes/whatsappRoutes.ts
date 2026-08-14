import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { aiSalesOrchestrator } from '../services/aiSalesOrchestrator';

export async function whatsappRoutes(fastify: FastifyInstance) {
    
    // Webhook verification endpoint (GET) required by Meta
    fastify.get('/webhook/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
        const query = request.query as any;
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'clickflash_whatsapp_verify';

        if (mode && token) {
            if (mode === 'subscribe' && token === verifyToken) {
                console.log('WhatsApp Webhook verified successfully!');
                return reply.status(200).send(challenge);
            } else {
                return reply.status(403).send();
            }
        }
        return reply.status(400).send();
    });

    // Webhook payload endpoint (POST)
    fastify.post('/webhook/whatsapp', async (request: FastifyRequest, reply: FastifyReply) => {
        const body = request.body as any;

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const from = body.entry[0].changes[0].value.messages[0].from; // sender's phone number
                const msgBody = body.entry[0].changes[0].value.messages[0].text.body;

                console.log(`Received WhatsApp message from ${from}: ${msgBody}`);

                // Send to orchestrator
                aiSalesOrchestrator.handleIncomingReply(from, msgBody).catch(err => {
                    console.error('Error handling incoming WhatsApp reply:', err);
                });
            }
            return reply.status(200).send('EVENT_RECEIVED');
        } else {
            return reply.status(404).send();
        }
    });
}
