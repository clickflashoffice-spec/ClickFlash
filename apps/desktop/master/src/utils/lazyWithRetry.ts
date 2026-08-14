import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that automatically reloads the page
 * if a dynamically imported module fails to load (e.g., due to a new deployment
 * causing chunk hashes to change).
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        // Assume the error is a ChunkLoadError or similar network error
        // and force a refresh to get the latest chunk mapping.
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a never-resolving promise so React waits for the reload
        return new Promise<{ default: T }>(() => {});
      }
      
      // If we already refreshed and it still failed, throw the error
      throw error;
    }
  });
};
