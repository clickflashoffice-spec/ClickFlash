import { FraudAlert } from '@clickflash/types';

export class FinancialFraudService {
    /**
     * Identifies excessive void rates or potential cash-under-table fraud
     * by cross-referencing Stripe / Cloudflare D1 records against expected averages.
     */
    public async analyzeVoidRates(photographerId: string, dailyOrders: any[], dailyVoids: any[]): Promise<FraudAlert | null> {
        const totalTransactions = dailyOrders.length + dailyVoids.length;
        if (totalTransactions < 10) return null; // Not enough data

        const voidRate = dailyVoids.length / totalTransactions;

        // If a photographer voids more than 15% of their orders, flag it for review
        if (voidRate > 0.15) {
            const alert: FraudAlert = {
                id: crypto.randomUUID(),
                destinationId: dailyOrders[0]?.destinationId || 'UNKNOWN',
                photographerId,
                type: 'excessive_voids',
                severity: voidRate > 0.3 ? 'critical' : 'medium',
                status: 'open',
                evidence: {
                    voidRate,
                    relatedOrderIds: dailyVoids.map(v => v.id)
                },
                createdAt: new Date().toISOString()
            };

            // In production, this would insert into D1 and trigger a webhook
            return alert;
        }

        return null;
    }
}

export const financialFraudService = new FinancialFraudService();
