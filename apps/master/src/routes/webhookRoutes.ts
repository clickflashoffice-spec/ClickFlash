import { Router, Request, Response } from 'express';
import { logger } from "../utils/logger";
import { studioIntelligenceService } from "../services/studioIntelligenceService";

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
        const intent = await studioIntelligenceService.parseIntent(message);
        
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
        
        const sourceText = text || subject || '';
        const intent = await studioIntelligenceService.parseIntent(sourceText);
        
        // Contract and explicit qualification requests include a transparent BANT score.
        if (intent.action === 'DRAFT_CONTRACT' || intent.action === 'LEAD_SCORE') {
            const leadScore = await studioIntelligenceService.scoreLead(sourceText);
            logger.info(`Lead Score generated: ${JSON.stringify(leadScore)}`);
            res.status(200).json({ success: true, intent, leadScore });
            return;
        }
        
        res.status(200).json({ success: true, intent });
    } catch (error) {
        logger.error(`Error processing Email webhook: ${error instanceof Error ? error.message : 'Unknown'}`);
        res.status(500).json({ success: false, error: 'Failed to process Email payload' });
    }
});

export default router;
