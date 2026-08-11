
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Photo, CartItem, DestinationFeatures } from '../../types.ts';
import { MOCK_PRINT_SIZES } from '../../constants.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { useKiosk } from '../../context/KioskContext.tsx';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import { AutoEditorCanvas, AutoEditorCanvasRef } from './AutoEditorCanvas.tsx';
interface WatermarkSettingsType {
    enabled: boolean;
    imageUrl: string;
    opacity: number;
    scale: number;
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' | 'center-left' | 'center-right';
    dynamicProtection: boolean;
}

interface PhotoPreviewScreenProps {
    photo: Photo;
    albumPhotos: Photo[];
    cart: CartItem[];
    onUpdateCart: (item: CartItem) => void;
    onBack: () => void;
    setActivePhoto: (photo: Photo) => void;
    isOnline: boolean;
    globalFeatures?: DestinationFeatures;
}

const PhotoPreviewScreen: React.FC<PhotoPreviewScreenProps> = ({
    photo,
    albumPhotos,
    cart,
    onUpdateCart,
    onBack,
    setActivePhoto,
    isOnline,
    globalFeatures = { ai: true, face: true, watermark: true }
}) => {
    const { products } = useKiosk();
    const { formatCurrency } = useCurrency();
    const [selectedSize, setSelectedSize] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [deliveryType, setDeliveryType] = useState<'digital' | 'print' | 'both'>('print');

    // Zoom & Pan State
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<AutoEditorCanvasRef>(null);
    const [autoEnhance, setAutoEnhance] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [showEnhanced, setShowEnhanced] = useState(true);

    const [watermarkSettings] = useLocalStorage<WatermarkSettingsType>('watermarkSettings', {
        enabled: false,
        imageUrl: '',
        opacity: 50,
        scale: 30,
        position: 'center',
        dynamicProtection: false,
    });

    const currentIndex = albumPhotos.findIndex(p => p.id === photo.id);

    // Reset zoom when photo changes
    useEffect(() => {
        setQuantity(1);
        if (products.length > 0 && !selectedSize) {
            setSelectedSize(products[0].name);
        }
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
        setAutoEnhance(false);
        setIsAiProcessing(false);
        setShowEnhanced(true);
    }, [photo, products, selectedSize]);

    // Handle initial selection if not set
    useEffect(() => {
        if (products.length > 0 && !selectedSize) {
            setSelectedSize(products[0].name);
        }
    }, [products, selectedSize]);

    const handleNext = () => {
        const nextIndex = (currentIndex + 1) % albumPhotos.length;
        setActivePhoto(albumPhotos[nextIndex]);
    };

    const handlePrev = () => {
        const prevIndex = (currentIndex - 1 + albumPhotos.length) % albumPhotos.length;
        setActivePhoto(albumPhotos[prevIndex]);
    };

    // --- Zoom & Pan Handlers ---
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => {
        setZoomLevel(prev => {
            const newZoom = Math.max(prev - 0.5, 1);
            if (newZoom === 1) setPan({ x: 0, y: 0 }); // Reset pan if zoomed out
            return newZoom;
        });
    };
    const handleResetZoom = () => {
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
    };

    // Mouse Wheel Zoom
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            handleZoomIn();
        } else {
            handleZoomOut();
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (zoomLevel > 1) {
            e.preventDefault();
            setIsDragging(true);
            dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging && zoomLevel > 1) {
            e.preventDefault();
            setPan({
                x: e.clientX - dragStart.current.x,
                y: e.clientY - dragStart.current.y
            });
        }
    };

    const handlePointerUp = () => setIsDragging(false);
    const handlePointerLeave = () => setIsDragging(false);


    const handleAddToCart = (mode: 'Normal') => {
        const product = products.find(p => p.name === selectedSize);
        if (!product) return;

        const price = product.price;

        const cartItemId = `${photo.id}-${selectedSize}-${deliveryType}`; // Include delivery type in ID to allow different delivery modes for same size if needed
        const existingItem = cart.find(i => i.id === cartItemId);
        const newQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

        const cartItem: CartItem = {
            id: cartItemId,
            photo: photo,
            quantity: newQuantity,
            size: selectedSize,
            price,
            mode: 'Normal',
            deliveryType,
            productId: product.id
        };
        onUpdateCart(cartItem);
    };

    const currentPrice = products.find(p => p.name === selectedSize)?.price || 0;
    const itemsInCartForThisSize = cart.find(item => item.photo.id === photo.id && item.size === selectedSize && item.deliveryType === deliveryType);
    const normalInCart = itemsInCartForThisSize?.mode === 'Normal' ? itemsInCartForThisSize.quantity : 0;

    const displayUrl = photo.url;

    const getWatermarkClasses = (): string => {
        const base = "absolute z-20 pointer-events-none";
        switch (watermarkSettings.position) {
            case 'top-left': return `${base} top-[5%] left-[5%]`;
            case 'top-center': return `${base} top-[5%] left-1/2 -translate-x-1/2`;
            case 'top-right': return `${base} top-[5%] right-[5%]`;
            case 'center-left': return `${base} top-1/2 left-[5%] -translate-y-1/2`;
            case 'center': return `${base} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`;
            case 'center-right': return `${base} top-1/2 right-[5%] -translate-y-1/2`;
            case 'bottom-left': return `${base} bottom-[5%] left-[5%]`;
            case 'bottom-center': return `${base} bottom-[5%] left-1/2 -translate-x-1/2`;
            case 'bottom-right': return `${base} bottom-[5%] right-[5%]`;
            default: return `${base} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`;
        }
    };

    const getWatermarkDynamicStyle = (): React.CSSProperties => ({
        opacity: watermarkSettings.opacity / 100,
        width: `${watermarkSettings.scale}%`,
        height: 'auto',
    });

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-40 flex items-center justify-center p-0 lg:p-4 backdrop-blur-xl"
        >
            <div className="bg-white dark:bg-slate-900 w-full h-full lg:rounded-2xl flex flex-col text-slate-800 dark:text-white overflow-hidden shadow-2xl border-none lg:border border-slate-800">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0 bg-white dark:bg-slate-900 z-30">
                    <button onClick={onBack} data-testid="back-to-gallery-button" className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        <span>Back to Gallery</span>
                    </button>
                    <h2 className="text-xl font-bold truncate max-w-md hidden sm:block">{photo.title}</h2>
                    <div className="w-48 hidden sm:block"></div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                    <div className="flex-1 relative bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center group">

                        {/* Zoom/Pan Container */}
                        <div
                            ref={imageContainerRef}
                            className="w-full h-full flex items-center justify-center relative overflow-hidden cursor-default touch-none"
                            onWheel={handleWheel}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                        >
                            {/* Watermark Overlay */}
                            {watermarkSettings.enabled && watermarkSettings.imageUrl && (
                                <img src={watermarkSettings.imageUrl} style={getWatermarkDynamicStyle()} className={`select-none ${getWatermarkClasses()}`} alt="" />
                            )}

                            {/* The Photo */}
                            <motion.img
                                layoutId={`photo-img-${photo.id}`}
                                src={displayUrl}
                                alt={photo.title}
                                className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-100 select-none"
                                style={{
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                    display: (!autoEnhance || !showEnhanced) ? 'block' : 'none',
                                }}
                                draggable={false}
                            />
                            
                            {autoEnhance && (
                                <motion.div
                                    layoutId={`photo-img-enhanced-${photo.id}`}
                                    className="max-w-full max-h-full shadow-2xl transition-transform duration-100 select-none flex items-center justify-center"
                                    style={{
                                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                                        cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                        width: '100%',
                                        height: '100%',
                                        display: showEnhanced ? 'flex' : 'none',
                                    }}
                                >
                                    <AutoEditorCanvas
                                        ref={editorRef}
                                        imageUrl={displayUrl}
                                        options={{ autoEnhance: true }}
                                        onProcessingStart={() => setIsAiProcessing(true)}
                                        onProcessingComplete={() => setIsAiProcessing(false)}
                                    />
                                </motion.div>
                            )}

                            {/* Optimistic Loading Overlay */}
                            {isAiProcessing && (
                                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
                                    <p className="text-white font-bold text-xl drop-shadow-md">AI Optimizing Lighting & Color...</p>
                                </div>
                            )}

                            {/* AI Toggle / Before-After Pill */}
                            {autoEnhance && (
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center bg-black/80 backdrop-blur-md rounded-full p-1 z-30 shadow-2xl border border-white/20">
                                    <button
                                        onClick={() => setShowEnhanced(false)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${!showEnhanced ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}
                                    >
                                        Before
                                    </button>
                                    <button
                                        onClick={() => setShowEnhanced(true)}
                                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${showEnhanced ? 'bg-purple-600 text-white' : 'text-white hover:bg-white/20'}`}
                                    >
                                        After
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Zoom Controls - Enhanced Visibility */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-black/70 backdrop-blur-xl rounded-full px-6 py-3 z-30 shadow-2xl border border-white/20 ring-1 ring-black/50">
                            <button
                                onClick={handleZoomOut}
                                className="min-w-[44px] min-h-[44px] p-2 text-white hover:text-blue-400 disabled:opacity-30 transition-colors active:scale-90 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                disabled={zoomLevel <= 1}
                                aria-label="Zoom out"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                            </button>
                            <span className="text-white font-mono text-lg font-bold w-14 text-center select-none" aria-label={`Zoom level ${Math.round(zoomLevel * 100)} percent`}>{Math.round(zoomLevel * 100)}%</span>
                            <button
                                onClick={handleZoomIn}
                                className="min-w-[44px] min-h-[44px] p-2 text-white hover:text-blue-400 disabled:opacity-30 transition-colors active:scale-90 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                disabled={zoomLevel >= 4}
                                aria-label="Zoom in"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <div className="w-px h-6 bg-white/20 mx-2" aria-hidden="true"></div>
                            <button
                                onClick={handleResetZoom}
                                className="min-w-[44px] min-h-[44px] text-xs text-white font-bold hover:text-blue-400 uppercase tracking-wider active:scale-95 touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                aria-label="Reset zoom to 100%"
                            >
                                Reset
                            </button>
                            <div className="w-px h-6 bg-white/20 mx-2" aria-hidden="true"></div>
                            <button
                                onClick={() => {
                                    setAutoEnhance(!autoEnhance);
                                    if (!autoEnhance) setShowEnhanced(true);
                                }}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-bold transition-all ${autoEnhance ? 'bg-purple-600 text-white' : 'text-white hover:text-purple-400'}`}
                            >
                                <span>✨ AI Magic Enhance</span>
                            </button>
                        </div>

                        {/* Nav Arrows */}
                        <button
                            onClick={handlePrev}
                            className="min-w-[44px] min-h-[44px] absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/40 rounded-full text-white hover:bg-black/70 transition-all backdrop-blur-md z-30 border border-white/10 hover:scale-110 active:scale-95 hidden sm:block touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label="Previous photo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            onClick={handleNext}
                            className="min-w-[44px] min-h-[44px] absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/40 rounded-full text-white hover:bg-black/70 transition-all backdrop-blur-md z-30 border border-white/10 hover:scale-110 active:scale-95 hidden sm:block touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label="Next photo"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Order Sidebar */}
                    <aside className="w-full lg:w-96 bg-white dark:bg-slate-900 p-6 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 z-30 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6">Order Options</h3>

                        <div className="space-y-6 flex-grow overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Enhancements</label>
                                <button
                                    onClick={() => setAutoEnhance(!autoEnhance)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${autoEnhance ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 ring-1 ring-purple-500 shadow-md text-purple-700 dark:text-purple-300' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">✨ AI Magic Enhance</span>
                                        <span className="font-bold text-xs uppercase bg-purple-100 dark:bg-purple-800 px-2 py-1 rounded-md">Offline</span>
                                    </div>
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Format</label>
                                <div className="grid gap-3">
                                    {products.length > 0 ? products.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedSize(p.name)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedSize === p.name ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500 shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold">{p.name}</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(p.price)}</span>
                                            </div>
                                        </button>
                                    )) : (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center text-slate-500 italic">
                                            No products available
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Delivery Type</label>
                                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                    {(['print', 'digital', 'both'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setDeliveryType(type)}
                                            className={`py-2 px-1 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${deliveryType === type ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Quantity</label>
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden w-full max-w-[200px]">
                                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-14 h-12 text-2xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors font-bold">-</button>
                                    <span className="flex-1 h-12 flex items-center justify-center font-bold text-xl">{quantity}</span>
                                    <button onClick={() => setQuantity(q => q + 1)} className="w-14 h-12 text-2xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors font-bold">+</button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-6 space-y-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => handleAddToCart('Normal')} data-testid="add-to-cart-button" className="w-full relative bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all">
                                Add Original to Cart
                                {normalInCart > 0 && <span className="absolute -top-2 -right-2 w-8 h-8 bg-white text-blue-600 text-sm font-extrabold rounded-full flex items-center justify-center border-2 border-blue-600 shadow-sm">{normalInCart}</span>}
                            </button>
                        </div>

                    </aside>
                </main>
            </div>
        </motion.div>
    );
};

export default PhotoPreviewScreen;
