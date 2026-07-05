import { AICullingService } from '../services/aiCullingService';

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

describe('AICullingService', () => {
    let service: AICullingService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new AICullingService(mockDbManager as any, mockLogger as any);
    });

    it('should analyze photo and persist scores correctly', async () => {
        // Arrange
        mockFaceService.analyzeImage.mockResolvedValue({
            faceCount: 2,
            scores: {
                overall: 0.9,
                sharpness: 0.85,
                expression: 0.95
            }
        });

        // Act
        const scores = await service.analyzePhoto('photo-123', 'path/to/test.jpg');

        // Assert
        expect(mockFaceService.analyzeImage).toHaveBeenCalledWith('path/to/test.jpg');
        
        expect(scores).toMatchObject({
            overallScore: 0.9,
            sharpness: 0.85,
            expression: 0.95
        });

        // Verify DB persistence
        expect(mockDbManager.run).toHaveBeenCalledWith(
            expect.stringContaining('INSERT OR REPLACE INTO ai_scores'),
            ['photo-123', 0.9, 0.85, 0.6, 0.8, 0.95] // 0.8 is composition, 0.6 is exposure
        );
    });

    it('should fallback to default scores if analysis fails', async () => {
        // Arrange
        mockFaceService.analyzeImage.mockRejectedValue(new Error('Analysis failed'));

        // Act
        const scores = await service.analyzePhoto('photo-fail', 'path/to/fail.jpg');

        // Assert
        expect(scores).toMatchObject({
            overallScore: 0,
            sharpness: 0,
            exposure: 0,
            composition: 0,
            expression: 0
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockDbManager.run).not.toHaveBeenCalledWith(
            expect.stringContaining('INSERT OR REPLACE INTO ai_scores'),
            ['photo-fail', 0.5, 0.5, 0.5, 0.5, 0.5]
        );
    });
});
