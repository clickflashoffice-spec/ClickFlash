import React, { useState } from 'react';
import { Product, Photo } from '../../types';
import Modal from '../common/Modal.tsx';
import { useCurrency } from '../CurrencyContext.tsx';

interface StorePageProps {
    products: Product[];
    photos: Photo[];
    onAddToCart: (photo: Photo, product: Product) => void;
}

const StorePage: React.FC<StorePageProps> = ({ products, photos, onAddToCart }) => {
    const [isPhotoSelectorOpen, setIsPhotoSelectorOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const { formatCurrency } = useCurrency();

    const handleBuyClick = (product: Product) => {
        setSelectedProduct(product);
        setIsPhotoSelectorOpen(true);
    };

    const handlePhotoSelect = (photo: Photo) => {
        if (selectedProduct) {
            onAddToCart(photo, selectedProduct);
        }
        setIsPhotoSelectorOpen(false);
        setSelectedProduct(null);
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-down pb-32">
            <div className="mb-12">
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Merchandise <span className="text-cyan-400">Hub</span></h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">Premium Artifacts & Prints curated for your collection</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map(product => (
                    <div key={product.id} className="premium-card p-6 border border-white/5 flex flex-col group hover:border-cyan-500/30 transition-all hover:-translate-y-2">
                        <div className="bg-slate-900 h-56 rounded-2xl mb-6 flex items-center justify-center border border-white/5 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-800 transition-transform duration-700 group-hover:scale-110 group-hover:text-cyan-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-black text-lg text-white uppercase italic tracking-tight">{product.name}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{product.category}</p>
                            </div>
                            <p className="font-black text-2xl text-cyan-400 italic tracking-tighter">{formatCurrency(product.price)}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-8 flex-1">
                            Transform your favorite cinematic moments into physical treasures with our {product.name.toLowerCase()}.
                        </p>
                        <button
                            onClick={() => handleBuyClick(product)}
                            className="w-full bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest py-3.5 rounded-xl border border-cyan-400/50 hover:bg-cyan-400 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span>Link Photo & Order</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                ))}
            </div>

            {isPhotoSelectorOpen && selectedProduct && (
                <Modal
                    isOpen={true}
                    onClose={() => setIsPhotoSelectorOpen(false)}
                    title={`Associate Photo: ${selectedProduct.name}`}
                    size="xl"
                >
                    <div className="text-center mb-10 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pick the asset to link with this merchandise</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[60vh] overflow-y-auto px-2 pb-8">
                        {photos.map(photo => (
                            <div key={photo.id} className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden border border-white/5 bg-slate-900" onClick={() => handlePhotoSelect(photo)}>
                                <img src={photo.url} alt={photo.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Select Asset</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </main>
    );
};

export default StorePage;
