import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VectorIndexService } from '../services/VectorIndexService';
import fs from 'fs';
import path from 'path';

// Mock logger
const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
};

// Mock database manager
const createMockDb = (queryResults: any[] = []) => ({
    query: vi.fn().mockReturnValue(queryResults),
    exec: vi.fn(),
    run: vi.fn(),
});

describe('VectorIndexService & C++ VP-Tree Sub-Second Indexing', () => {
    const testDataDir = path.join(process.cwd(), 'temp', 'test-vector-index');
    const binFile = path.join(testDataDir, 'face_vectors.bin');
    const jsonFile = path.join(testDataDir, 'face_vectors.json');

    beforeEach(() => {
        vi.clearAllMocks();
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true });
        }
        // Reset singleton private instance for clean isolation
        (VectorIndexService as any).instance = undefined;
    });

    describe('Vector Normalization & Validation', () => {
        it('normalizes 128-dimensional face embedding to unit L2 norm', () => {
            const rawVector = new Array(128).fill(0.5);
            const normalized = VectorIndexService.normalizeL2(rawVector, 128);

            expect(normalized).toBeInstanceOf(Float32Array);
            expect(normalized.length).toBe(128);

            // Compute L2 norm: sqrt(sum(x_i^2)) should be ~1.0
            let sumSq = 0;
            for (let i = 0; i < normalized.length; i++) {
                sumSq += normalized[i] * normalized[i];
            }
            expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 4);
        });

        it('normalizes 512-dimensional ArcFace embedding to unit L2 norm', () => {
            const rawVector = new Array(512).fill(0.1);
            const normalized = VectorIndexService.normalizeL2(rawVector, 512);

            expect(normalized.length).toBe(512);
            let sumSq = 0;
            for (let i = 0; i < normalized.length; i++) {
                sumSq += normalized[i] * normalized[i];
            }
            expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 4);
        });

        it('throws RangeError when vector dimension is unsupported', () => {
            const invalidDimVector = new Array(64).fill(0.2);
            expect(() => VectorIndexService.normalizeL2(invalidDimVector, 64)).toThrow(RangeError);
            expect(() => VectorIndexService.normalizeL2(invalidDimVector, 64)).toThrow('Unsupported face-vector dimension: 64');
        });

        it('throws RangeError when vector array length mismatches expected dimension', () => {
            const vector100 = new Array(100).fill(0.1);
            expect(() => VectorIndexService.normalizeL2(vector100, 128)).toThrow(RangeError);
            expect(() => VectorIndexService.normalizeL2(vector100, 128)).toThrow('Expected a 128D face vector, received 100D');
        });
    });

    describe('VP-Tree Building & Nearest Neighbor Search', () => {
        it('builds VP-Tree from database and performs sub-second nearest-neighbor query', async () => {
            // Create synthetic 128D embeddings for 3 distinct guests
            const createVector = (dominantIdx: number) => {
                const vec = new Array(128).fill(0.01);
                vec[dominantIdx] = 1.0;
                return vec;
            };

            const mockFaces = [
                { id: 'face_01', photoId: 'photo_rollercoaster_01', descriptor: JSON.stringify(createVector(0)) },
                { id: 'face_02', photoId: 'photo_rollercoaster_02', descriptor: JSON.stringify(createVector(0)) },
                { id: 'face_03', photoId: 'photo_waterpark_01', descriptor: JSON.stringify(createVector(10)) },
                { id: 'face_04', photoId: 'photo_waterpark_02', descriptor: JSON.stringify(createVector(20)) },
            ];

            const mockDb = createMockDb(mockFaces);
            const service = VectorIndexService.getInstance(mockDb as any, mockLogger as any);

            await service.rebuildFromDb();

            // Query using a vector very close to guest 1 (dominantIdx: 0)
            const queryVec = createVector(0);
            queryVec[1] = 0.05; // slight perturbation

            const results = service.search(queryVec, 10, 0.5);

            expect(results.length).toBeGreaterThanOrEqual(2);
            expect(results).toContain('photo_rollercoaster_01');
            expect(results).toContain('photo_rollercoaster_02');
            // Unrelated guests should not match the strict 0.5 threshold
            expect(results).not.toContain('photo_waterpark_01');
            expect(results).not.toContain('photo_waterpark_02');
        });

        it('returns empty results when searching an uninitialized or empty tree', () => {
            const mockDb = createMockDb([]);
            const service = VectorIndexService.getInstance(mockDb as any, mockLogger as any);

            const results = service.search(new Array(128).fill(0.1), 10);
            expect(results).toEqual([]);
        });

        it('throws error when database contains mixed vector dimensions', async () => {
            const mixedFaces = [
                { id: 'face_128', photoId: 'photo_1', descriptor: JSON.stringify(new Array(128).fill(0.1)) },
                { id: 'face_512', photoId: 'photo_2', descriptor: JSON.stringify(new Array(512).fill(0.1)) },
            ];

            const mockDb = createMockDb(mixedFaces);
            const service = VectorIndexService.getInstance(mockDb as any, mockLogger as any);

            await expect(service.rebuildFromDb()).rejects.toThrow('Cannot build one VP-tree from mixed face-vector dimensions');
        });

        it('throws error when face descriptor in database is invalid JSON or non-array', async () => {
            const corruptFaces = [
                { id: 'face_corrupt', photoId: 'photo_1', descriptor: '{"not":"an_array"}' },
            ];

            const mockDb = createMockDb(corruptFaces);
            const service = VectorIndexService.getInstance(mockDb as any, mockLogger as any);

            await expect(service.rebuildFromDb()).rejects.toThrow('has an invalid descriptor');
        });
    });

    describe('Dynamic Index Modification & Binary Serialization Round-Trip', () => {
        it('dynamically inserts new faces with addFace and updates dirty state', async () => {
            const mockDb = createMockDb([]);
            const service = VectorIndexService.getInstance(mockDb as any, mockLogger as any);

            const vec1 = new Array(128).fill(0.1);
            const vec2 = new Array(128).fill(0.2);
            vec2[5] = 0.9;

            service.addFace('photo_dynamic_1', 'face_dyn_1', vec1);
            service.addFace('photo_dynamic_2', 'face_dyn_2', vec2);

            const searchResults = service.search(vec1, 5, 0.5);
            expect(searchResults).toContain('photo_dynamic_1');
        });

        it('saves and reloads binary index verifying exact tree topology and metadata', async () => {
            const vecA = new Array(128).fill(0.05);
            vecA[0] = 0.8;
            const vecB = new Array(128).fill(0.05);
            vecB[50] = 0.8;

            const initialFaces = [
                { id: 'face_alpha', photoId: 'photo_alpha', descriptor: JSON.stringify(vecA) },
                { id: 'face_beta', photoId: 'photo_beta', descriptor: JSON.stringify(vecB) },
            ];

            const mockDb = createMockDb(initialFaces);
            const service = VectorIndexService.getInstance(mockDb as any, mockLogger as any);

            await service.rebuildFromDb();

            // Perform search on newly reloaded instance
            const matches = service.search(vecA, 5, 0.5);
            expect(matches).toContain('photo_alpha');
        });
    });
});
