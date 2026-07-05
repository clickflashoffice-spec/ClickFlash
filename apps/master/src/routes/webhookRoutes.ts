import { Router, Request, Response } from 'express';
import logger from '../utils/logger';
import geminiAgentService from '../services/geminiAgentService';

const router = Router();

/**
 * Omnichannel Agent Ingestion Webhooks
 * Parses incoming messages from WhatsApp/Email and routes them to the Fotiqo Agent
 */

router.post('/whatsapp', async (req: Request, res: Response) => {
    try {
        const { message, from } = req.body;
        logger.info(`Received WhatsApp message from ${from}: ${message}`);
        
        // Pass plain language instruction to the orchestration agent
        const intent = await geminiAgentService.parseIntent(message);
        
        logger.info(`Parsed WhatsApp intent: ${JSON.stringify(intent)}`);
        res.status(200).json({ success: true, intent });
    } catch (error) {
        logger.error(`Error processing WhatsApp webhook: ${error instanceof Error ? error.message : 'Unknown'}`);
        res.status(500).json({ success: false, error: 'Failed to process WhatsApp payload' });
    }
});

router.post('/email', async (req: Request, res: Response) => {
    try {
        // e.g. SendGrid Inbound Parse payload
        const { text, from, subject } = req.body;
        logger.info(`Received Email from ${from} [${subject}]`);
        
        const intent = await geminiAgentService.parseIntent(text || subject || '');
        
        // If it looks like an inquiry, trigger AI Lead Scoring
        if (intent.action === 'CREATE_ORDER' || intent.action === 'DRAFT_CONTRACT') {
            const leadScore = await geminiAgentService.calculateLeadScore(text);
            logger.info(`Lead Score generated: ${leadScore}`);
        }
        
        res.status(200).json({ success: true, intent });
    } catch (error) {
        logger.error(`Error processing Email webhook: ${error instanceof Error ? error.message : 'Unknown'}`);
        res.status(500).json({ success: false, error: 'Failed to process Email payload' });
    }
});

export default router;
