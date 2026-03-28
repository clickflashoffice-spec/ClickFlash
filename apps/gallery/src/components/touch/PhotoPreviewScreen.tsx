
import React, { useState, useEffect, useRef } from 'react';
import { Photo, CartItem, DestinationFeatures } from '../../types.ts';
import { MOCK_PRINT_SIZES } from '../../constants.ts';
import { useCurrency } from '../CurrencyContext.tsx';
import { urlToInlineData } from '../../utils/imageUtils.ts';
import { editImageWithAI } from '../../services/geminiService.ts';
import useLocalStorage from '../../hooks/useLocalStorage.ts';
import { WatermarkSettingsType } from '../settings/WatermarkSettings.tsx';

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
    const { formatCurrency } = useCurrency();
    const [selectedSize, setSelectedSize] = useState(MOCK_PRINT_SIZES[0].size);
    const [quantity, setQuantity] = useState(1);
    const [isAIEnhancing, setIsAIEnhancing] = useState(false);
    const [enhancedPhotoUrl, setEnhancedPhotoUrl] = useState<string | null>(null);
    
    // Zoom & Pan State
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);
    
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
      setSelectedSize(MOCK_PRINT_SIZES[0].size);
      setEnhancedPhotoUrl(null);
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
    }, [photo]);

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


    const handleAddToCart = (mode: 'Normal' | 'AI') => {
        const priceInfo = MOCK_PRINT_SIZES.find(s => s.size === selectedSize);
        if (!priceInfo) return;
        
        const price = mode === 'AI' ? priceInfo.price * 1.5 : priceInfo.price;
        
        const cartItemId = `${photo.id}-${selectedSize}-${mode}`;
        const existingItem = cart.find(i => i.id === cartItemId);
        const newQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

        const cartItem: CartItem = {
            id: cartItemId,
            photo: mode === 'AI' && enhancedPhotoUrl ? { ...photo, url: enhancedPhotoUrl, title: `${photo.title} (Enhanced)` } : photo,
            quantity: newQuantity,
            size: selectedSize,
            price,
            mode
        };
        onUpdateCart(cartItem);
    };

    const handleAIEnhance = async () => {
        // Only allow if online AND feature is enabled globally
        if (!isOnline || !globalFeatures.ai) return;
        
        if (enhancedPhotoUrl) {
            handleAddToCart('AI');
            return;
        }

        setIsAIEnhancing(true);
        try {
            const { mimeType, data } = await urlToInlineData(photo.url);
            const prompt = "Enhance this photo for printing. Improve lighting, color balance, and sharpness slightly. Keep it natural.";
            const result = await editImageWithAI(data, mimeType, prompt);
            
            const newUrl = `data:${result.mimeType};base64,${result.data}`;
            setEnhancedPhotoUrl(newUrl);
        } catch (error) {
            console.error("AI Enhancement failed:", error);
            alert("Could not enhance photo. Please try again later.");
        } finally {
            setIsAIEnhancing(false);
        }
    };


    const currentPrice = MOCK_PRINT_SIZES.find(s => s.size === selectedSize)?.price || 0;
    const itemsInCartForThisSize = cart.find(item => item.photo.id === photo.id && item.size === selectedSize);
    const normalInCart = itemsInCartForThisSize?.mode === 'Normal' ? itemsInCartForThisSize.quantity : 0;
    const aiInCart = itemsInCartForThisSize?.mode === 'AI' ? itemsInCartForThisSize.quantity : 0;
    
    const displayUrl = enhancedPhotoUrl || photo.url;
    
    const aiFeatureEnabled = isOnline && globalFeatures.ai;

    const getWatermarkStyle = (): React.CSSProperties => {
        if (!watermarkSettings.enabled || !watermarkSettings.imageUrl) return { display: 'none' };

        const baseStyle: React.CSSProperties = {
            position: 'absolute',
            opacity: watermarkSettings.opacity / 100,
            width: `${watermarkSettings.scale}%`,
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 20
        };

        switch (watermarkSettings.position) {
            case 'top-left': return { ...baseStyle, top: '5%', left: '5%' };
            case 'top-center': return { ...baseStyle, top: '5%', left: '50%', transform: 'translate(-50%, 0)' };
            case 'top-right': return { ...baseStyle, top: '5%', right: '5%' };
            case 'center-left': return { ...baseStyle, top: '50%', left: '5%', transform: 'translate(0, -50%)' };
            case 'center': return { ...baseStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            case 'center-right': return { ...baseStyle, top: '50%', right: '5%', transform: 'translate(0, -50%)' };
            case 'bottom-left': return { ...baseStyle, bottom: '5%', left: '5%' };
            case 'bottom-center': return { ...baseStyle, bottom: '5%', left: '50%', transform: 'translate(-50%, 0)' };
            case 'bottom-right': return { ...baseStyle, bottom: '5%', right: '5%' };
            default: return { ...baseStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-40 flex items-center justify-center p-0 lg:p-4 backdrop-blur-xl">
            <div className="bg-white dark:bg-slate-900 w-full h-full lg:rounded-2xl flex flex-col text-slate-800 dark:text-white overflow-hidden shadow-2xl border-none lg:border border-slate-800">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0 bg-white dark:bg-slate-900 z-30">
                     <button onClick={onBack} className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-lg">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        <span>Back to Gallery</span>
                    </button>
                    <h2 className="text-xl font-bold truncate max-w-md hidden sm:block">{photo.title} {enhancedPhotoUrl ? '(AI Enhanced)' : ''}</h2>
                    <div className="w-48 hidden sm:block"></div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                    <div className="flex-1 relative bg-slate-100 dark:bg-black overflow-hidden flex items-center justify-center group">
                        
                        {/* Zoom/Pan Container */}
                        <div 
                            ref={imageContainerRef}
                            className="w-full h-full flex items-center justify-center relative overflow-hidden cursor-default"
                            onWheel={handleWheel}
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            style={{ touchAction: 'none' }} 
                        >
                            {/* Watermark Overlay */}
                            {watermarkSettings.enabled && watermarkSettings.imageUrl && (
                                <img src={watermarkSettings.imageUrl} style={getWatermarkStyle()} alt="" className="select-none pointer-events-none" />
                            )}

                            {/* The Photo */}
                            <img 
                                src={displayUrl} 
                                alt={photo.title} 
                                className="max-w-full max-h-full object-contain shadow-2xl transition-transform duration-100 select-none"
                                style={{
                                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                                    cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                }}
                                draggable={false}
                            />
                        </div>
                        
                        {/* Zoom Controls - Enhanced Visibility */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-black/70 backdrop-blur-xl rounded-full px-6 py-3 z-30 shadow-2xl border border-white/20 ring-1 ring-black/50">
                            <button onClick={handleZoomOut} className="p-2 text-white hover:text-blue-400 disabled:opacity-30 transition-colors active:scale-90" disabled={zoomLevel <= 1}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                            </button>
                            <span className="text-white font-mono text-lg font-bold w-14 text-center select-none">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={handleZoomIn} className="p-2 text-white hover:text-blue-400 disabled:opacity-30 transition-colors active:scale-90" disabled={zoomLevel >= 4}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                            </button>
                            <div className="w-px h-6 bg-white/20 mx-2"></div>
                            <button onClick={handleResetZoom} className="text-xs text-white font-bold hover:text-blue-400 uppercase tracking-wider active:scale-95">Reset</button>
                        </div>

                        {isAIEnhancing && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-40 backdrop-blur-sm animate-fadeIn">
                                <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                                <p className="text-white font-bold text-2xl animate-pulse">AI Processing...</p>
                                <p className="text-purple-200 text-sm mt-2">Enhancing details and lighting</p>
                            </div>
                        )}
                        
                        {enhancedPhotoUrl && !isAIEnhancing && (
                            <button 
                                onClick={() => setEnhancedPhotoUrl(null)}
                                className="absolute top-4 right-4 bg-black/60 text-white px-4 py-2 rounded-lg hover:bg-black/80 transition-colors backdrop-blur-md z-30 border border-white/20 font-semibold text-sm"
                            >
                                Revert Original
                            </button>
                        )}

                        {/* Nav Arrows */}
                        <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-black/40 rounded-full text-white hover:bg-black/70 transition-all backdrop-blur-md z-30 border border-white/10 hover:scale-110 active:scale-95 hidden sm:block">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-black/40 rounded-full text-white hover:bg-black/70 transition-all backdrop-blur-md z-30 border border-white/10 hover:scale-110 active:scale-95 hidden sm:block">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Order Sidebar */}
                    <aside className="w-full lg:w-96 bg-white dark:bg-slate-900 p-6 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 z-30 shadow-2xl">
                        <h3 className="text-2xl font-bold mb-6">Order Options</h3>
                        
                        <div className="space-y-6 flex-grow overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Format</label>
                                <div className="grid gap-3">
                                    {MOCK_PRINT_SIZES.map(s => (
                                        <button 
                                            key={s.size} 
                                            onClick={() => setSelectedSize(s.size)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedSize === s.size ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500 shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold">{s.size}</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(s.price)}</span>
                                            </div>
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
                             <button onClick={() => handleAddToCart('Normal')} className="w-full relative bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all">
                                Add Original to Cart
                                {normalInCart > 0 && <span className="absolute -top-2 -right-2 w-8 h-8 bg-white text-blue-600 text-sm font-extrabold rounded-full flex items-center justify-center border-2 border-blue-600 shadow-sm">{normalInCart}</span>}
                             </button>
                             
                             <div className="relative">
                                 <button 
                                    onClick={handleAIEnhance} 
                                    disabled={isAIEnhancing || !aiFeatureEnabled} 
                                    className={`w-full relative font-bold py-4 px-8 rounded-xl text-lg flex items-center justify-center transition-all border-2
                                        ${aiFeatureEnabled 
                                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 active:scale-[0.98] border-transparent' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                        }`}
                                 >
                                    {!aiFeatureEnabled ? (
                                        <span>{!isOnline ? "AI Offline" : "AI Disabled by Admin"}</span>
                                    ) : enhancedPhotoUrl ? (
                                        <span>Add Enhanced (+ {formatCurrency(currentPrice * 0.5)})</span>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                                            <span>AI Enhance Preview</span>
                                        </>
                                    )}
                                </button>
                                {aiInCart > 0 && <span className="absolute -top-2 -right-2 w-8 h-8 bg-white text-purple-600 text-sm font-extrabold rounded-full flex items-center justify-center border-2 border-purple-600 shadow-sm">{aiInCart}</span>}
                             </div>
                        </div>

                    </aside>
                </main>
            </div>
        </div>
    );
};

export default PhotoPreviewScreen;
