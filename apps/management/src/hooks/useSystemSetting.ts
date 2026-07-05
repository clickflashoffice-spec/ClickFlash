import { useState, useEffect, useCallback } from "react";
import { apiService } from "../services/apiService";

interface UseSystemSettingReturn<T> {
  value: T;
  update: (newValue: T) => void;
  isLoading: boolean;
  error: Error | null;
}

export function useSystemSetting<T>(
  key: string,
  defaultValue: T,
): UseSystemSettingReturn<T> {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initial load from localStorage (fast UI)
  useEffect(() => {
    const stored = localStorage.getItem(`cf_setting_${key}`);
    if (stored) {
      try {
        setValue(JSON.parse(stored));
      } catch {
        console.warn(`Failed to parse local setting for ${key}`);
      }
    }
  }, [key]);

  // Background sync from Backend
  useEffect(() => {
    const fetchFromBackend = async () => {
      try {
        const backendValue = await apiService.getSetting(key);
        if (backendValue !== null) {
          setValue(backendValue as T);
          localStorage.setItem(
            `cf_setting_${key}`,
            JSON.stringify(backendValue),
          );
        }
      } catch (err) {
        console.error(`Failed to sync setting ${key} from backend:`, err);
        // Don't set error state yet, we have local storage as fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchFromBackend();
  }, [key]);

  // Update function
  const update = useCallback(
    async (newValue: T) => {
      try {
        // Optimistic update
        setValue(newValue);
        localStorage.setItem(`cf_setting_${key}`, JSON.stringify(newValue));

        // Persist to backend
        await apiService.saveSetting(key, newValue);

        // Dispatch event for cross-tab sync
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: `cf_setting_${key}`,
            newValue: JSON.stringify(newValue),
          }),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to save setting"),
        );
        console.error(`Failed to save setting ${key}:`, err);
      }
    },
    [key],
  );

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

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return { value, update, isLoading, error };
}

export default useSystemSetting;
