import { isCloudMode } from '../utils/appMode';
import { logger } from '@/utils/logger';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

interface NetworkState {
    isOnline: boolean;
    quality: NetworkQuality;
    latency: number; // ms
    lastChecked: number;
}

class NetworkManager {
    private static instance: NetworkManager;
    private state: NetworkState = {
        isOnline: navigator.onLine,
        quality: navigator.onLine ? 'good' : 'offline',
        latency: 0,
        lastChecked: Date.now(),
    };

    private listeners: Set<(state: NetworkState) => void> = new Set();
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly PING_URL = '/api/health'; // Standard health check endpoint

    private constructor() {
        window.addEventListener('online', () => this.handleConnectivityChange(true));
        window.addEventListener('offline', () => this.handleConnectivityChange(false));

        if (isCloudMode) {
            this.startMonitoring();
        }
    }

    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    private handleConnectivityChange(online: boolean) {
        this.updateState({
            isOnline: online,
            quality: online ? 'good' : 'offline',
            latency: online ? this.state.latency : 0
        });

        if (online && isCloudMode) {
            this.checkNetworkQuality();
        }
    }

    private startMonitoring() {
        if (this.checkInterval) return;

        // Initial check
        this.checkNetworkQuality();

        // Dynamic interval based on quality
        this.checkInterval = setInterval(() => {
            this.checkNetworkQuality();
        }, this.getIntervalForQuality());
    }

    private getIntervalForQuality(): number {
        switch (this.state.quality) {
            case 'excellent': return 60000; // 1 min
            case 'good': return 30000;      // 30s
            case 'fair': return 15000;      // 15s
            case 'poor': return 5000;       // 5s
            default: return 10000;
        }
    }

    public async checkNetworkQuality(): Promise<void> {
        if (!navigator.onLine) {
            this.updateState({ isOnline: false, quality: 'offline', latency: 0 });
            return;
        }

        const start = performance.now();
        try {
            // Use a small fetch to measure latency
            const response = await fetch(this.PING_URL, {
                method: 'HEAD',
                cache: 'no-store',
                mode: 'no-cors' // Use no-cors to avoid preflight if needed, or just HEAD
            });

            if (!response.ok && response.status !== 0) {
                // status 0 is expected for opaque responses with no-cors if not same-origin
            }

            const end = performance.now();
            const latency = Math.round(end - start);

            this.updateState({
                isOnline: true,
                latency,
                quality: this.assessQuality(latency),
                lastChecked: Date.now()
            });
        } catch (error) {
            logger.warn('Network quality check failed:', error);
            // Don't mark offline immediately unless navigator says so, 
            // but degrade quality if fetch fails
            this.updateState({
                quality: 'poor',
                latency: 0,
                lastChecked: Date.now()
            });
        }
    }

    private assessQuality(latency: number): NetworkQuality {
        if (latency < 150) return 'excellent';
        if (latency < 400) return 'good';
        if (latency < 1000) return 'fair';
        return 'poor';
    }

    private updateState(newState: Partial<NetworkState>) {
        this.state = { ...this.state, ...newState };
        this.notify();

        // Adjust monitoring interval if it changed significantly
        if (isCloudMode && this.checkInterval) {
            // Logic to restart interval if quality changed
        }
    }

    private notify() {
        this.listeners.forEach(l => l(this.state));
    }

    public subscribe(listener: (state: NetworkState) => void) {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    public getState() {
        return this.state;
    }

    public getAdaptiveTimeout(baseTimeout: number = 10000): number {
        switch (this.state.quality) {
            case 'excellent': return baseTimeout;
            case 'good': return baseTimeout * 1.5;
            case 'fair': return baseTimeout * 3;
            case 'poor': return baseTimeout * 6;
            case 'offline': return 1000;
            default: return baseTimeout;
        }
    }
}

export const networkManager = NetworkManager.getInstance();
