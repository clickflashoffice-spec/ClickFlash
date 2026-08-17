import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImmersiveLightboxV2 from './ImmersiveLightboxV2';
import { Photo } from '../../types';

// Mock framer-motion to avoid complex animations in tests
vi.mock('framer-motion', () => {
    return {
        motion: {
            div: ({ children, animate, ...props }: any) => {
                const style = animate && animate.scale ? { ...props.style, transform: `scale(${animate.scale})` } : props.style;
                return <div {...props} style={style}>{children}</div>;
            },
            img: ({ animate, ...props }: any) => {
                const style = animate && animate.scale ? { ...props.style, transform: `scale(${animate.scale})` } : props.style;
                return <img {...props} style={style} />;
            },
        },
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

// Mock metadata utils
vi.mock('../../utils/metadataUtils', () => ({
    extractMetadata: vi.fn(() => Promise.resolve({
        camera: 'Sony A7III',
        lens: '50mm f/1.8',
        aperture: 'f/1.8',
        shutterSpeed: '1/200s',
        iso: '100',
        captureDate: '2023-01-01T12:00:00Z',
    })),
    getImageFileSize: vi.fn(() => Promise.resolve('2.5 MB')),
}));

const mockPhotos: Photo[] = [
    { id: '1', albumId: 'album_1', photographerId: 'p_1', url: 'https://example.com/1.jpg', title: 'Photo 1', originalFilename: '1.jpg' },
    { id: '2', albumId: 'album_1', photographerId: 'p_1', url: 'https://example.com/2.jpg', title: 'Photo 2', originalFilename: '2.jpg' },
    { id: '3', albumId: 'album_1', photographerId: 'p_1', url: 'https://example.com/3.jpg', title: 'Photo 3', originalFilename: '3.jpg' },
];

describe('ImmersiveLightboxV2', () => {
    const mockOnClose = vi.fn();
    const mockOnToggleFavorite = vi.fn();
    const mockOnOpenAddToCartModal = vi.fn();
    const mockOnShare = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders fullscreen with correct image src', () => {
        render(
            <ImmersiveLightboxV2
                photos={mockPhotos}
                startIndex={0}
                onClose={mockOnClose}
                favoritePhotoIds={new Set(['1'])}
                onToggleFavorite={mockOnToggleFavorite}
                onOpenAddToCartModal={mockOnOpenAddToCartModal}
            />
        );

        const img = screen.getByAltText('Photo 1');
        expect(img).toBeDefined();
        expect(img.getAttribute('src')).toBe('https://example.com/1.jpg');
    });

    it('left/right arrow navigation cycles through photos array', () => {
        render(
            <ImmersiveLightboxV2
                photos={mockPhotos}
                startIndex={0}
                onClose={mockOnClose}
                favoritePhotoIds={new Set()}
                onToggleFavorite={mockOnToggleFavorite}
                onOpenAddToCartModal={mockOnOpenAddToCartModal}
            />
        );

        // Initially on Photo 1
        expect(screen.getByAltText('Photo 1')).toBeDefined();

        // Press Right
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(screen.getByAltText('Photo 2')).toBeDefined();

        // Press Right again
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(screen.getByAltText('Photo 3')).toBeDefined();

        // Press Right again (cycle to start)
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(screen.getByAltText('Photo 1')).toBeDefined();

        // Press Left (cycle to end)
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(screen.getByAltText('Photo 3')).toBeDefined();
    });

    it('Escape key closes lightbox (calls onClose)', () => {
        render(
            <ImmersiveLightboxV2
                photos={mockPhotos}
                startIndex={0}
                onClose={mockOnClose}
                favoritePhotoIds={new Set()}
                onToggleFavorite={mockOnToggleFavorite}
                onOpenAddToCartModal={mockOnOpenAddToCartModal}
            />
        );

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('EXIF drawer toggle shows/hides metadata panel', async () => {
        render(
            <ImmersiveLightboxV2
                photos={mockPhotos}
                startIndex={0}
                onClose={mockOnClose}
                favoritePhotoIds={new Set()}
                onToggleFavorite={mockOnToggleFavorite}
                onOpenAddToCartModal={mockOnOpenAddToCartModal}
            />
        );

        // EXIF button toggle
        const infoBtn = screen.getByTitle('Photo Info');
        fireEvent.click(infoBtn);

        // Check if metadata is shown
        await waitFor(() => {
            expect(screen.getByText('Sony A7III')).toBeDefined();
            expect(screen.getByText('2.5 MB')).toBeDefined();
        });

        // Toggle off
        fireEvent.click(infoBtn);
        // Testing-library's AnimatePresence mock will immediately remove it
        expect(screen.queryByText('Sony A7III')).toBeNull();
    });

    it('wheel zoom changes transform scale CSS', () => {
        const { container } = render(
            <ImmersiveLightboxV2
                photos={mockPhotos}
                startIndex={0}
                onClose={mockOnClose}
                favoritePhotoIds={new Set()}
                onToggleFavorite={mockOnToggleFavorite}
                onOpenAddToCartModal={mockOnOpenAddToCartModal}
            />
        );

        const wheelContainer = container.querySelector('.touch-none');
        expect(wheelContainer).toBeDefined();

        // Fire wheel event (zoom in)
        fireEvent.wheel(wheelContainer!, { deltaY: -50, preventDefault: vi.fn() });

        // Check image style
        const img = screen.getByAltText('Photo 1');
        expect(img.style.transform).toBe('scale(1.5)');
    });
});
