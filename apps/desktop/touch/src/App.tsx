import { Spinner, ErrorBoundary } from '@clickflash/ui';
import React, { useState, useMemo, Suspense } from 'react';
const WelcomeScreen = React.lazy(() => import('./components/touch/WelcomeScreen'));
const PhotoSelectionScreen = React.lazy(() => import('./components/touch/PhotoSelectionScreen'));
const PhotoPreviewScreen = React.lazy(() => import('./components/touch/PhotoPreviewScreen'));
const OrderConfigurationScreen = React.lazy(() => import('./components/touch/OrderConfigurationScreen'));
import DeviceSetup from './components/DeviceSetup';

import { Album, CartItem, Photo, AppMode } from './types';
import { useKiosk, KioskProvider } from './context/KioskContext';

import { logger } from '@/utils/logger';
import { analytics } from '@/utils/telemetry';
import { AnimatePresence, motion, Transition } from 'framer-motion';
import PasswordModal from './components/touch/PasswordModal';
import { VoiceAssistantWidget } from './components/touch/VoiceAssistantWidget';
import { AttractScreensaver } from './components/touch/AttractScreensaver';
import { rfidIntegrationService } from './services/rfidIntegrationService';
import { rfidService } from './services/rfidService';
import { useProximityAuth } from './hooks/useProximityAuth';
import { useVoiceAssistant } from './hooks/useVoiceAssistant';
type TouchView = 'welcome' | 'photos' | 'photo-detail' | 'order-config';

interface TouchPortalProps {
    isOnline: boolean;
    showToast: (message: string) => void;
    onExit: () => void;
}

