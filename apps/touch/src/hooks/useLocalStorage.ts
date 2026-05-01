import { useState, useEffect, Dispatch, SetStateAction } from "react";

/**
 * useLocalStorage Hook
 *
 * Custom React hook that syncs state with localStorage.
 *
 * Features:
 * - Automatic persistence to localStorage
 * - Automatic retrieval from localStorage on mount
 * - Type-safe with TypeScript generics
 * - Handles JSON serialization/deserialization
 * - Error handling for localStorage failures
 * - Same API as useState (supports functional updates)
 *
 * Usage:
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 *
 * // Use like useState
 * setTheme('dark');
 * setTheme(prev => prev === 'light' ? 'dark' : 'light');
 * ```
 *
 * @template T - Type of the value to store
 * @param {string} key - localStorage key
 * @param {T} initialValue - Initial value if key doesn't exist in localStorage
 * @returns {[T, Dispatch<SetStateAction<T>>]} Tuple of current value and setter function
 *
 * @example
 * ```tsx
 * // Store user preferences
 * const [preferences, setPreferences] = useLocalStorage('userPrefs', {
 *   theme: 'dark',
 *   language: 'en'
 * });
 *
 * // Store simple values
 * const [count, setCount] = useLocalStorage('count', 0);
 * ```
 */
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = () => {
    const candidates = [
      window.localStorage,
      window.__TEST_LOCAL_STORAGE,
    ];
    try {
      for (const candidate of candidates) {
        if (!candidate || typeof candidate.getItem !== "function") continue;
        try {
          const item = candidate.getItem(key);
          if (process.env.DEBUG_USE_LOCAL_STORAGE === "1") {
            // eslint-disable-next-line no-console
            console.log("[useLocalStorage] readValue", {
              key,
              storageType:
                candidate === window.localStorage
                  ? "window.localStorage"
                  : "__TEST_LOCAL_STORAGE",
              raw: item,
            });
          }
          if (item != null) return item ? JSON.parse(item) : initialValue;
        } catch (err) {
          // try next candidate
          if (process.env.DEBUG_USE_LOCAL_STORAGE === "1") {
            // eslint-disable-next-line no-console
            console.log("[useLocalStorage] read candidate error", { key, err });
          }
          continue;
        }
      }
      return initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage (respect test-injected storage if present)
      try {
        const candidates = [
          window.localStorage,
          window.__TEST_LOCAL_STORAGE,
        ];
        if (process.env.DEBUG_USE_LOCAL_STORAGE === "1") {
          // eslint-disable-next-line no-console
          console.log("[useLocalStorage] setValue (attempting candidates)", {
            key,
            value: valueToStore,
          });
        }
        for (const candidate of candidates) {
          if (!candidate || typeof candidate.setItem !== "function") continue;
          try {
            candidate.setItem(key, JSON.stringify(valueToStore));
            if (process.env.DEBUG_USE_LOCAL_STORAGE === "1") {
              // eslint-disable-next-line no-console
              console.log("[useLocalStorage] setValue written to", {
                key,
                storageType:
                  candidate === window.localStorage
                    ? "window.localStorage"
                    : "__TEST_LOCAL_STORAGE",
              });
            }
            // keep trying other candidates to keep them in sync
          } catch (e) {
            if (process.env.DEBUG_USE_LOCAL_STORAGE === "1") {
              // eslint-disable-next-line no-console
              console.log("[useLocalStorage] set candidate error", { key, e });
            }
            continue;
          }
        }
      } catch (e) {
        console.warn(`Error setting localStorage key “${key}”:`, e);
      }
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  // Avoid re-reading on mount (initial value is read via useState initializer)

  return [storedValue, setValue];
}

export default useLocalStorage;
