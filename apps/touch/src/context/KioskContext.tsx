import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import { apiService } from '../services/apiService';
import { syncService } from '../services/syncService';
import { webSocketService } from '../services/webSocketService';
import { pb } from '../services/pb';
import { offlineStorage } from '../services/offlineStorage';
import { Album, Photo, KioskSettings, Product, Pack } from '../types';
import { TIMEOUTS } from '../constants/timing';
import { LEGACY_KIOSK_ID } from '../constants';
import { PocketRecord } from '../services/pbTypes';
import { kioskConfig } from '../config/kioskConfig';
import { storageMonitor } from '../services/storageMonitor';

// Extend Window interface
declare global {
    interface Window {
        __kioskSessionHeartbeat?: number | NodeJS.Timeout | null;
    }
}

interface KioskContextType {
    kioskId: string | null;
    isIdle: boolean;
    idleTimeoutMs: number;
    kioskConnectionStatus: 'Connected' | 'Disconnected' | 'Offline';
    globalFeatures: { ai: boolean; face: boolean; watermark: boolean };
    kioskAlbums: Album[];
    products: Product[];
    packs: Pack[];
    refreshProductData: () => Promise<void>;
    resetIdleTimer: () => void;
    isConfigRequired: boolean;
    showToast: (msg: string) => void;
}

const KioskContext = createContext<KioskContextType | undefined>(undefined);

export const useKiosk = () => {
    const context = useContext(KioskContext);
    if (!context) {
        throw new Error('useKiosk must be used within a KioskProvider');
    }
    return context;
};

interface KioskProviderProps {
    children: React.ReactNode;
    showToast: (msg: string) => void;
}

