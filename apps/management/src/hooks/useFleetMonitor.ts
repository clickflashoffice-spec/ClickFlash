/**
 * Global Fleet Monitor Hook
 * 
 * Provides real-time monitoring of all kiosk devices across the fleet
 * with WebSocket-based live updates and comprehensive status tracking.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fleetService, MasterStation, FleetStatus, SyncOperation } from './fleetService';
import { webSocketService } from './webSocketService';
import { logger } from '@/utils/logger';

export interface FleetMonitorConfig {
    refreshInterval?: number;
    enableRealtime?: boolean;
    stationId?: string;
}

export interface StationHealth {
    station: MasterStation;
    healthScore: number;
    issues: string[];
    trend: 'improving' | 'stable' | 'degrading';
    lastCheck: string;
}

export interface FleetMetrics {
    totalPhotosProcessed: number;
    totalOrdersToday: number;
    averageSyncTime: number;
    networkUptime: number;
    activeAlerts: number;
}

const DEFAULT_CONFIG: Required<FleetMonitorConfig> = {
    refreshInterval: 30000, // 30 seconds
    enableRealtime: true,
    stationId: undefined,
};

export function useFleetMonitor(config?: FleetMonitorConfig) {
    const { refreshInterval, enableRealtime, stationId } = { ...DEFAULT_CONFIG, ...config };
    
    const [stations, setStations] = useState<MasterStation[]>([]);
    const [fleetStatus, setFleetStatus] = useState<FleetStatus | null>(null);
    const [recentOperations, setRecentOperations] = useState<SyncOperation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    // Fetch fleet status
    const fetchFleetStatus = useCallback(async () => {
        try {
            const status = await fleetService.getFleetStatus();
            setFleetStatus(status);
        } catch (err) {
            logger.error('[FleetMonitor] Failed to fetch fleet status', err);
        }
    }, []);

    // Fetch all stations
    const fetchStations = useCallback(async () => {
        try {
            const data = await fleetService.getStations();
            setStations(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            logger.error('[FleetMonitor] Failed to fetch stations', err);
            setError('Failed to fetch stations');
        }
    }, []);

    // Fetch single station details
    const fetchStationDetails = useCallback(async (id: string) => {
        try {
            return await fleetService.getStationDetails(id);
        } catch (err) {
            logger.error('[FleetMonitor] Failed to fetch station details', err);
            throw err;
        }
    }, []);

    // Fetch recent sync operations
    const fetchRecentOperations = useCallback(async () => {
        try {
            const result = await fleetService.getSyncOperations({ limit: 20 });
            setRecentOperations(result.operations);
        } catch (err) {
            logger.error('[FleetMonitor] Failed to fetch operations', err);
        }
    }, []);

    // Refresh all data
    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchFleetStatus(),
                fetchStations(),
                fetchRecentOperations(),
            ]);
        } finally {
            setIsRefreshing(false);
        }
    }, [fetchFleetStatus, fetchStations, fetchRecentOperations]);

    // Force sync a station or all stations
    const forceSync = useCallback(async (deskId?: string) => {
        try {
            await fleetService.forceSync(deskId);
            // Refresh after sync
            setTimeout(refresh, 1000);
        } catch (err) {
            logger.error('[FleetMonitor] Failed to force sync', err);
            throw err;
        }
    }, [refresh]);

    // Calculate health scores for stations
    const stationHealth = useMemo<StationHealth[]>(() => {
        return stations.map(station => {
            const issues: string[] = [];
            let healthScore = 100;

            // Check status-based issues
            if (station.status === 'offline' || station.status === 'disconnected') {
                issues.push('Station is offline');
                healthScore -= 50;
            } else if (station.status === 'warning' || station.status === 'degraded') {
                issues.push('Station has warnings');
                healthScore -= 25;
            }

            // Check sync lag
            if (station.syncStatus?.syncLag && station.syncStatus.syncLag > 300) {
                issues.push('Sync lag exceeds 5 minutes');
                healthScore -= 15;
            }

            // Check failed operations
            if (station.syncStatus?.failedOperations && station.syncStatus.failedOperations > 0) {
                issues.push(`${station.syncStatus.failedOperations} failed operations`);
                healthScore -= 10 * Math.min(station.syncStatus.failedOperations, 5);
            }

            // Check metrics
            if (station.metrics?.diskUsage && station.metrics.diskUsage > 90) {
                issues.push('Disk usage critical (>90%)');
                healthScore -= 20;
            }
            if (station.metrics?.memoryUsage && station.metrics.memoryUsage > 85) {
                issues.push('Memory usage high (>85%)');
                healthScore -= 15;
            }

            // Check queue size
            if (station.metrics?.queueSize && station.metrics.queueSize > 100) {
                issues.push('Large pending queue');
                healthScore -= 10;
            }

            healthScore = Math.max(0, healthScore);

            return {
                station,
                healthScore,
                issues,
                trend: healthScore > 80 ? 'stable' : healthScore > 50 ? 'degrading' : 'improving',
                lastCheck: new Date().toISOString(),
            };
        });
    }, [stations]);

    // Calculate fleet-wide metrics
    const fleetMetrics = useMemo<FleetMetrics>(() => {
        const totalPhotosProcessed = stations.reduce(
            (acc, s) => acc + (s.photos?.today || 0), 0
        );
        const totalOrdersToday = stations.reduce(
            (acc, s) => acc + (s.orders?.today || 0), 0
        );

        // Calculate average sync time from recent operations
        const completedOps = recentOperations.filter(op => op.status === 'success');
        const avgSyncTime = completedOps.length > 0
            ? completedOps.reduce((acc, op) => acc + op.duration, 0) / completedOps.length
            : 0;

        // Calculate network uptime based on station status
        const onlineCount = stations.filter(s => 
            s.status === 'online' || s.status === 'syncing'
        ).length;
        const networkUptime = stations.length > 0 
            ? (onlineCount / stations.length) * 100 
            : 0;

        // Count active alerts
        const activeAlerts = stationHealth.filter(h => h.healthScore < 70).length;

        return {
            totalPhotosProcessed,
            totalOrdersToday,
            averageSyncTime: avgSyncTime / 1000, // Convert to seconds
            networkUptime,
            activeAlerts,
        };
    }, [stations, recentOperations, stationHealth]);

    // Handle kiosk status updates from WebSocket
    const handleKioskStatusUpdate = useCallback((status: {
        id: string;
        name: string;
        status: 'Connected' | 'Disconnected';
    }) => {
        logger.info('[FleetMonitor] Kiosk status update received', status);
        // Update the specific station's status
        setStations(prev => prev.map(station => {
            if (station.id === status.id) {
                return {
                    ...station,
                    status: status.status === 'Connected' ? 'online' : 'offline',
                    lastSeen: new Date().toISOString(),
                };
            }
            return station;
        }));
    }, []);

    // Initial fetch and WebSocket connection
    useEffect(() => {
        setIsLoading(true);
        
        const init = async () => {
            await fetchFleetStatus();
            await fetchStations();
            await fetchRecentOperations();
            setIsLoading(false);
        };

        init();

        // Connect to WebSocket for real-time updates
        if (enableRealtime) {
            webSocketService.connect(
                { type: 'master' },
                (data) => {
                    logger.debug('[FleetMonitor] WebSocket message received', data);
                },
                (status) => {
                    setIsConnected(status === 'Connected');
                },
                handleKioskStatusUpdate
            );
        }

        // Set up periodic refresh
        const refreshIntervalId = setInterval(refresh, refreshInterval);

        return () => {
            clearInterval(refreshIntervalId);
            if (enableRealtime) {
                webSocketService.disconnect();
            }
        };
    }, [fetchFleetStatus, fetchStations, fetchRecentOperations, refreshInterval, enableRealtime, handleKioskStatusUpdate, refresh]);

    return {
        // Data
        stations,
        stationHealth,
        fleetStatus,
        fleetMetrics,
        recentOperations,
        
        // State
        isLoading,
        isRefreshing,
        isConnected,
        error,
        lastUpdated,
        
        // Actions
        refresh,
        forceSync,
        fetchStationDetails,
        
        // Filters
        stationId,
    };
}

export default useFleetMonitor;
