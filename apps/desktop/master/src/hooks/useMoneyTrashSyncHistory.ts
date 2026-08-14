/**
 * Use MoneyTrash Sync History Hook
 * 
 * React hook for accessing MoneyTrash sync history with real-time updates.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    moneyTrashSyncHistory, 
    SyncHistoryEntry, 
    SyncHistoryStats,
    SyncHistoryFilter 
} from '@/services/moneyTrashSyncHistory';

export function useMoneyTrashSyncHistory(filter?: SyncHistoryFilter) {
    const [entries, setEntries] = useState<SyncHistoryEntry[]>([]);
    const [stats, setStats] = useState<SyncHistoryStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial data
    useEffect(() => {
        const loadData = () => {
            setEntries(moneyTrashSyncHistory.getHistory(filter, 100));
            setStats(moneyTrashSyncHistory.getStats());
            setIsLoading(false);
        };

        loadData();

        // Subscribe to new entries
        const unsubscribe = moneyTrashSyncHistory.subscribe((entry) => {
            setEntries(prev => [entry, ...prev].slice(0, 100));
            setStats(moneyTrashSyncHistory.getStats());
        });

        return unsubscribe;
    }, [filter]);

    // Refresh data
    const refresh = useCallback(() => {
        setEntries(moneyTrashSyncHistory.getHistory(filter, 100));
        setStats(moneyTrashSyncHistory.getStats());
    }, [filter]);

    // Clear history
    const clearHistory = useCallback(() => {
        moneyTrashSyncHistory.clearHistory();
        setEntries([]);
        setStats(moneyTrashSyncHistory.getStats());
    }, []);

    return {
        entries,
        stats,
        isLoading,
        refresh,
        clearHistory,
    };
}

export default useMoneyTrashSyncHistory;
