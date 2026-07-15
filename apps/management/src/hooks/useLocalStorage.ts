import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { logger } from "@/utils/logger";

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
function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  // Get from local storage then
  // parse stored json or return initialValue
  const readValue = () => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.warn(`Error reading localStorage key “${key}”:`, error);
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
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logger.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };

  useEffect(() => {
    setStoredValue(readValue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [storedValue, setValue];
}

export default useLocalStorage;
