import { Modal } from '@clickflash/ui';
import React, { useRef, useState, useEffect } from 'react';
import { Product, Photo } from '../../types';


interface ProductSelectionModalProps {
    product: Product;
    photos: Photo[];
    onClose: () => void;
    onSelect: (photo: Photo) => void;
    photographerId: number;
}

const ProductSelectionModal: React.FC<ProductSelectionModalProps> = ({ product, photos, onClose, onSelect, photographerId }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [displayPhotos, setDisplayPhotos] = useState<Photo[]>(photos);

    useEffect(() => {
        // Reset display photos if the modal is reopened with new props
        setDisplayPhotos(photos);
    }, [photos]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const newPhoto: Photo = {
                id: `upload-${Date.now()}`,
                albumId: '',
                title: file.name,
                url: e.target?.result as string,
                photographerId: photographerId,
            };
            // Add new photo to the beginning of the list for immediate visibility
            setDisplayPhotos(prev => [newPhoto, ...prev]);
        };
        reader.readAsDataURL(file);
        // Clear the input value to allow uploading the same file again
        event.target.value = '';
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Choose a Photo for Your ${product.name}`} size="xl">
            <div>
                {/* Upload Section */}
                <div className="mb-6 pb-6 border-b border-slate-700">
                    <h3 className="text-lg font-semibold text-center mb-4">Upload a New Photo</h3>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/png, image/jpeg, image/gif"
                        className="hidden"
                    />
                    <button
                        onClick={handleUploadClick}
                        className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-600 rounded-lg hover:bg-slate-700 hover:border-slate-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="font-semibold text-white">Click to upload from your device</span>
                        <span className="text-sm text-slate-400 mt-1">PNG, JPG, or GIF</span>
                    </button>
                </div>

                <h3 className="text-lg font-semibold text-center mb-4 text-slate-400">Or Select From Your Purchased Gallery</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 max-h-[50vh] overflow-y-auto pr-2">
                    {displayPhotos.map(photo => {
                        const isNewUpload = photo.id.startsWith('upload-');
                        return (
                            <div key={photo.id} className="relative group cursor-pointer" onClick={() => onSelect(photo)}>
                                <img src={photo.url} alt={photo.title} className="w-full h-full object-cover rounded-lg" />
                                <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center ${isNewUpload ? 'ring-2 ring-green-500' : ''}`}>
                                    <span className="text-white font-bold text-center">Select Photo</span>
                                </div>
                                {isNewUpload && (
                                    <span className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">New</span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </Modal>
    );
};

export default ProductSelectionModal;