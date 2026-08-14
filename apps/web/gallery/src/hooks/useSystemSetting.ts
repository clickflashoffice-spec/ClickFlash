import { useState, useEffect, useCallback } from 'react';

interface UseSystemSettingReturn<T> {
    value: T;
    update: (newValue: T) => void;
    isLoading: boolean;
    error: Error | null;
}

export function useSystemSetting<T>(
    key: string,
    defaultValue: T
): UseSystemSettingReturn<T> {
    const [value, setValue] = useState<T>(defaultValue);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const loadSetting = () => {
            try {
                const stored = localStorage.getItem(`cf_setting_${key}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setValue(parsed);
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to load setting'));
            } finally {
                setIsLoading(false);
            }
        };

        loadSetting();
    }, [key]);

    // Update function
    const update = useCallback((newValue: T) => {
        try {
            setValue(newValue);
            localStorage.setItem(`cf_setting_${key}`, JSON.stringify(newValue));
            
            // Dispatch event for cross-tab sync
            window.dispatchEvent(new StorageEvent('storage', {
                key: `cf_setting_${key}`,
                newValue: JSON.stringify(newValue),
            }));
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to save setting'));
        }
    }, [key]);

    // Listen for changes from other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === `cf_setting_${key}` && e.newValue) {
                try {
                    setValue(JSON.parse(e.newValue));
                } catch {
                    // Ignore parse errors
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return { value, update, isLoading, error };
}

export default useSystemSetting;
