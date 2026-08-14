import { fireEvent, render, screen } from '@testing-library/react';

import CustomerGallery from '@/components/customer/CustomerGallery';
import type { Photo } from '@/types';

const photo: Photo = {
  id: 'photo-1',
  url: 'https://example.test/photo-1.jpg',
  title: 'Pool portrait',
};

const requiredProps = {
  photos: [photo],
  favoritePhotoIds: new Set<string>(),
  onToggleFavorite: jest.fn(),
  onOpenAddToCartModal: jest.fn(),
  onPhotoClick: jest.fn(),
};

describe('CustomerGallery loading and empty states', () => {
  it('renders an accessible skeleton grid while photos load', () => {
    render(<CustomerGallery {...requiredProps} photos={[]} isLoading />);

    expect(screen.getByRole('status', { name: 'Loading gallery photos' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('lets the customer reset filters from a filtered empty state', () => {
    render(<CustomerGallery {...requiredProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'favorites' }));
    expect(screen.getByText('No matching photos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByAltText('Pool portrait')).toBeInTheDocument();
  });
});