export const KioskProvider: React.FC<KioskProviderProps> = ({ children, showToast }) => {
    const [kioskId, setKioskId] = useState<string | null>(null);
    const [isIdle, setIsIdle] = useState(false);
    const [idleTimeoutMs, setIdleTimeoutMs] = useState<number>(TIMEOUTS.IDLE_TIMEOUT);

    // Split States
    const [localHealth, setLocalHealth] = useState<boolean>(false);
    const [masterStatus, setMasterStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');

    // Derived Global Status
    const kioskConnectionStatus = useMemo<'Connected' | 'Disconnected' | 'Offline'>(() => {
        if (!localHealth) return 'Offline'; // Local DB issue takes precedence (System Offline)
        if (masterStatus === 'Disconnected') return 'Disconnected'; // Local OK, but Master Unreachable
        return 'Connected'; // All Systems Go
    }, [localHealth, masterStatus]);

    const [globalFeatures, setGlobalFeatures] = useState({ ai: true, face: true, watermark: true });
    const [kioskAlbums, setKioskAlbums] = useState<Album[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [packs, setPacks] = useState<Pack[]>([]);
    const [isConfigRequired, setIsConfigRequired] = useState(false);

    // Refs
    const idleTimerRef = useRef<number | null>(null);
    const blobUrlsRef = useRef<Set<string>>(new Set());

    // --- Idle Logic ---
    const resetIdleTimer = useCallback(() => {
        if (isIdle) setIsIdle(false);
        if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);

        if (idleTimeoutMs > 0) {
            idleTimerRef.current = window.setTimeout(() => {
                setIsIdle(true);
            }, idleTimeoutMs);
        }
    }, [isIdle, idleTimeoutMs]);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'pointerdown', 'pointermove'];
        const handleActivity = () => resetIdleTimer();
        const handleContextMenu = (e: Event) => e.preventDefault();

        events.forEach(event => window.addEventListener(event, handleActivity));
        window.addEventListener('contextmenu', handleContextMenu);

        resetIdleTimer();
        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            window.removeEventListener('contextmenu', handleContextMenu);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    // --- Photo Hydration Helper ---
    const hydrateKioskAlbum = useCallback((album: Album): Album => {
        if (!album || !album.photos) return album;

        let coverPhotoUrl = album.coverPhotoUrl;
        const hydratedPhotos = album.photos
            .map(p => {
                if (!p || !p.id) {
                    // logger.warn("[Kiosk] Invalid photo in album", { albumId: album.id, photo: p });
                    return null;
                }

                // Handle Blob URL conversion
                if (p.url instanceof Blob) {
                    try {
                        if (p.url.size === 0) return null;
                        const blobUrl = URL.createObjectURL(p.url);
                        blobUrlsRef.current.add(blobUrl);
                        return { ...p, url: blobUrl };
                    } catch (e) { return null; }
                }

                // Handle legacy blob property
                const photoWithBlob = p as Photo & { blob?: Blob };
                if (photoWithBlob.blob instanceof Blob) {
                    try {
                        if (photoWithBlob.blob.size === 0) return null;
                        const blobUrl = URL.createObjectURL(photoWithBlob.blob);
                        blobUrlsRef.current.add(blobUrl);
                        return { ...p, url: blobUrl };
                    } catch (e) { return null; }
                }

                if (typeof p.url === 'string' && p.url.length > 0) {
                    if (!p.url.startsWith('http') && !p.url.startsWith('blob:') && !p.url.startsWith('data:')) {
                        const photoRecord = p as Photo & { collectionId?: string };
                        const photoWithCollection = { ...p, collectionId: photoRecord.collectionId || 'photos' };
                        const fullUrl = pb.files.getUrl(photoWithCollection, p.url);
                        return { ...p, url: fullUrl };
                    }
                    return p;
                }
                return null;
            })
            .filter((p): p is Photo => p !== null);

        if (hydratedPhotos.length > 0) {
            if (!coverPhotoUrl || (!coverPhotoUrl.startsWith('http') && !coverPhotoUrl.startsWith('blob:') && !coverPhotoUrl.startsWith('data:'))) {
                coverPhotoUrl = hydratedPhotos[0].url;
            }
        }
        return { ...album, photos: hydratedPhotos, coverPhotoUrl };
    }, []);

    // --- Product Data Refresh ---
    const refreshProductData = useCallback(async () => {
        try {
            const [fetchedProducts, fetchedPacks] = await Promise.all([
                apiService.getProducts(),
                apiService.getPacks()
            ]);
            setProducts(fetchedProducts);
            setPacks(fetchedPacks);
            logger.info("[Kiosk] Product data refreshed", { productCount: fetchedProducts.length, packCount: fetchedPacks.length });
        } catch (error) {
            logger.warn("[Kiosk] Failed to refresh product data", { error: error instanceof Error ? error.message : String(error) });
        }
    }, []);

    // --- Setup Logic ---
    useEffect(() => {
        let isSubscribed = true;
        let healthInterval: number;

        const setupKiosk = async () => {
            const params = new URLSearchParams(window.location.search);
            const pairCode = params.get('pair');
            const specificId = params.get('id');
            let currentKioskId = '';

            // --- KIOSK ID SETUP ---
            let finalKioskId = '';

            // 1. URL Override (Priority)
            if (specificId) {
                finalKioskId = specificId;
            }
            // 2. Check LocalStorage
            else {
                try {
                    // Check V2 Settings
                    const savedSettingsRaw = localStorage.getItem('kioskSettingsV2');
                    if (savedSettingsRaw) {
                        const saved = JSON.parse(savedSettingsRaw);
                        if (saved.kioskId && saved.kioskId !== LEGACY_KIOSK_ID) {
                            finalKioskId = saved.kioskId;
                        } else if (saved.kioskId === LEGACY_KIOSK_ID) {
                            logger.info(`[KioskSetup] PURGING '${LEGACY_KIOSK_ID}' from kioskSettingsV2`);
                            saved.kioskId = undefined; // Clear it so it doesn't persist
                            localStorage.setItem('kioskSettingsV2', JSON.stringify(saved));
                        }
                    }

                    // Check Legacy Key (and purge if 123)
                    if (!finalKioskId) {
                        const legacyId = localStorage.getItem('kioskId');
                        if (legacyId === LEGACY_KIOSK_ID) {
                            logger.info(`[KioskSetup] PURGING '${LEGACY_KIOSK_ID}' from legacy kioskId`);
                            localStorage.removeItem('kioskId');
                        } else if (legacyId) {
                            finalKioskId = legacyId;
                        }
                    }
                } catch (e) { }
            }

            // 3. Fallback: Auto-Generate if we have no ID (or just purged 123)
            if (!finalKioskId) {
                // Generate a stable ID for this device (Legacy Format)
                finalKioskId = `kiosk-${Math.random().toString(36).slice(2, 11)}`;
                logger.info(`[KioskSetup] Generated NEW Kiosk ID: ${finalKioskId}`);
            }

            currentKioskId = finalKioskId;

            // Show ID to user to allow Manual Registration on Master
            // Always show if it's not 123 (which we are now purging)
            if (currentKioskId && currentKioskId !== LEGACY_KIOSK_ID) {
                setTimeout(() => showToast(`Kiosk ID: ${currentKioskId}`), 1000);
            }

            // 4. Persistence: Force save the NEW ID immediately
            try {
                const existingRaw = localStorage.getItem('kioskSettingsV2');
                const settings = existingRaw ? JSON.parse(existingRaw) : {};

                if (settings.kioskId !== finalKioskId) {
                    logger.info(`[KioskSetup] Persisting CORRECTED Kiosk ID: ${finalKioskId}`);
                    settings.kioskId = finalKioskId;
                    settings.serverUrl = settings.serverUrl || `http://${window.location.hostname}:8090`;
                    localStorage.setItem('kioskSettingsV2', JSON.stringify(settings));
                }
                localStorage.setItem('kioskId', finalKioskId); // Legacy fallback
            } catch (e) { }

            logger.info(`[KioskSetup] Final Kiosk ID: ${currentKioskId}`);

            // QR Pairing (still relevant for initial setup of other settings)
            if (pairCode === 'true') {
                let parsedExisting: Partial<KioskSettings> = {};
                const existingSettingsRaw = localStorage.getItem('kioskSettingsV2');
                if (existingSettingsRaw) {
                    try {
                        parsedExisting = JSON.parse(existingSettingsRaw) as Partial<KioskSettings>;
                    } catch (e) { }
                }

                const currentHost = window.location.hostname;
                const masterBackendUrl = `http://${currentHost}:8090`;

                const mergedSettings = {
                    logoUrl: '/icon.png',
                    welcomeMessage: 'Welcome',
                    screensaverTimeout: 60,
                    enableRFID: true,
                    enableFaceLogin: true,
                    enableFaceSearch: true,
                    ...parsedExisting,
                    kioskId: currentKioskId, // Use the determined currentKioskId
                    serverUrl: parsedExisting.serverUrl || masterBackendUrl,
                };

                localStorage.setItem('kioskSettingsV2', JSON.stringify(mergedSettings));

                // Force Local Backend for PB instance
                const localBackendUrl = `http://localhost:8091`; // Default Touch Backend Port (Matches server.ts)
                if (pb.baseUrl !== localBackendUrl) {
                    pb.baseUrlValue = localBackendUrl;
                }

                const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mode=touch`;
                window.history.replaceState({ path: newUrl }, '', newUrl);

                showToast(`Kiosk Paired! ID: ${currentKioskId}`);
            }

            // Load Settings (Legacy Logic: DB Priority)
            const savedSettingsRaw = localStorage.getItem('kioskSettingsV2');
            let savedSettings: Partial<KioskSettings> | null = null;
            if (savedSettingsRaw) {
                try {
                    savedSettings = JSON.parse(savedSettingsRaw);
                    // Use configured Master URL if available, otherwise fallback to auto-detection
                    let masterUrl = savedSettings?.serverUrl;

                    // Auto-detect dev environment: If we are on localhost:517x (Vite), Master is likely on 8090
                    if (!masterUrl) {
                        const currentPort = window.location.port;
                        if (currentPort === '5173' || currentPort === '5174') {
                            masterUrl = `${window.location.protocol}//${window.location.hostname}:8090`;
                        } else {
                            masterUrl = window.location.origin;
                        }
                    }
                    if (savedSettings && savedSettings.screensaverTimeout !== undefined) {
                        const timeoutSecs = Number(savedSettings.screensaverTimeout);
                        setIdleTimeoutMs(timeoutSecs > 0 ? timeoutSecs * 1000 : 0);
                    }
                } catch (e) { }
            }

            // Skip valid check - we know LEGACY_KIOSK_ID is valid
            setKioskId(currentKioskId);
            setIsConfigRequired(false);
            apiService.sendKioskHeartbeat(currentKioskId);

            // Sync Service
            try {
                // FORCE MASTER PORT 8090
                // We trust the hostname from settings, but we strictly enforce Port 8090 for Master Backend
                let masterIp = localStorage.getItem('masterLocalIPAddress');
                if (savedSettings?.serverUrl) {
                    try {
                        const url = new URL(savedSettings.serverUrl);
                        masterIp = url.hostname;
                        // Auto-correct saved URL if port is wrong
                        if (url.port !== '8090') {
                            logger.info("[Kiosk] Correcting Master Port to 8090");
                            savedSettings.serverUrl = `${url.protocol}//${url.hostname}:8090`;
                            localStorage.setItem('kioskSettingsV2', JSON.stringify(savedSettings));
                        }
                    } catch (e) { }
                }

                if (masterIp) {
                    syncService.updateMasterIp(masterIp); // SyncService internally appends :8090
                    syncService.sync();
                    logger.info("[Kiosk] Initial sync started", { masterIp });
                }
            } catch (syncError) {
                logger.warn("[Kiosk] Failed to start auto-sync service", {
                    error: syncError instanceof Error ? syncError.message : String(syncError)
                });
            }

            // Feature Flags
            try {
                const users = await apiService.getUsers();
                if (users.length > 0 && users[0].destinationId) {
                    const dests = await apiService.getDestinations();
                    const currentDest = dests.find(d => d.id === users[0].destinationId);
                    if (currentDest && currentDest.features) {
                        setGlobalFeatures(currentDest.features);
                    }
                }
            } catch (e) {
                logger.warn("Failed to fetch destination features", { error: e instanceof Error ? e.message : String(e) });
            }

            // --- OFFLINE FIRST STRATEGY ---

            // Cache Version Check
            const CACHE_VERSION = '2025-12-12-v4-urlfix';
            const storedVersion = localStorage.getItem('cacheVersion');
            if (storedVersion !== CACHE_VERSION) {
                logger.info('[Kiosk] Cache version mismatch, clearing offline storage');
                await offlineStorage.clearAll();
                localStorage.setItem('cacheVersion', CACHE_VERSION);
            }

            // 1. Load from Local Cache (IndexedDB)
            try {
                const initialAlbums = await offlineStorage.getAlbums();
                if (initialAlbums && initialAlbums.length > 0) {
                    logger.info(`[Kiosk] Loaded albums from offline cache`, { count: initialAlbums.length, kioskId: currentKioskId });
                    const hydratedAlbums = initialAlbums.map((a: Album) => hydrateKioskAlbum(a));
                    setKioskAlbums(hydratedAlbums);
                }
            } catch (error) {
                logger.warn("[Kiosk] Failed to load offline albums", {
                    error: error instanceof Error ? error.message : String(error)
                });
            }

            // 2. Attempt to Sync with Master (Online)
            try {
                const records = await pb.collection('albums').getFullList({
                    sort: '-created',
                    expand: 'photos_via_album',
                    filter: 'kiosk_ready=1'
                });

                if (records.length > 0 && isSubscribed) {
                    interface AlbumRecord extends PocketRecord {
                        title: string; date: string; photographerId: number; roomNumber: string;
                        expand?: { photos_via_album?: Array<PocketRecord & { title: string; url: string }> };
                    }

                    const mappedAlbums: Album[] = records.map((record: AlbumRecord) => ({
                        id: record.id,
                        title: record.title,
                        date: record.date,
                        photographerId: record.photographerId,
                        roomNumber: record.roomNumber,
                        source: 'PB',
                        coverPhotoUrl: '',
                        photos: (record.expand?.photos_via_album || []).map((p) => {
                            const photoWithCollection = { ...p, collectionId: p.collectionId || 'photos' };
                            return {
                                id: p.id,
                                title: p.title,
                                photographerId: record.photographerId,
                                url: pb.files.getUrl(photoWithCollection, p.url)
                            };
                        })
                    }));
                    mappedAlbums.forEach(a => { if (a.photos.length > 0) a.coverPhotoUrl = a.photos[0].url; });

                    setKioskAlbums(mappedAlbums);
                    offlineStorage.saveAlbums(mappedAlbums);
                }
            } catch (pbError: unknown) {
                const errorMessage = (pbError as { message?: string })?.message 
                    || (pbError instanceof Error ? pbError.message : String(pbError));
                if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
                    logger.warn("[Kiosk] Auth error detected, attempting auto-relogin...");
                    try {
                        pb.authStore.clear();
                        localStorage.removeItem('authToken');
                        
                        // Use configured credentials for auto-login
                        if (kioskConfig.autoLogin.enabled) {
                            await pb.login(kioskConfig.autoLogin.email, kioskConfig.autoLogin.password);
                            logger.info("[Kiosk] Auto-relogin successful");
                            setTimeout(() => window.location.reload(), 500);
                            return;
                        } else {
                            logger.warn("[Kiosk] Auto-login not configured, skipping");
                        }
                    } catch (loginErr) {
                        logger.error("[Kiosk] Auto-relogin failed", loginErr instanceof Error ? loginErr : undefined);
                    }
                }
                logger.warn("[Kiosk] Online sync failed, staying on offline cache", { error: errorMessage });
            }

            const realtimeReceivedAlbums = new Set<string>();

            // 3. Setup Realtime Listeners
            try {
                pb.collection('albums').subscribe('*', async (e) => {
                    if (!isSubscribed) return;

                    try {
                        if (e.action === 'create' || e.action === 'update') {
                            const albumId = e.record.id;
                            
                            // Prevent unbounded memory growth in long-running kiosk
                            if (realtimeReceivedAlbums.size > 1000) {
                                realtimeReceivedAlbums.clear();
                            }
                            realtimeReceivedAlbums.add(albumId);

                            const fetchPromise = pb.collection('albums').getOne(albumId, { expand: 'photos_via_album' });
                            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Album fetch timeout')), TIMEOUTS.KIOSK_SYNC_INTERVAL));

                            let record: any;
                            try {
                                record = await Promise.race([fetchPromise, timeoutPromise]);
                                if (!record.kiosk_ready) return;
                            } catch (fetchError) {
                                logger.error("[Kiosk] Failed to fetch album in realtime listener", fetchError instanceof Error ? fetchError : undefined);
                                return;
                            }

                            const newAlbum: Album = {
                                id: record.id, title: record.title, date: record.date, photographerId: record.photographerId,
                                source: 'PB', coverPhotoUrl: '', roomNumber: record.roomNumber,
                                photos: (record.expand?.photos_via_album || []).map((p: any) => {
                                    const photoWithCollection = { ...p, collectionId: p.collectionId || 'photos' };
                                    return {
                                        id: p.id, title: p.title, photographerId: record.photographerId,
                                        url: pb.files.getUrl(photoWithCollection, p.url)
                                    };
                                })
                            };
                            if (newAlbum.photos.length > 0) newAlbum.coverPhotoUrl = newAlbum.photos[0].url;

                            if (isSubscribed) {
                                syncService.markAlbumReceivedViaRealtime(newAlbum.id);
                                setKioskAlbums(prev => {
                                    const exists = prev.find(a => a.id === newAlbum.id);
                                    let newAlbums;
                                    if (exists) newAlbums = prev.map(a => a.id === newAlbum.id ? newAlbum : a);
                                    else newAlbums = [newAlbum, ...prev];
                                    offlineStorage.saveAlbums(newAlbums);
                                    return newAlbums;
                                });
                                showToast("New photos received!");
                            }
                        }
                    } catch (error) {
                        logger.error("[Kiosk] Error processing realtime album event", error instanceof Error ? error : undefined);
                    }
                });
            } catch (err) {
                logger.error("[Kiosk] Failed to setup realtime listeners", err instanceof Error ? err : undefined);
            }

            // Connect to Master's WebSocket server
            // FORCE PORT 8090 + /ws path
            let masterWsUrl = 'ws://localhost:8090/ws';
            if (savedSettings?.serverUrl) {
                try {
                    const serverUrl = new URL(savedSettings.serverUrl);
                    masterWsUrl = `ws://${serverUrl.hostname}:8090/ws`;
                } catch (urlError) { }
            }

            logger.info(`[KioskSetup] Connecting to Master WebSocket at: ${masterWsUrl}`, {
                savedSettingsUrl: savedSettings?.serverUrl,
                finalUrl: masterWsUrl
            });

            // Fetch local paths
            let ordersFolderPath = '';
            try {
                // Try grabbing from local DB settings via PB
                // We initialized 'touchOrdersFolder' in server.ts
                logger.info("[KioskSetup] Attempting to fetch touchOrdersFolder from Local Backend", { url: pb.baseUrl });

                const setting = await pb.collection('settings').getFirstListItem('key="touchOrdersFolder"').catch((err) => {
                    logger.warn("[KioskSetup] Failed to fetch touchOrdersFolder setting", { error: err.message });
                    return null;
                });

                if (setting && setting.value) {
                    try {
                        const parsed = JSON.parse(setting.value);
                        ordersFolderPath = parsed.path || '';
                        logger.info("[KioskSetup] Successfully loaded ordersFolderPath", { path: ordersFolderPath });
                    } catch (parseErr) {
                        logger.warn("[KioskSetup] Failed to parse touchOrdersFolder value", { value: setting.value });
                        ordersFolderPath = setting.value; // Fallback to raw string
                    }
                } else {
                    logger.warn("[KioskSetup] touchOrdersFolder setting not found or empty");
                }
            } catch (e: any) {
                logger.error("[KioskSetup] Critical error fetching ordersFolderPath", { error: e.message });
            }

            webSocketService.connect(
                { type: 'kiosk', kioskId: currentKioskId, ordersFolderPath },
                (data: unknown) => {
                    if (!isSubscribed) return;
                    try {
                        const message = data as { type?: string; payload?: unknown; collection?: string };
                        if (message.type === 'NEW_ALBUM_FOR_KIOSK' && isSubscribed) {
                            const albumPayload = message.payload as Album;
                            if (!albumPayload || !albumPayload.id) return;

                            try {
                                const hydratedAlbum = hydrateKioskAlbum(albumPayload);
                                syncService.markAlbumReceivedViaRealtime(hydratedAlbum.id);

                                setKioskAlbums(prevAlbums => {
                                    const exists = prevAlbums.find(a => a.id === hydratedAlbum.id);
                                    let newAlbums;
                                    if (exists) newAlbums = prevAlbums.map(a => a.id === hydratedAlbum.id ? hydratedAlbum : a);
                                    else newAlbums = [hydratedAlbum, ...prevAlbums];
                                    offlineStorage.saveAlbums(newAlbums);
                                    return newAlbums;
                                });
                                showToast("New photos have arrived!");
                            } catch (e) { }
                        }

                        // BROADCAST_DATA_REFRESH support for Products & Packs
                        if (message.type === 'BROADCAST_DATA_REFRESH') {
                            const collection = message.collection;
                            if (collection === 'products' || collection === 'packs') {
                                logger.info(`[Kiosk] Received broadcast refresh for ${collection}`);
                                refreshProductData();
                            }
                        }
                    } catch (e) { }
                },
                async (status) => {
                    if (!isSubscribed) return;

                    // UPDATE MASTER STATUS STATE
                    setMasterStatus(status);

                    // Kiosk SessionHeartbeat Logic
                    if (status === 'Connected') {
                        try {
                            const kId = localStorage.getItem('kioskId');
                            if (kId) {
                                try {
                                    const existing = await pb.collection('kiosk_sessions').getFirstListItem(`kioskId="${kId}"`);
                                    await pb.collection('kiosk_sessions').update(existing.id, { lastSeen: new Date().toISOString() });
                                } catch {
                                    await pb.collection('kiosk_sessions').create({ kioskId: kId, lastSeen: new Date().toISOString() });
                                }

                                const interval = setInterval(async () => {
                                    try {
                                        const existing = await pb.collection('kiosk_sessions').getFirstListItem(`kioskId="${kId}"`);
                                        await pb.collection('kiosk_sessions').update(existing.id, { lastSeen: new Date().toISOString() });
                                    } catch (err: any) {
                                        // Silent fail is acceptable for heartbeat, but good to debug
                                        // logger.debug("Heartbeat update failed (minor)", err); 
                                    }
                                }, TIMEOUTS.HEARTBEAT_INTERVAL);
                                window.__kioskSessionHeartbeat = interval;
                            }
                        } catch (err) { logger.error("Heartbeat setup error", err instanceof Error ? err : undefined); }
                    } else {
                        if (window.__kioskSessionHeartbeat) {
                            clearInterval(window.__kioskSessionHeartbeat);
                            window.__kioskSessionHeartbeat = null;
                        }
                    }
                },
                undefined, undefined, masterWsUrl
            );

            // Initial Product Fetch
            refreshProductData();
        };

        setupKiosk();

        const checkConnectivity = async () => {
            try {
                // Explicitly check pb.baseUrl to debug mismatch
                if (pb.baseUrl !== 'http://localhost:8091') {
                    // logger.warn("[KioskContext] Correcting pb.baseUrl logic mismatch", { current: pb.baseUrl, expected: 'http://localhost:8091' });
                    // Re-enforce
                    pb.baseUrlValue = 'http://localhost:8091';
                }

                const health = await pb.health.check();
                setLocalHealth(health.code === 200);
            } catch (err: any) {
                logger.error("[KioskContext] Local Health Check Failed", {
                    message: err.message,
                    baseUrl: pb.baseUrl,
                    error: err
                });
                setLocalHealth(false);
            }
        };
        checkConnectivity();
        healthInterval = window.setInterval(checkConnectivity, TIMEOUTS.HEARTBEAT_INTERVAL);

        return () => {
            clearInterval(healthInterval);
            isSubscribed = false;
            pb.collection('albums').unsubscribe('*');
            if (webSocketService.status === 'Connected') webSocketService.disconnect();
            syncService.stopSyncLoop();
            if (window.__kioskSessionHeartbeat) {
                clearInterval(window.__kioskSessionHeartbeat);
                window.__kioskSessionHeartbeat = null;
            }
        };
    }, [showToast, hydrateKioskAlbum, setMasterStatus, setLocalHealth, setKioskAlbums, setKioskId, setIsConfigRequired, setGlobalFeatures, setIdleTimeoutMs]);

    // Cleanup blob URLs and handle page unload
    useEffect(() => {
        // Start storage monitoring
        if (kioskConfig.features.debug) {
            storageMonitor.startMonitoring(60000); // Check every minute in debug mode
        }

        // Handle page unload/refresh
        const handleBeforeUnload = () => {
            // Revoke all blob URLs to prevent memory leaks
            blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
            blobUrlsRef.current.clear();
            
            // Stop storage monitoring
            storageMonitor.stopMonitoring();
            
            // Clear heartbeat interval
            if (window.__kioskSessionHeartbeat) {
                clearInterval(window.__kioskSessionHeartbeat);
                window.__kioskSessionHeartbeat = null;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Handle visibility change (app switching)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // App went to background - could clean up non-visible resources
                logger.debug('[Kiosk] App backgrounded');
            } else {
                // App came to foreground
                logger.debug('[Kiosk] App foregrounded');
                // Check storage health when coming back
                storageMonitor.isHealthy().then(healthy => {
                    if (!healthy) {
                        logger.warn('[Kiosk] Storage health check failed on foreground');
                    }
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            handleBeforeUnload(); // Run cleanup on unmount
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const value = {
        kioskId, isIdle, idleTimeoutMs, kioskConnectionStatus, globalFeatures, kioskAlbums,
        products, packs, refreshProductData,
        resetIdleTimer, isConfigRequired, showToast
    };

    return (
        <KioskContext.Provider value={value}>
            {children}
        </KioskContext.Provider>
    );
};
