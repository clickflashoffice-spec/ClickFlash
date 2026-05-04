import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import { DEFAULT_MASTER_PORT } from '../constants';

// Helper to get Base URL (reused logic)
const getBaseUrl = () => {
    if ((window as { pb?: { baseUrl: string } }).pb?.baseUrl) return (window as { pb?: { baseUrl: string } }).pb!.baseUrl;
    return `http://127.0.0.1:${DEFAULT_MASTER_PORT}`;
};

export default function useSystemSetting<T>(namespace: string, defaultValue: T) {
    const [value, setValue] = useState<T>(defaultValue);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${getBaseUrl()}/api/settings/${namespace}`);
                if (!res.ok) throw new Error(`Failed to load settings: ${res.statusText}`);

                const data = await res.json();

                // If empty object returned (not found), stick with default
                if (data && Object.keys(data).length > 0) {
                    // Merge with default to ensure new keys are present if config schema changes
                    setValue({ ...defaultValue, ...data });
                } else {
                    setValue(defaultValue);
                }
            } catch (err: unknown) {
                logger.error(`[useSystemSetting] Failed to load ${namespace}`, err);
                setError(err instanceof Error ? err.message : String(err));
                // Fallback to local storage if API fails? No, simpler to just use default for now or strict offline mode.
                // Actually, let's try to load from localStorage as a fallback for pure offline dev if API is dead?
                // For "Apex" rules, we want Strict Source of Truth. So stick to default if DB is unreachable.
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [namespace]); // JSON.stringify(defaultValue) dependency removed to prevent loops, assume stable default

    // Save function
    const saveSettings = useCallback(async (newValue: T) => {
        try {
            // Update local state first for responsiveness
            // BUT we need a way to revert if the server rejects it.
            setValue(newValue);

            const res = await fetch(`${getBaseUrl()}/api/settings/${namespace}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newValue)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to save settings');
            }

            // Persistence confirmed
            setError(null);
            return true;
        } catch (err: unknown) {
            logger.error(`[useSystemSetting] Failed to save ${namespace}`, err);
            setError(err instanceof Error ? err.message : String(err));
            // Revert state if save failed so UI reflects actual DB state
            // fetchSettings(); // Better to just reload from DB
            return false;
        }
    }, [namespace, value]);

    return [value, saveSettings, loading, error] as const;
}
