/**
 * MoneyTrash AI Media Workers & Unsold Recovery - Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { unsoldBatchWorker, redisPublisher, AiInferenceClient } from '../src/ai-workers/unsold-batch-worker';
import { reelsWorker } from '../src/ai-workers/reels-worker';
import { enhancementWorker } from '../src/ai-workers/enhancement-worker';
import { meshWorker } from '../src/ai-workers/mesh-worker';
import * as fs from 'fs';
import * as path from 'path';

describe('Zero-Labor AI Culling, Media Workers & Unsold Recovery Pipeline', () => {
    describe('AiInferenceClient Quality & Emotion Heuristics', () => {
        let client: AiInferenceClient;

        beforeEach(() => {
            client = new AiInferenceClient();
        });

        it('computes fallback sharpness score based on file characteristics when remote service is offline', async () => {
            const tempFile = path.join(process.cwd(), 'temp', 'temp-sharpness.jpg');
            fs.mkdirSync(path.dirname(tempFile), { recursive: true });
            fs.writeFileSync(tempFile, 'abc123def456');

            const quality = await client.assessQuality(tempFile);

            expect(quality).toHaveProperty('sharpnessScore');
            expect(quality.sharpnessScore).toBeGreaterThanOrEqual(30);
            expect(quality.sharpnessScore).toBeLessThanOrEqual(100);

            fs.rmSync(tempFile, { force: true });
        });

        it('computes fallback emotional and smile score when remote face detector is offline', async () => {
            const faces = await client.detectFaces('photo_rollercoaster_smile.jpg');

            expect(faces).toHaveProperty('emotionalScore');
            expect(faces).toHaveProperty('smileScore');
            expect(faces.smileScore).toBeGreaterThanOrEqual(10);
            expect(faces.smileScore).toBeLessThanOrEqual(100);
            expect(faces.emotionalScore).toBeGreaterThanOrEqual(25);
        });
    });

    describe('UnsoldBatchWorker Triage & Zero-Labor Recovery', () => {
        const tempDir = path.join(process.cwd(), 'temp', 'test-unsold-batch');
        const galleryId = 'gal_resort_001';
        const galleryDir = path.join(tempDir, galleryId);

        beforeEach(() => {
            vi.clearAllMocks();
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            fs.mkdirSync(galleryDir, { recursive: true });
            vi.spyOn(redisPublisher, 'publishEvent').mockResolvedValue();
        });

        afterEach(() => {
            vi.restoreAllMocks();
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        });

        it('evaluates salvageability score combining quality and facial emotion', async () => {
            vi.spyOn(unsoldBatchWorker.aiClient, 'assessQuality').mockResolvedValueOnce({ sharpnessScore: 82 });
            vi.spyOn(unsoldBatchWorker.aiClient, 'detectFaces').mockResolvedValueOnce({ emotionalScore: 88, smileScore: 91 });

            const scores = await unsoldBatchWorker.evaluateSalvageability('sample_photo.jpg');

            expect(scores.sharpnessScore).toBe(82);
            expect(scores.emotionalScore).toBe(88);
            expect(scores.smileScore).toBe(91);
        });

        it('triages high-emotion photos as salvage_for_upsell, publishes sales trigger, and creates recovery campaign', async () => {
            const oldTime = new Date(Date.now() - 35 * 24 * 3600 * 1000); // 35 days old
            const photoFile = path.join(galleryDir, 'DSC_EMOTION.jpg');
            fs.writeFileSync(photoFile, 'photo-content-emotion');
            fs.utimesSync(photoFile, oldTime, oldTime);

            // Mock high emotional score (>= 65)
            vi.spyOn(unsoldBatchWorker.aiClient, 'assessQuality').mockResolvedValueOnce({ sharpnessScore: 50 });
            vi.spyOn(unsoldBatchWorker.aiClient, 'detectFaces').mockResolvedValueOnce({ emotionalScore: 78, smileScore: 85 });

            const result = await unsoldBatchWorker.analyzeAndProcessUnsoldBatch({
                galleryIds: [galleryId],
                retentionDays: 30,
                sourceDir: tempDir,
                enableAutoCampaign: true,
                guestContactMap: {
                    [galleryId]: { phone: '+14155558888', email: 'guest@clickflash.com' },
                },
            });

            expect(result.totalScanned).toBe(1);
            expect(result.salvagedCount).toBe(1);
            expect(result.archivedCount).toBe(0);
            expect(result.purgedCount).toBe(0);

            const item = result.items[0];
            expect(item.recommendation).toBe('salvage_for_upsell');
            expect(item.aiSalvageScore).toBe(78);

            // Redis sales trigger published
            expect(redisPublisher.publishEvent).toHaveBeenCalledWith(
                'sales_triggers',
                expect.objectContaining({
                    galleryId,
                    aiSalvageScore: 78,
                    proposedDiscountPercentage: 50,
                })
            );

            // Recovery campaign created
            expect(result.campaign).toBeDefined();
            expect(result.campaign?.discountPercentage).toBe(50);
            expect(result.campaign?.guestPhone).toBe('+14155558888');
            expect(result.campaign?.magicLinkUrl).toContain('/salvage/gal_resort_001');
        });

        it('triages medium-quality photos as archive_cold_storage and uploads to Cloudflare R2 / S3', async () => {
            const oldTime = new Date(Date.now() - 45 * 24 * 3600 * 1000);
            const photoFile = path.join(galleryDir, 'DSC_ARCHIVE.jpg');
            fs.writeFileSync(photoFile, 'photo-content-sharp');
            fs.utimesSync(photoFile, oldTime, oldTime);

            // Mock low emotion (< 65) but high sharpness (>= 45)
            vi.spyOn(unsoldBatchWorker.aiClient, 'assessQuality').mockResolvedValueOnce({ sharpnessScore: 60 });
            vi.spyOn(unsoldBatchWorker.aiClient, 'detectFaces').mockResolvedValueOnce({ emotionalScore: 40, smileScore: 35 });

            // Mock S3 client send
            const s3SendSpy = vi.spyOn((unsoldBatchWorker as any).s3Client, 'send').mockResolvedValueOnce({});

            const result = await unsoldBatchWorker.analyzeAndProcessUnsoldBatch({
                galleryIds: [galleryId],
                retentionDays: 30,
                sourceDir: tempDir,
            });

            expect(result.totalScanned).toBe(1);
            expect(result.salvagedCount).toBe(0);
            expect(result.archivedCount).toBe(1);
            expect(result.purgedCount).toBe(0);

            expect(result.items[0].recommendation).toBe('archive_cold_storage');
            expect(s3SendSpy).toHaveBeenCalledTimes(1);

            // File should be unlinked from local disk
            expect(fs.existsSync(photoFile)).toBe(false);
        });

        it('triages blurry/defective photos as purge, deletes local file, and publishes media_discards event', async () => {
            const oldTime = new Date(Date.now() - 40 * 24 * 3600 * 1000);
            const photoFile = path.join(galleryDir, 'DSC_BLURRY.jpg');
            fs.writeFileSync(photoFile, 'photo-content-blurry');
            fs.utimesSync(photoFile, oldTime, oldTime);

            // Mock low emotion (< 65) and low sharpness (< 45)
            vi.spyOn(unsoldBatchWorker.aiClient, 'assessQuality').mockResolvedValueOnce({ sharpnessScore: 25 });
            vi.spyOn(unsoldBatchWorker.aiClient, 'detectFaces').mockResolvedValueOnce({ emotionalScore: 20, smileScore: 15 });

            const result = await unsoldBatchWorker.analyzeAndProcessUnsoldBatch({
                galleryIds: [galleryId],
                retentionDays: 30,
                sourceDir: tempDir,
            });

            expect(result.totalScanned).toBe(1);
            expect(result.salvagedCount).toBe(0);
            expect(result.archivedCount).toBe(0);
            expect(result.purgedCount).toBe(1);

            expect(result.items[0].recommendation).toBe('purge');
            expect(fs.existsSync(photoFile)).toBe(false);

            // Media discard event published
            expect(redisPublisher.publishEvent).toHaveBeenCalledWith(
                'media_discards',
                expect.objectContaining({
                    discardReason: 'low_quality',
                    purgedFromStorage: true,
                })
            );
        });

        it('executes legacy processUnsoldBatch wrapper correctly', async () => {
            vi.spyOn(unsoldBatchWorker, 'analyzeAndProcessUnsoldBatch').mockResolvedValueOnce({
                totalScanned: 5,
                salvagedCount: 2,
                archivedCount: 2,
                purgedCount: 1,
                items: [],
            });

            const result = await unsoldBatchWorker.processUnsoldBatch({
                galleryIds: ['gal_legacy'],
                sourceDir: tempDir,
            });

            expect(result.processedCount).toBe(5);
            expect(result.status).toBe('completed');
        });
    });

    describe('ReelsWorker & High-Speed Burst Video Pipeline', () => {
        it('builds valid FFmpeg zoompan filtergraph for 9:16 vertical reels', () => {
            const filterGraph = reelsWorker.buildFilterGraph('9:16_vertical', 5, 3.0);
            expect(filterGraph).toContain('zoompan');
            expect(filterGraph).toContain('1080x1920');
            expect(filterGraph).toContain('fps=30');
        });

        it('builds valid FFmpeg zoompan filtergraph for 16:9 landscape reels', () => {
            const filterGraph = reelsWorker.buildFilterGraph('16:9_landscape', 4, 2.5);
            expect(filterGraph).toContain('1920x1080');
        });

        it('generates completed ReelJob with video and thumbnail URLs', async () => {
            const job = await reelsWorker.generateReel({
                galleryId: 'gal_reels_99',
                photoIds: ['photo_1', 'photo_2', 'photo_3'],
                format: '9:16_vertical',
                musicGenre: 'trending',
                durationSeconds: 15,
            });

            expect(job.status).toBe('completed');
            expect(job.format).toBe('9:16_vertical');
            expect(job.durationSeconds).toBe(15);
            expect(job.videoUrl).toContain('gal_reels_99');
            expect(job.videoUrl).toContain('.mp4');
            expect(job.thumbnailUrl).toContain('.jpg');
        });
    });

    describe('EnhancementWorker Profiles & LUT Processing', () => {
        it('computes distinct enhancement profiles for all preset levels', () => {
            const autoCorrect = enhancementWorker.computeEnhancementProfile('auto-correct');
            expect(autoCorrect.saturationBoost).toBe(1.15);
            expect(autoCorrect.skinSmoothingRadius).toBe(0);

            const proRetouch = enhancementWorker.computeEnhancementProfile('pro-retouch');
            expect(proRetouch.skinSmoothingRadius).toBe(4.5);
            expect(proRetouch.lutApplied).toBe('cinematic_warm_skin_v2');

            const magicShot = enhancementWorker.computeEnhancementProfile('magic-shot', ['fairy_wings', 'sparkles']);
            expect(magicShot.arOverlaysApplied).toContain('fairy_wings');
            expect(magicShot.lutApplied).toBe('disney_magic_glow');

            const hdr = enhancementWorker.computeEnhancementProfile('cinematic-hdr');
            expect(hdr.contrastMultiplier).toBe(1.30);
            expect(hdr.lutApplied).toBe('golden_hour_resort_hdr');
        });

        it('executes AI enhancement and returns EnhanceJob with metadata', async () => {
            const result = await enhancementWorker.processImage({
                photoId: 'photo_sunset_42',
                originalUrl: 'https://cdn.clickflash.com/photos/sunset.jpg',
                level: 'cinematic-hdr',
            });

            expect(result.status).toBe('completed');
            expect(result.photoId).toBe('photo_sunset_42');
            expect(result.level).toBe('cinematic-hdr');
            expect(result.enhancedUrl).toContain('cinematic-hdr');
            expect(result.metadata).toHaveProperty('lutApplied');
        });
    });

    describe('MeshWorker 3D Reconstruction', () => {
        it('estimates 3D reconstruction complexity and polygon metrics', () => {
            const realistic = meshWorker.estimateMetrics('realistic', 6);
            expect(realistic.polygonCount).toBe(75_000);
            expect(realistic.textureResolution).toBe('4096x4096_PBR');
            expect(realistic.hasRigging).toBe(true);

            const lowPoly = meshWorker.estimateMetrics('low-poly', 4);
            expect(lowPoly.polygonCount).toBe(8_500);
            expect(lowPoly.hasRigging).toBe(false);
        });

        it('generates 3D mesh model job with correct format and metadata', async () => {
            const job = await meshWorker.generate3DMesh({
                photoIds: ['photo_front', 'photo_side', 'photo_back'],
                style: 'realistic',
                format: 'glb',
            });

            expect(job.status).toBe('completed');
            expect(job.format).toBe('glb');
            expect(job.style).toBe('realistic');
            expect(job.polygonCount).toBe(75_000);
            expect(job.modelUrl).toContain('.glb');
        });
    });
});
