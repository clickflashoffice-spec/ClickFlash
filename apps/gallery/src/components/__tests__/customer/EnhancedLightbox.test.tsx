import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Photo } from '../../../types';
import EnhancedLightbox from '../../customer/EnhancedLightbox';

jest.mock('framer-motion', () => {
  const ReactModule = require('react') as typeof React;
  const MotionImage = ReactModule.forwardRef<HTMLImageElement, Record<string, unknown>>((props, ref) => {
    const {
      custom: _custom,
      variants: _variants,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      onDragEnd: _onDragEnd,
      ...imageProps
    } = props;
    return ReactModule.createElement('img', { ...imageProps, ref });
  });
  MotionImage.displayName = 'MotionImage';
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: { img: MotionImage },
  };
});

const photos = [
  {
    id: 'photo-1',
    albumId: 'album-1',
    url: 'https://example.com/one.jpg',
    thumbnailUrl: 'https://example.com/one-thumb.jpg',
    title: 'First photo',
    originalFilename: 'one.jpg',
    photographerId: 'photographer-1',
    width: 6000,
    height: 4000,
    fileSize: 4 * 1024 * 1024,
  },
  {
    id: 'photo-2',
    albumId: 'album-1',
    url: 'https://example.com/two.jpg',
    thumbnailUrl: 'https://example.com/two-thumb.jpg',
    title: 'Second photo',
    photographerId: 'photographer-1',
  },
] as Photo[];

function renderLightbox(overrides: Partial<React.ComponentProps<typeof EnhancedLightbox>> = {}) {
  const props: React.ComponentProps<typeof EnhancedLightbox> = {
    photos,
    startIndex: 0,
    onClose: jest.fn(),
    favoritePhotoIds: new Set<string>(),
    onToggleFavorite: jest.fn(),
    onOpenAddToCartModal: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<EnhancedLightbox {...props} />) };
}

describe('EnhancedLightbox', () => {
  it('behaves as a modal dialog and restores page scrolling on close', async () => {
    const { unmount } = renderLightbox();

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close lightbox' })).toHaveFocus());
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('initializes comparison with a different photo and closes comparison before the dialog', () => {
    const onClose = jest.fn();
    renderLightbox({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'Compare photos' }));
    expect(screen.getByAltText('Second photo')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByAltText('Second photo')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation, information, favorites, and cart actions', () => {
    const onToggleFavorite = jest.fn();
    const onOpenAddToCartModal = jest.fn();
    renderLightbox({ onToggleFavorite, onOpenAddToCartModal });

    fireEvent.click(screen.getByRole('button', { name: 'Show photo information' }));
    expect(screen.getByLabelText('Photo information')).toHaveTextContent('6000 × 4000');
    expect(screen.getByLabelText('Photo information')).toHaveTextContent('4.0 MB');

    fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }));
    expect(onToggleFavorite).toHaveBeenCalledWith('photo-1');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'Second photo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add photo to cart' }));
    expect(onOpenAddToCartModal).toHaveBeenCalledWith(expect.objectContaining({ id: 'photo-2' }));
  });
});
