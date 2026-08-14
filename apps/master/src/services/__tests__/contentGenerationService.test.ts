import { ContentGenerationService } from '../contentGenerationService';

describe('ContentGenerationService', () => {
    let service: ContentGenerationService;

    beforeEach(() => {
        service = new ContentGenerationService();
    });

    it('generates compliant deterministic copy with full quality gates when offline', async () => {
        const metadata = {
            eventName: 'Family Sunset Session',
            location: 'Paradise Cove Beach Club',
            date: '2026-08-14',
            tags: ['sunset', 'family', 'beach'],
            highlightImageCount: 8,
            guestName: 'The Miller Family',
        };

        const result = await service.generateGalleryContent(metadata);

        expect(result).toBeDefined();
        expect(result.isAIGenerated).toBe(false);
        expect(result.emailSubject).toContain('Family Sunset Session');
        expect(result.emailBodyText).toContain('Paradise Cove Beach Club');
        expect(result.emailBodyText).toContain('The Miller Family');
        expect(result.smsText).toContain('Paradise Cove Beach Club');
        expect(result.kioskHeadline).toBe('Your Resort Moments Are Ready');
        expect(result.qualityGate.passed).toBe(true);
        expect(result.qualityGate.brandSafetyScore).toBeGreaterThanOrEqual(0.85);
        expect(result.qualityGate.hallucinationRisk).toBe('LOW');
        expect(result.qualityGate.routing).toBe('AUTO_PUBLISH');
    });

    it('handles edge case metadata safely with sanitization', async () => {
        const metadata = {
            eventName: '   Special Event <script>alert(1)</script>   ',
            location: 'Grand Plaza Resort',
            date: '2026-08-14',
            tags: ['resort', 'evening'],
            highlightImageCount: 0,
        };

        const result = await service.generateGalleryContent(metadata);

        expect(result.blogPostHtml).not.toContain('<script>');
        expect(result.emailSubject).toBeDefined();
        expect(result.qualityGate.passed).toBe(true);
    });
});
