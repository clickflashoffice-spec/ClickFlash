// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyVintageFilterToCanvas, VintageFilterOptions } from '../vintageFilter';

vi.mock('../logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('applyVintageFilterToCanvas', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockCtx: any;
    let mockImageData: ImageData;

    beforeEach(() => {
        mockCanvas = document.createElement('canvas');
        mockCanvas.width = 100;
        mockCanvas.height = 100;
        mockCanvas.toDataURL = vi.fn().mockReturnValue('data:image/jpeg;base64,mock');
        
        mockCtx = {
            drawImage: vi.fn(),
            getImageData: vi.fn(),
            putImageData: vi.fn(),
            createRadialGradient: vi.fn().mockReturnValue({
                addColorStop: vi.fn()
            }),
            fillRect: vi.fn(),
            strokeRect: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0
        };

        const dataArray = new Uint8ClampedArray(40000); // 100x100 * 4
        // fill with some color
        for (let i = 0; i < dataArray.length; i += 4) {
            dataArray[i] = 100;     // r
            dataArray[i+1] = 150;   // g
            dataArray[i+2] = 200;   // b
            dataArray[i+3] = 255;   // a
        }

        mockImageData = {
            data: dataArray,
            width: 100,
            height: 100,
            colorSpace: 'srgb'
        };

        mockCtx.getImageData.mockReturnValue(mockImageData);

        // Mock document.createElement to return our mock canvas
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'canvas') return mockCanvas;
            return originalCreateElement(tagName);
        });
    });

    it('throws error if context is unavailable', async () => {
        vi.spyOn(mockCanvas, 'getContext').mockReturnValue(null);
        await expect(applyVintageFilterToCanvas(mockCanvas)).rejects.toThrow('Canvas 2D context unavailable');
    });

    it('applies classic_bw filter correctly', async () => {
        vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx);
        
        const result = await applyVintageFilterToCanvas(mockCanvas, { mode: 'classic_bw', grainIntensity: 0, vignetteStrength: 0 });
        
        expect(mockCtx.drawImage).toHaveBeenCalled();
        expect(mockCtx.getImageData).toHaveBeenCalled();
        expect(mockCtx.putImageData).toHaveBeenCalled();
        expect(result).toBe('data:image/jpeg;base64,mock');
    });

    it('applies sepia_film filter with grain and vignette', async () => {
        vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx);
        
        await applyVintageFilterToCanvas(mockCanvas, { mode: 'sepia_film', grainIntensity: 0.5, vignetteStrength: 0.5 });
        
        expect(mockCtx.createRadialGradient).toHaveBeenCalled();
        expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('applies fotio_studio filter with border', async () => {
        vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx);
        
        await applyVintageFilterToCanvas(mockCanvas, { mode: 'fotio_studio', grainIntensity: 0, vignetteStrength: 0 });
        
        expect(mockCtx.strokeRect).toHaveBeenCalled();
    });
});
