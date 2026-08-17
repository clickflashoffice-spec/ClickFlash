import { vi, describe, it, test, expect, beforeEach } from 'vitest';
import { AICullingService } from '../services/aiCullingService';
import { logger } from '../utils/logger';

// Mock dependencies
const mockDbManager = {
    run: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    transaction: vi.fn((cb) => cb()),
};

const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
};

// Mock faceService
const mockFaceService = {
    analyzeImage: vi.fn()
};
vi.mock('../services/faceService', () => ({
    faceService: mockFaceService
}));

vi.mock('../utils/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

vi.mock('sharp', () => {
    return vi.fn(() => ({
        resize: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('test-buffer'))
    }));
});

describe('AICullingService', () => {
    let service: AICullingService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new AICullingService(mockDbManager as any, mockLogger as any);
    });

    it('should analyze photo and persist scores correctly', async () => {
        // Arrange
        vi.spyOn(AICullingService, 'evaluateImage').mockResolvedValue({
            blurScore: 0.1,
            faceCount: 1,
            closedEyesCount: 0
        });
        // Mock sharp and fs.existsSync via spy/require in node environment or provide mock imagePath
        const fs = require('fs');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        
        // Act
        await service.analyzePhoto('photo-123', 'path/to/test.jpg');

        // Assert
        expect(mockDbManager.run).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE photos SET ai_score = ?'),
            expect.arrayContaining([expect.any(Number), expect.any(Number), 'photo-123'])
        );
    });

    it('should fallback gracefully and log error if analysis fails', async () => {
        // Arrange
        const fs = require('fs');
        vi.spyOn(fs, 'existsSync').mockReturnValue(true);
        vi.spyOn(AICullingService, 'evaluateImage').mockRejectedValue(new Error('Analysis failed'));

        // Act
        await service.analyzePhoto('photo-fail', 'path/to/fail.jpg');

        // Assert
        expect(logger.error).toHaveBeenCalled();
    });
});
