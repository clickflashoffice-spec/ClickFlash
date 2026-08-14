import { aiSalesOrchestrator } from './apps/desktop/master/backend/services/aiSalesOrchestrator';
import { whatsappService } from './apps/desktop/master/backend/services/whatsappService';
async function run() {
    console.log('Testing WhatsApp Webhook / Orchestrator integration locally...');
    // mock whatsappService so it doesn't try to use real axios calls
    whatsappService.sendTextMessage = async (to, msg) => {
        console.log('[MOCK WHATSAPP SEND]', to, msg);
        return true;
    };
    whatsappService.sendInteractiveButtonMessage = async (to, msg, btns) => {
        console.log('[MOCK WHATSAPP INTERACTIVE]', to, msg, btns);
        return true;
    };
    const fromNumber = '+1234567890';
    const message = 'Hello, how can I see my photos?';
    console.log('User message:', message);
    await aiSalesOrchestrator.handleIncomingReply(fromNumber, message);
    console.log('Finished handling.');
}
run().catch(console.error);
