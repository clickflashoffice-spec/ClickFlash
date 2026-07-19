import { AICullingService } from '../services/aiCullingService';
import { logger } from '../utils/logger';

// Mock dependencies
const mockDbManager = {
    run: jest.fn(),
    get: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn((cb) => cb()),
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

// Mock faceService
const mockFaceService = {
    analyzeImage: jest.fn()
};
jest.mock('../services/faceService', () => ({
    faceService: mockFaceService
}));

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

jest.mock('sharp', () => {
    return jest.fn(() => ({
        resize: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-buffer'))
    }));
});

describe('AICullingService', () => {
    let service: AICullingService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new AICullingService(mockDbManager as any, mockLogger as any);
    });

    it('should analyze photo and persist scores correctly', async () => {
        // Arrange
        jest.spyOn(AICullingService, 'evaluateImage').mockResolvedValue({
            blurScore: 0.1,
            faceCount: 1,
            closedEyesCount: 0
        });
        // Mock sharp and fs.existsSync via spy/require in node environment or provide mock imagePath
        const fs = require('fs');
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        
        // Act
        await service.analyzePhoto('photo-123', 'path/to/test.jpg');

        // Assert
        expect(mockDbManager.run).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE photos SET ai_score = ?, is_rejected = ? WHERE id = ?'),
            expect.arrayContaining([expect.any(Number), expect.any(Number), 'photo-123'])
        );
    });

    it('should fallback gracefully and log error if analysis fails', async () => {
        // Arrange
        const fs = require('fs');
        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(AICullingService, 'evaluateImage').mockRejectedValue(new Error('Analysis failed'));

        // Act
        await service.analyzePhoto('photo-fail', 'path/to/fail.jpg');

        // Assert
        expect(logger.error).toHaveBeenCalled();
    });
});
