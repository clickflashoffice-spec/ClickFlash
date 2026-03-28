/**
 * Analytics Export Service
 * 
 * Handles generation of CSV reports from analytics data
 */

import { AnalyticsSummary, PhotographerStat } from './analyticsService';

export const analyticsExportService = {
    /**
     * Export revenue summary to CSV
     */
    exportSummaryToCSV(summary: AnalyticsSummary, days: number): void {
        const rows = [
            ['Report Description', `Analytics Summary - Last ${days} Days`],
            ['Total Revenue', summary.revenue.toString()],
            ['Total Orders', summary.orders.toString()],
            ['Avg Order Value', (summary.revenue / (summary.orders || 1)).toFixed(2).toString()],
            [],
            ['Product Name', 'Revenue Contribution']
        ];

        summary.productBreakdown.forEach(p => {
            rows.push([p.productName, p.revenue.toString()]);
        });

        this._downloadCSV(rows, `analytics_summary_${new Date().toISOString().split('T')[0]}.csv`);
    },

    /**
     * Export photographer performance to CSV
     */
    exportPerformanceToCSV(photographers: PhotographerStat[], days: number): void {
        const rows = [
            ['Photographer Name', 'Orders', 'Total Revenue', 'Avg Order Value']
        ];

        photographers.forEach(p => {
            rows.push([p.name, p.orderCount.toString(), p.revenue.toString(), p.avgOrderValue.toString()]);
        });

        this._downloadCSV(rows, `photographer_performance_${new Date().toISOString().split('T')[0]}.csv`);
    },

    /**
     * Trigger browser print for PDF export
     */
    triggerPDFExport(): void {
        window.print();
    },

    /**
     * Internal helper to trigger download
     */
    _downloadCSV(rows: string[][], filename: string): void {
        const csvContent = "data:text/csv;charset=utf-8,"
            + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
