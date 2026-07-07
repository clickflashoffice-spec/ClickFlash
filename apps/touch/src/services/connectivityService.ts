/**
 * Connectivity Service
 *
 * Proactively detects network connectivity to the Master station.
 * Combines browser `navigator.onLine` with active health probes for accurate state.
 *
 * Features:
 * - Coarse detection via `navigator.onLine`
 * - Fine-grained detection via periodic Master health probes
 * - Event-driven: emits `online`/`offline` events for subscribers
 * - Debounced to prevent rapid state flapping
 *
 * Usage:
 *   connectivityService.start();
 *   connectivityService.subscribe((isOnline) => { ... });
 *   connectivityService.stop();
 */

import { logger } from '../utils/logger';

type ConnectivityListener = (isOnline: boolean) => void;

class ConnectivityService {
    private masterUrl: string | null = null;
    private listeners: ConnectivityListener[] = [];
    private probeTimer: ReturnType<typeof setTimeout> | null = null;
    private isOnline = navigator.onLine;
    private readonly PROBE_INTERVAL = 10000; // 10s when offline
    private readonly PROBE_TIMEOUT = 5000;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly DEBOUNCE_MS = 2000;

    constructor() {
        const savedIp = localStorage.getItem('masterLocalIPAddress');
        if (savedIp) {
            this.masterUrl = `http://${savedIp}:8090`;
        }
    }

    public updateMasterUrl(ip: string): void {
        this.masterUrl = `http://${ip}:8090`;
    }

    public start(): void {
        window.addEventListener('online', this.handleBrowserOnline);
        window.addEventListener('offline', this.handleBrowserOffline);

        if (!this.masterUrl) {
            this.startAutoDiscovery();
        }

        // If browser thinks we're online, verify with a probe
        if (this.isOnline) {
            this.probe();
        } else {
            this.startProbing();
        }
    }

    public stop(): void {
        window.removeEventListener('online', this.handleBrowserOnline);
        window.removeEventListener('offline', this.handleBrowserOffline);
        if (this.probeTimer) {
            clearTimeout(this.probeTimer);
            this.probeTimer = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    public subscribe(listener: ConnectivityListener): () => void {
        this.listeners.push(listener);
        listener(this.isOnline);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public getIsOnline(): boolean {
        return this.isOnline;
    }

    public async startAutoDiscovery(): Promise<void> {
        logger.info('[Connectivity] Starting auto-discovery...');

        // Check if Electron IPC bridge is available
        if (typeof window !== 'undefined' && (window as any).electronAPI?.startUdpDiscovery) {
            try {
                const masterInfo = await (window as any).electronAPI.startUdpDiscovery();
                if (masterInfo && masterInfo.host) {
                    logger.info(`[Connectivity] Auto-discovered Master via UDP at ${masterInfo.host}`);
                    localStorage.setItem('masterLocalIPAddress', masterInfo.host);
                    this.updateMasterUrl(masterInfo.host);
                    this.probe();
                    return;
                }
            } catch (error) {
                logger.warn('[Connectivity] UDP Discovery failed', { error: (error as Error).message });
            }
        } else {
            // Fallback for browser mode: Sweep common local subnet IPs (192.168.1.1 to .254)
            logger.info('[Connectivity] Browser mode detected, falling back to subnet sweep...');
            const controller = new AbortController();
            const sweepTimeout = setTimeout(() => controller.abort(), 1500);

            // Using common LAN defaults as a fallback when UDP isn't available
            const commonIps = Array.from({length: 254}, (_, i) => `192.168.1.${i + 1}`);
            // Also add .0. subnet
            const subnet0 = Array.from({length: 254}, (_, i) => `192.168.0.${i + 1}`);
            
            const sweepPromises = [...commonIps, ...subnet0].map(async (ip) => {
                try {
                    const res = await fetch(`http://${ip}:8090/api/health`, {
                        method: 'HEAD',
                        signal: controller.signal
                    });
                    if (res.ok) {
                        return ip;
                    }
                } catch {
                    return null;
                }
                return null;
            });

            try {
                // Wait for the first successful response (which won't be null)
                const firstSuccess = await Promise.race(
                    sweepPromises.map(p => p.then(res => {
                        if (res) throw res; // Rejecting with the IP causes Promise.race to resolve early with the "error" (our success)
                        return new Promise(() => {}); // Never resolve if null
                    }))
                ).catch(ip => ip); // Catch the thrown IP

                clearTimeout(sweepTimeout);

                if (firstSuccess && typeof firstSuccess === 'string') {
                    logger.info(`[Connectivity] Auto-discovered Master via HTTP sweep at ${firstSuccess}`);
                    localStorage.setItem('masterLocalIPAddress', firstSuccess);
                    this.updateMasterUrl(firstSuccess);
                    this.probe();
                }
            } catch (e) {
                logger.warn('[Connectivity] HTTP Sweep auto-discovery failed');
            }
        }
    }

    private handleBrowserOnline = (): void => {
        logger.info('[Connectivity] Browser reports online');
        this.probe();
    };

    private handleBrowserOffline = (): void => {
        logger.info('[Connectivity] Browser reports offline');
        this.setOnline(false);
        this.startProbing();
    };

    private async probe(): Promise<void> {
        if (!this.masterUrl) {
            this.setOnline(false);
            return;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.PROBE_TIMEOUT);

            const res = await fetch(`${this.masterUrl}/api/health`, {
                method: 'HEAD',
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (res.ok) {
                this.setOnline(true);
            } else {
                this.setOnline(false);
                this.startProbing();
            }
        } catch (e) {
            this.setOnline(false);
            this.startProbing();
        }
    }

    private startProbing(): void {
        if (this.probeTimer) return; // Already probing
        this.probeTimer = setTimeout(() => {
            this.probeTimer = null;
            this.probe();
        }, this.PROBE_INTERVAL);
    }

    private setOnline(value: boolean): void {
        if (this.isOnline === value) return;

        // Debounce state changes to prevent rapid flapping
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = null;
            this.isOnline = value;
            logger.info(`[Connectivity] Master connectivity: ${value ? 'ONLINE' : 'OFFLINE'}`);
            for (const listener of this.listeners) {
                try {
                    listener(value);
                } catch (e) {
                    // ignore listener errors
                }
            }
        }, this.DEBOUNCE_MS);
    }
}

export const connectivityService = new ConnectivityService();
