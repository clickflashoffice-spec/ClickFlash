import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Photo } from '../../types';

interface AIProductRecommenderProps {
    photo: Photo;
    onAddToCart: (productId: string, name: string, price: number) => void;
}

const PRODUCTS = [
    { id: 'triptych', name: 'Triptych Canvas Set', price: 149.99, matchTypes: ['landscape'], icon: '🖼️', desc: 'Perfect for wide scenic shots.' },
    { id: 'acrylic', name: 'Acrylic Desk Block', price: 49.99, matchTypes: ['portrait'], icon: '🧊', desc: 'Sleek, modern standalone display.' },
    { id: 'framed', name: 'Premium Framed Print', price: 89.99, matchTypes: ['landscape', 'portrait', 'square'], icon: '🖼️', desc: 'Classic gallery-style presentation.' },
    { id: 'metal', name: 'HD Metal Print', price: 119.99, matchTypes: ['landscape', 'portrait'], icon: '✨', desc: 'Vibrant colors with intense depth.' }
];

const AIProductRecommender: React.FC<AIProductRecommenderProps> = ({ photo, onAddToCart }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());

    // Determine photo orientation/type (mock logic based on aspect ratio if we had width/height, falling back to random/all for demo)
    const recommendedProducts = useMemo(() => {
        // In a real app, we'd use photo metadata. Here we just pick a few or use all.
        const orientation = Math.random() > 0.5 ? 'landscape' : 'portrait';
        return PRODUCTS.filter(p => p.matchTypes.includes(orientation)).slice(0, 3);
    }, [photo.id]);

    useEffect(() => {
        setIsAnalyzing(true);
        const timer = setTimeout(() => setIsAnalyzing(false), 1200);
        return () => clearTimeout(timer);
    }, [photo.id]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % recommendedProducts.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + recommendedProducts.length) % recommendedProducts.length);
    };

    const handleAddToCart = (product: typeof PRODUCTS[0]) => {
        onAddToCart(product.id, product.name, product.price);
        setAddedProducts(prev => new Set(prev).add(product.id));
        setTimeout(() => {
            setAddedProducts(prev => {
                const next = new Set(prev);
                next.delete(product.id);
                return next;
            });
        }, 2000);
    };

    if (isAnalyzing) {
        return (
            <div className="w-full bg-slate-900/50 rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
                <Sparkles className="w-10 h-10 text-amber-400 animate-pulse mb-3" />
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-widest">AI Vision Analysis</h4>
                <p className="text-xs text-slate-500 mt-2">Finding the perfect products for this shot...</p>
            </div>
        );
    }

    if (recommendedProducts.length === 0) return null;

    const currentProduct = recommendedProducts[currentIndex];

    return (
        <div className="w-full bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-4 py-3 border-b border-amber-500/20 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">AI Recommended For You</h3>
            </div>

            <div className="p-6">
                <div className="relative flex items-center justify-center">
                    <button 
                        onClick={handlePrev}
                        className="absolute left-0 z-10 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="w-full max-w-sm px-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentProduct.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center"
                            >
                                {/* Virtual Mockup */}
                                <div className="relative w-48 h-48 mb-6 flex items-center justify-center bg-slate-800 rounded-xl shadow-2xl overflow-hidden p-4 border border-slate-700">
                                    <div className={`relative transition-all duration-500 ${
                                        currentProduct.id === 'triptych' ? 'w-[120%] flex gap-1' :
                                        currentProduct.id === 'acrylic' ? 'w-full h-full shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]' :
                                        currentProduct.id === 'metal' ? 'w-full h-full brightness-110 contrast-110' :
                                        'w-full h-full border-4 border-amber-900/30'
                                    }`}>
                                        {currentProduct.id === 'triptych' ? (
                                            <>
                                                <div className="flex-1 bg-cover bg-left" style={{ backgroundImage: `url(${photo.url})` }} />
                                                <div className="flex-1 bg-cover bg-center" style={{ backgroundImage: `url(${photo.url})` }} />
                                                <div className="flex-1 bg-cover bg-right" style={{ backgroundImage: `url(${photo.url})` }} />
                                            </>
                                        ) : (
                                            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${photo.url})` }} />
                                        )}
                                    </div>
                                    <div className="absolute top-2 right-2 text-2xl drop-shadow-md">{currentProduct.icon}</div>
                                </div>

                                {/* Product Info */}
                                <div className="text-center">
                                    <h4 className="text-lg font-bold text-white">{currentProduct.name}</h4>
                                    <p className="text-sm text-slate-400 mt-1 h-10">{currentProduct.desc}</p>
                                    <div className="text-xl font-black text-cyan-400 my-3">
                                        ${currentProduct.price.toFixed(2)}
                                    </div>
                                    
                                    <button
                                        onClick={() => handleAddToCart(currentProduct)}
                                        disabled={addedProducts.has(currentProduct.id)}
                                        className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm transition-all ${
                                            addedProducts.has(currentProduct.id)
                                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                                        }`}
                                    >
                                        {addedProducts.has(currentProduct.id) ? (
                                            'Added to Cart'
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4" />
                                                One-Tap Add
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <button 
                        onClick={handleNext}
                        className="absolute right-0 z-10 p-2 rounded-full bg-slate-800/80 text-white hover:bg-slate-700 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Carousel Indicators */}
                <div className="flex justify-center gap-2 mt-4">
                    {recommendedProducts.map((p, idx) => (
                        <div 
                            key={p.id} 
                            className={`h-1.5 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AIProductRecommender;
