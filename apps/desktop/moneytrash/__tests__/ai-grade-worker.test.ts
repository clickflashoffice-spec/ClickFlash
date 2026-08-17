/**
 * MoneyTrash AI Grade Worker & VLM Emotional Bypass - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiGradeWorker, aiGradeWorker, aiGradeRedisPublisher } from '../src/ai-workers/ai-grade-worker';
import { GeminiClient } from '@clickflash/ai';

vi.mock('@clickflash/ai', () => {
    const mockChat = vi.fn();
    return {
        GeminiClient: class {
            chat = mockChat;
        },
    };
});

describe('AiGradeWorker & VLM Emotional Bypass Mechanism', () => {
    let worker: AiGradeWorker;
    let mockGeminiChat: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        worker = new AiGradeWorker();
        mockGeminiChat = (worker as any).client.chat;
        vi.spyOn(aiGradeRedisPublisher, 'publishEvent').mockResolvedValue();
    });

    describe('Mathematical & Technical Quality Assessment', () => {
        it('computes all required technical metrics bounded between 0 and 100', () => {
            const metrics = worker.assessTechnicalQuality('resort_family_pool_001.jpg');

            expect(metrics).toHaveProperty('sharpnessScore');
            expect(metrics).toHaveProperty('contrastScore');
            expect(metrics).toHaveProperty('lightingScore');
            expect(metrics).toHaveProperty('exposureScore');
            expect(metrics).toHaveProperty('blurScore');
            expect(metrics).toHaveProperty('compositionScore');

            expect(metrics.sharpnessScore).toBeGreaterThanOrEqual(0);
            expect(metrics.sharpnessScore).toBeLessThanOrEqual(100);
            expect(metrics.blurScore).toBe(100 - metrics.sharpnessScore);
        });

        it('assigns lower sharpness and higher blur scores for action and splash filenames', () => {
            const actionMetrics = worker.assessTechnicalQuality('action_splash_coaster_99.jpg');
            expect(actionMetrics.sharpnessScore).toBeLessThanOrEqual(50);
            expect(actionMetrics.blurScore).toBeGreaterThanOrEqual(50);
        });

        it('assigns severe blur and low sharpness for defect and floor shots', () => {
            const defectMetrics = worker.assessTechnicalQuality('defect_floor_shot.jpg');
            expect(defectMetrics.sharpnessScore).toBeLessThanOrEqual(25);
            expect(defectMetrics.blurScore).toBeGreaterThanOrEqual(75);
        });
    });

    describe('VLM Multimodal Emotional Assessment', () => {
        it('parses structured emotional metrics from Gemini Vision VLM API response', async () => {
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: JSON.stringify({
                    emotionalScore: 94,
                    smileScore: 92,
                    eyeContactScore: 85,
                    candidBondingScore: 96,
                    triumphMomentScore: 88,
                    emotionalKeywords: ['pure_joy', 'parent_hug', 'magical_moment'],
                    sceneDescription: 'Mother hugging child in front of resort castle.'
                })
            });

            const emotional = await worker.assessVlmEmotionalMetrics('family_castle_hug.jpg');

            expect(mockGeminiChat).toHaveBeenCalled();
            expect(emotional.emotionalScore).toBe(94);
            expect(emotional.smileScore).toBe(92);
            expect(emotional.candidBondingScore).toBe(96);
            expect(emotional.emotionalKeywords).toContain('pure_joy');
            expect(emotional.sceneDescription).toContain('castle');
        });

        it('handles markdown code block wrapped JSON from VLM responses', async () => {
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: '```json\n{\n  "emotionalScore": 90,\n  "smileScore": 85,\n  "eyeContactScore": 70,\n  "candidBondingScore": 80,\n  "triumphMomentScore": 95,\n  "emotionalKeywords": ["rollercoaster_thrill", "hands_up"],\n  "sceneDescription": "Excited guests at the top of the coaster drop."\n}\n```'
            });

            const emotional = await worker.assessVlmEmotionalMetrics('rollercoaster_drop.jpg');

            expect(emotional.emotionalScore).toBe(90);
            expect(emotional.triumphMomentScore).toBe(95);
            expect(emotional.emotionalKeywords).toContain('rollercoaster_thrill');
        });

        it('applies intelligent heuristic fallback when VLM API is unavailable or times out', async () => {
            mockGeminiChat.mockResolvedValueOnce({
                success: false,
                data: null
            });

            const emotional = await worker.assessVlmEmotionalMetrics('rollercoaster_splash.jpg');

            expect(emotional.emotionalScore).toBeGreaterThanOrEqual(80);
            expect(emotional.triumphMomentScore).toBeGreaterThanOrEqual(80);
            expect(emotional.emotionalKeywords).toContain('triumph_thrill');
        });
    });

    describe('Emotional Bypass Engine & Grading Logic', () => {
        it('triggers EMOTIONAL BYPASS when action blur is high but emotional joy is exceptional', async () => {
            // Mock VLM: High emotional joy (95), genuine smiles (94), high triumph (98)
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: JSON.stringify({
                    emotionalScore: 95,
                    smileScore: 94,
                    eyeContactScore: 60,
                    candidBondingScore: 88,
                    triumphMomentScore: 98,
                    emotionalKeywords: ['water_splash', 'jubilant_screams', 'pure_adrenaline'],
                    sceneDescription: 'Family screaming in delight down log flume water splash.'
                })
            });

            // Action filename has natural motion blur (sharpness < 50)
            const result = await worker.gradePhoto('action_splash_flume_007.jpg', 'flume_007', 'gal_waterpark_01');

            expect(result.category).toBe('EMOTIONAL_SAVED_GRADE');
            expect(result.emotionalBypassTriggered).toBe(true);
            expect(result.emotionalBypassReason).toContain('RESCUED FROM TRASH');
            expect(result.monetizationTags).toContain('candid_gem');
            expect(result.monetizationTags).toContain('ride_action_moment');
            expect(aiGradeRedisPublisher.publishEvent).toHaveBeenCalledWith(
                'photo_graded',
                expect.objectContaining({
                    photoId: 'flume_007',
                    category: 'EMOTIONAL_SAVED_GRADE',
                    emotionalBypass: true
                })
            );
        });

        it('assigns HERO_GRADE for crystal sharp photos with top-tier emotional connection', async () => {
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: JSON.stringify({
                    emotionalScore: 96,
                    smileScore: 95,
                    eyeContactScore: 95,
                    candidBondingScore: 90,
                    triumphMomentScore: 70,
                    emotionalKeywords: ['golden_hour', 'perfect_portrait', 'radiant_smile'],
                    sceneDescription: 'Couple smiling at golden hour on private beach.'
                })
            });

            const result = await worker.gradePhoto('hero_portrait_beach_sunset.jpg', 'hero_beach_01');

            expect(result.category).toBe('HERO_GRADE');
            expect(result.emotionalBypassTriggered).toBe(false);
            expect(result.overallScore).toBeGreaterThanOrEqual(85);
            expect(result.monetizationTags).toContain('hero_print_candidate');
        });

        it('assigns DISCARD_GRADE to true defects with low sharpness and zero emotional redeeming value', async () => {
            mockGeminiChat.mockResolvedValueOnce({
                success: true,
                data: JSON.stringify({
                    emotionalScore: 10,
                    smileScore: 0,
                    eyeContactScore: 0,
                    candidBondingScore: 0,
                    triumphMomentScore: 0,
                    emotionalKeywords: ['technical_defect', 'black_frame'],
                    sceneDescription: 'Camera dropped, lens cap covered frame.'
                })
            });

            const result = await worker.gradePhoto('defect_lenscap_black.jpg', 'defect_01');

            expect(result.category).toBe('DISCARD_GRADE');
            expect(result.emotionalBypassTriggered).toBe(false);
            expect(result.gradeReason).toContain('technical defect');
        });
    });

    describe('Batch Processing & Event Streaming', () => {
        it('processes a batch of photos with concurrency limit and returns aggregated summary', async () => {
            // Mock 3 photos in batch
            mockGeminiChat
                .mockResolvedValueOnce({
                    success: true,
                    data: JSON.stringify({
                        emotionalScore: 95,
                        smileScore: 90,
                        eyeContactScore: 80,
                        candidBondingScore: 85,
                        triumphMomentScore: 90,
                        emotionalKeywords: ['hero_moment'],
                        sceneDescription: 'Hero shot'
                    })
                })
                .mockResolvedValueOnce({
                    success: true,
                    data: JSON.stringify({
                        emotionalScore: 92,
                        smileScore: 90,
                        eyeContactScore: 50,
                        candidBondingScore: 85,
                        triumphMomentScore: 95,
                        emotionalKeywords: ['splash_joy'],
                        sceneDescription: 'Action splash'
                    })
                })
                .mockResolvedValueOnce({
                    success: true,
                    data: JSON.stringify({
                        emotionalScore: 5,
                        smileScore: 0,
                        eyeContactScore: 0,
                        candidBondingScore: 0,
                        triumphMomentScore: 0,
                        emotionalKeywords: ['technical_defect'],
                        sceneDescription: 'Blur defect'
                    })
                });

            const batchRequest = {
                photos: [
                    { filePath: 'hero_family_beach.jpg', photoId: 'p1' },
                    { filePath: 'action_splash_coaster.jpg', photoId: 'p2' },
                    { filePath: 'defect_floor_shot.jpg', photoId: 'p3' }
                ],
                concurrencyLimit: 2
            };

            const batchResult = await worker.gradeBatch(batchRequest);

            expect(batchResult.total).toBe(3);
            expect(batchResult.results).toHaveLength(3);
            expect(batchResult.durationMs).toBeGreaterThanOrEqual(0);
            expect(batchResult.heroCount + batchResult.commercialCount + batchResult.emotionalSavedCount + batchResult.discardCount).toBe(3);
            expect(batchResult.emotionalSavedCount).toBeGreaterThanOrEqual(1);
            expect(batchResult.discardCount).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Default Export', () => {
        it('exports default aiGradeWorker instance', () => {
            expect(aiGradeWorker).toBeInstanceOf(AiGradeWorker);
        });
    });
});
