export interface WeeklyMetrics {
    galleryViews: number;
    ordersPlaced: number;
    cartAbandonmentRate: number;
    averageOrderValue: number;
    totalRevenue: number;
    currentTier: string;
}

export interface CoachingReport {
    summary: string;
    actionItems: string[];
    upsellRecommendation: string;
}

const safeNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const safeText = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.trim()
        ? value.trim().replace(/\s+/g, " ").slice(0, 80)
        : fallback;

/** Produces transparent coaching guidance from measured weekly metrics. */
export class CoachingReportService {
    async generateWeeklyReport(metrics: WeeklyMetrics, photographerId: string): Promise<CoachingReport> {
        const galleryViews = safeNumber(metrics.galleryViews);
        const ordersPlaced = safeNumber(metrics.ordersPlaced);
        const abandonmentRate = Math.min(100, safeNumber(metrics.cartAbandonmentRate));
        const averageOrderValue = safeNumber(metrics.averageOrderValue);
        const totalRevenue = safeNumber(metrics.totalRevenue);
        const currentTier = safeText(metrics.currentTier, "Unspecified");
        const conversionRate = galleryViews > 0 ? (ordersPlaced / galleryViews) * 100 : 0;
        const actionItems: string[] = [];

        if (galleryViews === 0) {
            actionItems.push("Confirm gallery delivery and promotion before evaluating conversion.");
        } else if (ordersPlaced === 0) {
            actionItems.push("Review gallery access, calls to action, and checkout completion because views produced no orders.");
        } else if (conversionRate < 10) {
            actionItems.push("Review the most-viewed galleries for pricing clarity and checkout friction before changing packages.");
        } else {
            actionItems.push("Preserve the current gallery flow and test only one offer or layout change at a time.");
        }

        actionItems.push(
            abandonmentRate > 50
                ? `Investigate checkout friction and permitted follow-up because cart abandonment is ${abandonmentRate.toFixed(1)}%.`
                : `Track cart abandonment against the current ${abandonmentRate.toFixed(1)}% measured baseline.`,
        );

        const report: CoachingReport = {
            summary: `${Math.round(ordersPlaced)} orders from ${Math.round(galleryViews)} gallery views (${conversionRate.toFixed(1)}% conversion) produced €${totalRevenue.toFixed(2)} in revenue. Current tier: ${currentTier}.`,
            actionItems,
            upsellRecommendation: ordersPlaced > 0
                ? `Use the measured €${averageOrderValue.toFixed(2)} average order value as the baseline, then test a clearly differentiated higher-tier package without hiding the existing option.`
                : "Do not infer an upsell opportunity without completed orders; establish a conversion baseline first.",
        };

        void photographerId;
        return report;
    }
}

export default new CoachingReportService();
