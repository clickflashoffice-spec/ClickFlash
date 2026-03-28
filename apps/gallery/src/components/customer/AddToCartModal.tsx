import React, { useState, useMemo } from 'react';
import Modal from '../common/Modal.tsx';
import { Photo, Product } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';

interface AddToCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: Photo;
    products: Product[];
    onAddToCart: (product: Product, quantity: number) => void;
}

const AddToCartModal: React.FC<AddToCartModalProps> = ({ isOpen, onClose, photo, products, onAddToCart }) => {
    const { formatCurrency } = useCurrency();
    const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
    const [quantity, setQuantity] = useState(1);

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === selectedProductId);
    }, [products, selectedProductId]);

    const handleAddToCart = () => {
        if (selectedProduct && quantity > 0) {
            onAddToCart(selectedProduct, quantity);
        }
    };

    const totalPrice = useMemo(() => {
        return (selectedProduct?.price || 0) * quantity;
    }, [selectedProduct, quantity]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Order Artifact" size="lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-down pb-4">
                <div className="flex items-center justify-center bg-slate-900 rounded-2xl overflow-hidden border border-white/5 relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent"></div>
                    <img src={photo.url} alt={photo.title} className="max-h-96 object-contain relative z-10 transition-transform duration-700 group-hover:scale-110" />
                </div>

                <div className="flex flex-col">
                    <div className="mb-6">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 mb-1">Target Asset</div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">{photo.title}</h3>
                    </div>

                    <div className="space-y-6 flex-1">
                        <div>
                            <label htmlFor="select-product" className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Fulfillment Type</label>
                            <select
                                id="select-product"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full p-4 bg-black/40 border border-white/10 rounded-2xl text-white text-xs font-bold focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all appearance-none cursor-pointer"
                            >
                                {products.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name} — {formatCurrency(p.price)}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Volume</label>
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-2xl overflow-hidden w-fit shadow-inner">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xl font-bold"
                                >
                                    -
                                </button>
                                <div className="w-12 h-12 flex items-center justify-center font-black text-white italic bg-white/5 border-x border-white/5">
                                    {quantity}
                                </div>
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xl font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10">
                        <div className="flex justify-between items-end mb-8">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pb-1">Total Valuation</span>
                            <span className="text-4xl font-black text-white italic tracking-tighter">{formatCurrency(totalPrice)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                            >
                                Abort
                            </button>
                            <button
                                type="button"
                                onClick={handleAddToCart}
                                className="w-full py-4 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-400 transition-all active:scale-95"
                            >
                                Queue Item
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AddToCartModal;
