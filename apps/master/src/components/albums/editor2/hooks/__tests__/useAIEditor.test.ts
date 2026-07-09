/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useAIEditor } from "../useAIEditor";

// Mock cullingService before importing useAIEditor
jest.mock("@/services/api/cullingService", () => ({
    cullingService: {
        analyzeAlbum: jest.fn().mockResolvedValue([]),
        getResults: jest.fn().mockResolvedValue([]),
        confirmCulling: jest.fn().mockResolvedValue({ success: true }),
    },
}));

// Mock imageProcessingService to avoid import.meta.url issues in Jest
jest.mock("@/services/imageProcessingService", () => ({
    imageProcessingService: {
        loadImageFromUrl: jest.fn().mockResolvedValue({}),
        getImageData: jest.fn().mockReturnValue({}),
        batchAutoEnhance: jest.fn().mockResolvedValue(new Map([
            ['photo-1', { adjustments: { exposure: 0.1, contrast: 0.15, highlights: -0.2, shadows: 0.2, vibrance: 0.1, sharpen: 0.2, saturation: 0, clarity: 0 } }],
            ['photo-2', { adjustments: { exposure: 0.1, contrast: 0.15, highlights: -0.2, shadows: 0.2, vibrance: 0.1, sharpen: 0.2, saturation: 0, clarity: 0 } }]
        ])),
        autoEnhanceAsync: jest.fn().mockResolvedValue({
            adjustments: { exposure: 0.1, contrast: 0.15, highlights: -0.2, shadows: 0.2, vibrance: 0.1, sharpen: 0.2, saturation: 0, clarity: 0 }
        })
    }
}));

// Mock the logger
jest.mock("@/utils/logger", () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('useAIEditor', () => {
    const mockAlbumId = 'album-123';
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    const mockShowToast = jest.fn();
    const mockUpdateEdit = jest.fn();
    const mockBatchUpdateEdits = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleAnalyzeAlbum', () => {
        it('should call analyzeAlbum and refresh', async () => {
            const { cullingService } = require("@/services/api/cullingService");
            cullingService.analyzeAlbum.mockResolvedValueOnce([]);

            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                })
            );

            await act(async () => {
                await result.current.handlers.handleAnalyzeAlbum();
            });

            expect(cullingService.analyzeAlbum).toHaveBeenCalledWith(mockAlbumId);
            expect(mockRefresh).toHaveBeenCalled();
            expect(mockShowToast).toHaveBeenCalledWith('Album analysis complete');
        });

        it('should handle analyzeAlbum failure', async () => {
            const { cullingService } = require("@/services/api/cullingService");
            cullingService.analyzeAlbum.mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                })
            );

            await act(async () => {
                await result.current.handlers.handleAnalyzeAlbum();
            });

            expect(mockShowToast).toHaveBeenCalledWith('AI Analysis failed');
        });

        it('should not call analyzeAlbum when albumId is empty', async () => {
            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: '',
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                })
            );

            await act(async () => {
                await result.current.handlers.handleAnalyzeAlbum();
            });

            const { cullingService } = require("@/services/api/cullingService");
            expect(cullingService.analyzeAlbum).not.toHaveBeenCalled();
        });
    });

    describe('handleApplyCulling', () => {
        it('should call confirmCulling when user confirms', async () => {
            const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
            const { cullingService } = require("@/services/api/cullingService");
            cullingService.confirmCulling.mockResolvedValueOnce({ success: true });

            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                })
            );

            await act(async () => {
                await result.current.handlers.handleApplyCulling();
            });

            expect(cullingService.confirmCulling).toHaveBeenCalledWith(mockAlbumId, { mode: 'archive' });
            expect(mockRefresh).toHaveBeenCalled();
            expect(mockShowToast).toHaveBeenCalledWith('Culling suggestions applied');

            confirmSpy.mockRestore();
        });

        it('should not call confirmCulling when user cancels', async () => {
            const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                })
            );

            await act(async () => {
                await result.current.handlers.handleApplyCulling();
            });

            const { cullingService } = require("@/services/api/cullingService");
            expect(cullingService.confirmCulling).not.toHaveBeenCalled();

            confirmSpy.mockRestore();
        });
    });

    describe('handleAutoEnhance', () => {
        it('should apply enhancement edits using batchUpdateEdits for multiple photos', async () => {
            const mockPhotos = [
                { id: 'photo-1', title: 'Photo 1', url: 'url1' },
                { id: 'photo-2', title: 'Photo 2', url: 'url2' },
            ] as any[];

            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                    batchUpdateEdits: mockBatchUpdateEdits,
                })
            );

            await act(async () => {
                await result.current.handlers.handleAutoEnhance(mockPhotos);
            });

            // Wait for the setTimeout delay (1500ms) + processing
            await waitFor(() => {
                expect(mockBatchUpdateEdits).toHaveBeenCalledWith(
                    ['photo-1'],
                    expect.objectContaining({
                        exposure: 10,
                        contrast: 15,
                        highlights: -20,
                        shadows: 20,
                        vibrance: 10,
                        sharpen: 20,
                    })
                );
                expect(mockBatchUpdateEdits).toHaveBeenCalledWith(
                    ['photo-2'],
                    expect.objectContaining({
                        exposure: 10,
                        contrast: 15,
                        highlights: -20,
                        shadows: 20,
                        vibrance: 10,
                        sharpen: 20,
                    })
                );
            }, { timeout: 3000 });

            expect(mockShowToast).toHaveBeenCalledWith('2 photos enhanced!');
        });

        it('should apply enhancement using updateEdit for single photo', async () => {
            const mockPhoto = { id: 'photo-1', title: 'Photo 1', url: 'url1' } as any;

            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                })
            );

            await act(async () => {
                await result.current.handlers.handleAutoEnhance(mockPhoto);
            });

            await waitFor(() => {
                expect(mockUpdateEdit).toHaveBeenCalledWith(
                    expect.objectContaining({
                        exposure: 10,
                        contrast: 15,
                        highlights: -20,
                        shadows: 20,
                        vibrance: 10,
                        sharpen: 20,
                    })
                );
            }, { timeout: 3000 });
        });

        it('should not call any update function when photos array is empty', async () => {
            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                    batchUpdateEdits: mockBatchUpdateEdits,
                })
            );

            await act(async () => {
                await result.current.handlers.handleAutoEnhance([]);
            });

            expect(mockUpdateEdit).not.toHaveBeenCalled();
            expect(mockBatchUpdateEdits).not.toHaveBeenCalled();
        });
    });

    describe('state management', () => {
        it('should report correct initial loading states', () => {
            const { result } = renderHook(() =>
                useAIEditor({
                    albumId: mockAlbumId,
                    refresh: mockRefresh,
                    showToast: mockShowToast,
                    updateEdit: mockUpdateEdit,
                })
            );

            expect(result.current.isAnalyzing).toBe(false);
            expect(result.current.isEnhancing).toBe(false);
            expect(result.current.isApplyingCulling).toBe(false);
        });
    });
});
