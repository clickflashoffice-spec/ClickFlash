import React, { createContext, useContext, ReactNode } from 'react';
import type { Photo } from '../../types';

interface CustomerGalleryContextType {
    favoritePhotoIds: Set<string>;
    onToggleFavorite: (photoId: string) => void;
    onOpenAddToCartModal: (photo: Photo) => void;
    onPhotoClick: (photo: Photo) => void;
    onNavigateToDownload?: () => void;
    onUpdateProofingStatus?: (photoId: string, status: 'approved' | 'rejected' | 'pending') => void;
    onBulkShare?: (photoIds: string[]) => void;
    onOpenProofing?: () => void;
    onDownloadHighRes?: (photo: Photo) => void;
    isOrderPaid?: boolean;
}

const CustomerGalleryContext = createContext<CustomerGalleryContextType | null>(null);

export const CustomerGalleryProvider: React.FC<{
    value: CustomerGalleryContextType;
    children: ReactNode;
}> = ({ value, children }) => {
    return <CustomerGalleryContext.Provider value={value}>{children}</CustomerGalleryContext.Provider>;
};

export const useCustomerGallery = () => {
    const context = useContext(CustomerGalleryContext);
    if (!context) {
        throw new Error('useCustomerGallery must be used within a CustomerGalleryProvider');
    }
    return context;
};
