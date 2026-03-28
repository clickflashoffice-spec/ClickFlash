import { pb } from '../pb';
import { logger } from '../../utils/logger';

// Helper to reliably detect network errors across browsers
export const isNetworkError = (error: any): boolean => {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    return (
        error instanceof TypeError && (
            msg.includes('fetch') ||
            msg.includes('network') ||
            msg.includes('failed to fetch') ||
            msg.includes('connection refused')
        )
    ) || msg.includes('err_connection_refused');
};

// Re-export pb for convenience in other services
export { pb };
