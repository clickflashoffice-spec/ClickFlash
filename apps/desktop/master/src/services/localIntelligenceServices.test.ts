// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { CoachingReportService } from './coachingReportService';
import { ContentGenerationService } from './contentGenerationService';
import { StudioIntelligenceService } from './studioIntelligenceService';

describe('local intelligence services', () => {
    it('builds escaped gallery copy from supplied metadata', async () => {
        const service = new ContentGenerationService();
        const result = await service.generateGalleryContent({
            eventName: '<Summer & Friends>',
            date: '2026-07-15',
            location: 'Beach <North>',
            tags: ['Sunset', '<script>'],
            highlightImageCount: 12,
        });

        expect(result.blogPostHtml).toContain('&lt;Summer &amp; Friends&gt;');
        expect(result.blogPostHtml).toContain('12 highlighted photos');
        expect(result.blogPostHtml).not.toContain('<script>');
        expect(result.emailSubject).toBe('<Summer & Friends> Resort Moments Are Ready');
    });

    it('generates coaching guidance from measured values only', async () => {
        const service = new CoachingReportService();
        const report = await service.generateWeeklyReport({
            galleryViews: 100,
            ordersPlaced: 8,
            cartAbandonmentRate: 55,
            averageOrderValue: 125,
            totalRevenue: 1000,
            currentTier: 'Pro',
        }, 'photographer-1');

        expect(report.summary).toContain('8.0% conversion');
        expect(report.summary).toContain('€1000.00');
        expect(report.actionItems[1]).toContain('55.0%');
        expect(report.upsellRecommendation).toContain('€125.00');
    });

    it('does not infer an upsell when no orders exist', async () => {
        const service = new CoachingReportService();
        const report = await service.generateWeeklyReport({
            galleryViews: 20,
            ordersPlaced: 0,
            cartAbandonmentRate: 0,
            averageOrderValue: 0,
            totalRevenue: 0,
            currentTier: 'Starter',
        }, 'photographer-2');

        expect(report.upsellRecommendation).toContain('establish a conversion baseline');
    });

    it('parses supported studio intents deterministically', async () => {
        const service = StudioIntelligenceService.getInstance();

        await expect(service.parseIntent('Send a reminder to guest@example.com')).resolves.toEqual({
            action: 'SEND_EMAIL',
            parameters: { email: 'guest@example.com' },
            confidence: 0.95,
        });
        await expect(service.parseIntent('Draft a contract for the wedding')).resolves.toMatchObject({
            action: 'DRAFT_CONTRACT',
        });
        await expect(service.parseIntent('')).resolves.toEqual({
            action: 'UNKNOWN',
            parameters: {},
            confidence: 0,
        });
    });

    it('scores only explicit BANT signals', async () => {
        const service = StudioIntelligenceService.getInstance();
        const result = await service.scoreLead('I am the event manager. We need a photographer next month and have a €2,000 budget.');

        expect(result.score).toBe(100);
        expect(result.bant).toEqual({
            budget: true,
            authority: true,
            need: true,
            timeline: true,
        });
    });

    it('generates three local shoot ideas', async () => {
        const service = StudioIntelligenceService.getInstance();
        const ideas = await service.generateShootIdeas('Beach', 'Sunset', 'Professional');

        expect(ideas).toHaveLength(3);
        expect(ideas.every((idea) => idea.description.includes('Beach') || idea.title.includes('Beach'))).toBe(true);
    });
});
