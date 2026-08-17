import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GuestFaceSearchModal from './GuestFaceSearchModal';
import { cloudApiService } from '../../services/cloudApiService';

vi.mock('@clickflash/ui', () => ({
    Modal: ({ children, isOpen, title }: any) => isOpen ? <div data-testid="modal" title={title}>{children}</div> : null,
}));

vi.mock('../../services/cloudApiService', () => ({
    cloudApiService: {
        searchPhotosByFace: vi.fn(),
    },
}));

describe('GuestFaceSearchModal', () => {
    const mockOnClose = vi.fn();
    const mockOnAddAllToCart = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(global.navigator, 'mediaDevices', {
            value: {
                getUserMedia: vi.fn().mockResolvedValue({
                    getTracks: () => [{ stop: vi.fn() }],
                }),
            },
            writable: true,
            configurable: true,
        });
        
        // Mock constructible FileReader
        class MockFileReader {
            onload: any = null;
            readAsDataURL() {
                setTimeout(() => {
                    if (this.onload) {
                        this.onload({ target: { result: 'data:image/jpeg;base64,mock' } });
                    }
                }, 10);
            }
        }
        (global as any).FileReader = MockFileReader;
    });

    it('renders selfie capture view by default', () => {
        render(
            <GuestFaceSearchModal
                isOpen={true}
                onClose={mockOnClose}
                onAddAllToCart={mockOnAddAllToCart}
            />
        );

        expect(screen.getByText(/Take a Selfie to Find Your Photos/)).toBeDefined();
        expect(screen.getByText('Take a Selfie')).toBeDefined();
        expect(screen.getByText('Upload Photo')).toBeDefined();
    });

    it('file input accepts image and calls search', async () => {
        (cloudApiService.searchPhotosByFace as any).mockResolvedValue([
            { photo: { id: 'p1', url: 'test.jpg' } as any, matchScore: 0.95 }
        ]);

        const { container } = render(
            <GuestFaceSearchModal
                isOpen={true}
                onClose={mockOnClose}
                onAddAllToCart={mockOnAddAllToCart}
            />
        );

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).toBeDefined();

        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Wait for search to complete
        await waitFor(() => {
            expect(cloudApiService.searchPhotosByFace).toHaveBeenCalledWith('data:image/jpeg;base64,mock');
        });
    });

    it('confidence score badges show percentage', async () => {
        (cloudApiService.searchPhotosByFace as any).mockResolvedValue([
            { photo: { id: 'p1', url: 'test.jpg' } as any, matchScore: 0.955 }
        ]);

        const { container } = render(
            <GuestFaceSearchModal
                isOpen={true}
                onClose={mockOnClose}
                onAddAllToCart={mockOnAddAllToCart}
            />
        );

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('96% Match')).toBeDefined();
        });
    });

    it('empty results shows "No matching photos found" message', async () => {
        (cloudApiService.searchPhotosByFace as any).mockResolvedValue([]);

        const { container } = render(
            <GuestFaceSearchModal
                isOpen={true}
                onClose={mockOnClose}
                onAddAllToCart={mockOnAddAllToCart}
            />
        );

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('No matching photos found for this face.')).toBeDefined();
        });
    });

    it('"Add All to Cart" button calls onAddToCart with matched photo IDs', async () => {
        const mockPhotos = [
            { id: 'p1', url: 'test1.jpg' },
            { id: 'p2', url: 'test2.jpg' }
        ];

        (cloudApiService.searchPhotosByFace as any).mockResolvedValue([
            { photo: mockPhotos[0] as any, matchScore: 0.95 },
            { photo: mockPhotos[1] as any, matchScore: 0.85 }
        ]);

        const { container } = render(
            <GuestFaceSearchModal
                isOpen={true}
                onClose={mockOnClose}
                onAddAllToCart={mockOnAddAllToCart}
            />
        );

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['hello'], 'hello.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText('Add All My Photos to Cart')).toBeDefined();
        });

        fireEvent.click(screen.getByText('Add All My Photos to Cart'));

        expect(mockOnAddAllToCart).toHaveBeenCalledWith(mockPhotos);
        expect(mockOnClose).toHaveBeenCalled();
    });
});