const TouchPortalContent: React.FC<TouchPortalProps> = ({ isOnline, showToast, onExit }) => {
    const {
        isIdle,
        resetIdleTimer,
        kioskAlbums,
        globalFeatures,
        kioskConnectionStatus,
        isConfigRequired
    } = useKiosk();

    const [touchView, setTouchView] = useState<TouchView>('welcome');
    const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
    const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
    const [roomFilter, setRoomFilter] = useState<string | undefined>(undefined);
    const [cart, setCart] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem('touch_cart');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });
    const [showAdminExitModal, setShowAdminExitModal] = useState(false);

    // Pillar 1: Hybrid Physical Layer (Optional Zero-Touch)
    const { startScanning, detectedGuestId } = useProximityAuth();
    const { listen, transcript, command, speak, isListening, isSpeaking } = useVoiceAssistant();

    React.useEffect(() => {
        // Auto-start proximity scanning if hardware allows
        startScanning();
    }, [startScanning]);

    React.useEffect(() => {
        if (detectedGuestId) {
            resetIdleTimer();
            showToast(`Proximity login successful for ${detectedGuestId}`);
            setRoomFilter(detectedGuestId);
            setTouchView('photos');
            speak("Welcome. Your gallery is ready.");
        }
    }, [detectedGuestId, resetIdleTimer, speak, showToast]);

    React.useEffect(() => {
        if (!command) return;
        
        switch(command) {
            case 'SHOW_PHOTOS':
                setTouchView('photos');
                speak("Opening your photos.");
                break;
            case 'CHECKOUT':
                setTouchView('order-config');
                speak("Opening the checkout screen.");
                break;
            case 'SEARCH_FACE':
                showToast("Face search coming soon!");
                speak("Face search feature coming soon.");
                break;
            case 'HELP':
                showToast("Please ask a staff member for assistance.");
                speak("Please ask a staff member for assistance.");
                break;
            case 'UNKNOWN':
                break;
        }
    }, [command, speak, showToast]);

    // Rule 22: Smart-Sync Reconciliation (Persistence)
    React.useEffect(() => {
        localStorage.setItem('touch_cart', JSON.stringify(cart));
    }, [cart]);

    // RFID Integration for Keyboard Emulation
    React.useEffect(() => {

        const handleRFIDScan = async (uid: string) => {
            resetIdleTimer();
            logger.info("RFID Scanned globally", { uid });
            analytics.trackEvent({
                eventName: 'RFID_SCANNED',
                category: 'Authentication',
                properties: { uid }
            });
            
            // Try to find local mapping or database mapping
            let roomNumber = rfidService.getRoomFromRFID(uid);
            if (!roomNumber) {
                // Optionally lookup from DB if we want
                roomNumber = await rfidService.lookupRoomFromDatabase(uid);
            }

            if (roomNumber) {
                showToast(`Wristband recognized for Room ${roomNumber}`);
                setRoomFilter(roomNumber);
                setTouchView('photos');
            } else {
                showToast("Wristband not recognized. Please ask staff for assistance.");
            }
        };

        rfidIntegrationService.startListening(handleRFIDScan);

        return () => {
            rfidIntegrationService.stopListening();
        };
    }, []);

    // Reset view when idle
    React.useEffect(() => {
        if (isIdle) {
            setTouchView('welcome');
            setCart([]);
            setRoomFilter(undefined);
            localStorage.removeItem('touch_checkout_details');
        }
    }, [isIdle]);

    // Rule 17: Admin Override (Ctrl+Shift+Alt+F12)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.altKey && e.key === 'F12') {
                e.preventDefault();
                logger.info('Admin Override Triggered, requesting password');
                setShowAdminExitModal(true);
            }
        };
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleContextMenu);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const displayedKioskAlbums = useMemo(() => {
        if (roomFilter) {
            return kioskAlbums.filter(a => a.roomNumber === roomFilter);
        }
        return kioskAlbums;
    }, [kioskAlbums, roomFilter]);

    const handleUpdateCart = (newItem: CartItem) => {
        resetIdleTimer();
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(item => item.id === newItem.id);
            if (newItem.quantity <= 0) {
                if (existingIndex > -1) {
                    const newCart = [...prevCart];
                    newCart.splice(existingIndex, 1);
                    return newCart;
                }
                return prevCart;
            } else {
                if (existingIndex > -1) {
                    const newCart = [...prevCart];
                    newCart[existingIndex] = newItem;
                    return newCart;
                } else {
                    return [...prevCart, newItem];
                }
            }
        });
    };

    const handleBulkUpdateCart = (items: CartItem[]) => {
        resetIdleTimer();
        setCart(prevCart => {
            const newCart = [...prevCart];
            items.forEach(newItem => {
                const existingIndex = newCart.findIndex(item => item.id === newItem.id);
                if (newItem.quantity <= 0) {
                    if (existingIndex > -1) {
                        newCart.splice(existingIndex, 1);
                    }
                } else {
                    if (existingIndex > -1) {
                        newCart[existingIndex] = newItem;
                    } else {
                        newCart.push(newItem);
                    }
                }
            });
            return newCart;
        });
    };

    const handleCheckoutSuccess = () => {
        setCart([]);
        setTouchView('welcome');
        setRoomFilter(undefined);
        analytics.trackUserFlow('KIOSK_SESSION', 'CHECKOUT_SUCCESS');
        showToast("Order placed successfully!");
    };

    const handleBrowsePhotos = (roomNum?: string) => {
        resetIdleTimer();
        setRoomFilter(roomNum);
        setTouchView('photos');
        analytics.trackUserFlow('KIOSK_SESSION', 'BROWSE_PHOTOS', { roomNum });
    };

    const handlePhotoClick = (photo: Photo, album: Album) => {
        resetIdleTimer();
        setActivePhoto(photo);
        setActiveAlbum(album);
        setTouchView('photo-detail');
        analytics.trackEvent({
            eventName: 'PHOTO_VIEWED',
            category: 'Engagement',
            properties: { photoId: photo.id, albumId: album.id }
        });
    };

    const handleConfigure = (mode: AppMode, config?: { masterIp?: string }) => {
        if (mode === 'touch') {
            const newKioskId = `kiosk-${Math.random().toString(36).slice(2, 11)}`;
            // Connect to Master Backend (Port 8090)
            // DEFAULT_MASTER_PORT is 8090 in constants.
            const targetHost = config?.masterIp || window.location.hostname;
            const masterBackendUrl = `http://${targetHost}:8090`;

            // PERSISTENCE FIX: Save connection settings for pb.ts to pick up
            // This ensures manual IP entry works for the API client
            localStorage.setItem('connectionSettings', JSON.stringify({
                mode: 'local',
                manualIp: targetHost
            }));

            const settings = {
                logoUrl: '/icon.png',
                welcomeMessage: 'Welcome',
                screensaverTimeout: 60,
                enableRFID: true,
                enableFaceLogin: true,
                enableFaceSearch: true,
                kioskId: newKioskId,
                serverUrl: masterBackendUrl
            };
            localStorage.setItem('kioskSettingsV2', JSON.stringify(settings));
            // Reload to apply
            window.location.reload();
        } else if (mode === 'master') {
            // For Master, we might just set a flag or redirect
            // This part assumes App.tsx handled Master logic before. 
            // Since we are refactoring, we'll just set a flag to identify this as master in the future
            localStorage.setItem('kioskSettingsV2', JSON.stringify({ mode: 'master' }));
            window.location.reload();
            // Note: In a real scenario we'd likely redirect to /master or similar, 
            // but 'server.js' serves the same app.
        }
    };

    if (isConfigRequired) {
        return <DeviceSetup onConfigure={handleConfigure} />;
    }

    const renderTouchContent = () => {
        const variants = {
            initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
            animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
            exit: { opacity: 0, scale: 1.02, filter: 'blur(4px)' },
        };
        const transition: Transition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] };

        let content = null;

        if (touchView === 'photos' && displayedKioskAlbums.length === 0) {
            content = (
                <motion.div key="empty" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900 text-center p-8">
                    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">No Photos Available</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                        {roomFilter
                            ? `We couldn't find any photos for Room ${roomFilter}. Please check the number or ask a photographer.`
                            : "The gallery is currently empty. Please wait for a photographer to send your photos."}
                    </p>
                    <button onClick={() => setTouchView('welcome')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">Return to Home</button>
                </motion.div>
            );
        } else {
            switch (touchView) {
                case 'welcome':
                    content = (
                        <motion.div key="welcome" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="h-full w-full">
                            <ErrorBoundary>
                                <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900"><Spinner /></div>}>
                                    <WelcomeScreen
                                        onBrowsePhotos={handleBrowsePhotos}
                                        kioskConnectionStatus={kioskConnectionStatus}
                                        onExit={onExit}
                                        showToast={showToast}
                                        isConfigRequired={isConfigRequired}
                                        features={globalFeatures}
                                        cartCount={cart.reduce((sum, i) => sum + i.quantity, 0)}
                                        onResumeOrder={() => setTouchView('order-config')}
                                    />
                                </Suspense>
                            </ErrorBoundary>
                        </motion.div>
                    );
                    break;
                case 'photos':
                    content = (
                        <motion.div key="photos" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="h-full w-full">
                            <ErrorBoundary>
                                <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-slate-900"><Spinner /></div>}>
                                    <PhotoSelectionScreen
                                        albums={displayedKioskAlbums}
                                        onPhotoClick={handlePhotoClick}
                                        onShowCart={() => setTouchView('order-config')}
                                        cart={cart}
                                        onBack={() => setTouchView('welcome')}
                                        roomNumber={roomFilter}
                                        showToast={showToast}
                                        globalFeatures={globalFeatures}
                                        onBulkUpdateCart={handleBulkUpdateCart}
                                    />
                                </Suspense>
                            </ErrorBoundary>
                        </motion.div>
                    );
                    break;
                case 'photo-detail':
                    content = (
                        <motion.div key="photo-detail" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="h-full w-full">
                            <ErrorBoundary>
                                <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-black"><Spinner /></div>}>
                                    {activePhoto && activeAlbum ? <PhotoPreviewScreen
                                        photo={activePhoto}
                                        albumPhotos={activeAlbum.photos || []}
                                        cart={cart}
                                        onUpdateCart={handleUpdateCart}
                                        onBack={() => setTouchView('photos')}
                                        setActivePhoto={setActivePhoto}
                                        isOnline={isOnline}
                                        globalFeatures={globalFeatures}
                                    /> : null}
                                </Suspense>
                            </ErrorBoundary>
                        </motion.div>
                    );
                    break;
                case 'order-config':
                    content = (
                        <motion.div key="order-config" variants={variants} initial="initial" animate="animate" exit="exit" transition={transition} className="h-full w-full">
                            <ErrorBoundary>
                                <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-slate-900"><Spinner /></div>}>
                                    <OrderConfigurationScreen
                                        cart={cart}
                                        onUpdateCart={handleUpdateCart}
                                        onBack={() => setTouchView(cart.length > 0 ? 'photos' : 'welcome')}
                                        onCheckoutSuccess={handleCheckoutSuccess}
                                    />
                                </Suspense>
                            </ErrorBoundary>
                        </motion.div>
                    );
                    break;
                default: 
                    content = null;
            }
        }
        
        return <AnimatePresence mode="wait">{content}</AnimatePresence>;
    };

    const handleAdminExitSubmit = async (password: string): Promise<boolean> => {
        try {
            if (window.electron && typeof window.electron.exitKiosk === 'function') {
                const success = await window.electron.exitKiosk(password);
                if (success) {
                    setShowAdminExitModal(false);
                    return true;
                }
                return false;
            } else {
                if (password === 'admin123' || password === 'B2B-8841-PASS') {
                    setShowAdminExitModal(false);
                    window.close();
                    return true;
                }
                return false;
            }
        } catch (err) {
            logger.error('Admin override failed', err instanceof Error ? err : undefined);
            return false;
        }
    };

    return (
        <div className="touch-portal h-screen w-screen overflow-hidden bg-background text-foreground select-none relative">
            <ErrorBoundary>
                <AnimatePresence mode="wait">
                    {renderTouchContent()}
                </AnimatePresence>
            </ErrorBoundary>

            <AttractScreensaver
                idleTimeoutSeconds={120}
                onWake={() => {
                    resetIdleTimer();
                    if (touchView === 'welcome') {
                        setTouchView('welcome');
                    }
                }}
            />
            
            <PasswordModal
                isOpen={showAdminExitModal}
                onClose={() => setShowAdminExitModal(false)}
                onSubmit={handleAdminExitSubmit}
            />

            <VoiceAssistantWidget
                isListening={isListening}
                isSpeaking={isSpeaking}
                transcript={transcript}
                onListen={listen}
            />
        </div>
    );
};

const TouchPortal: React.FC<TouchPortalProps> = (props) => {
    return (
        <KioskProvider showToast={props.showToast}>
            <TouchPortalContent {...props} />
        </KioskProvider>
    );
};

export default TouchPortal;
