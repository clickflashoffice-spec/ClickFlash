import { aiSalesOrchestrator } from './aiSalesOrchestrator';

// Mock DB import for demonstration
const mockDb = {
    getUnsoldPhotosOlderThan: async (hours: number) => {
        return [
            {
                id: 'PHOTO-891',
                customerEmail: 'david.r@example.com',
                customerName: 'David',
                customerPhone: '+15552345678',
                whatsappOptIn: true,
                resortName: 'Marhaba Club',
                topActivity: 'Water Slides',
                uploadedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
                totalOpened: 4,
                totalConverted: 0
            }
        ];
    },
    markPhotoAsAnalyzed: async (id: string) => {
        console.log(`[UnsoldAnalyzer] Photo ${id} marked as analyzed.`);
    }
};

export class UnsoldPhotosAnalyzer {
    
    /**
     * Runs periodically (e.g. daily cron job) to analyze unsold photos.
     */
    async analyzeUnsoldInventory() {
        console.log('[UnsoldAnalyzer] Starting batch analysis of unsold photos > 24 hours...');
        
        // Fetch photos uploaded > 24 hours ago that haven't been purchased
        const unsoldRecords = await mockDb.getUnsoldPhotosOlderThan(24);
        
        if (unsoldRecords.length === 0) {
            console.log('[UnsoldAnalyzer] No unsold photos found to analyze.');
            return;
        }

        console.log(`[UnsoldAnalyzer] Found ${unsoldRecords.length} records to analyze.`);

        // We can pass these records directly to the AI Sales Orchestrator to "hunt" for leads
        // The Sales Orchestrator will use the Analyst Agent to evaluate if they are a hot lead
        // and if so, the Closer Agent will send a WhatsApp discount.
        
        await aiSalesOrchestrator.huntForLeads(unsoldRecords);

        // Mark them as analyzed so we don't hit them repeatedly
        for (const record of unsoldRecords) {
            await mockDb.markPhotoAsAnalyzed(record.id);
        }

        console.log('[UnsoldAnalyzer] Batch analysis complete.');
    }
}

export const unsoldPhotosAnalyzer = new UnsoldPhotosAnalyzer();
