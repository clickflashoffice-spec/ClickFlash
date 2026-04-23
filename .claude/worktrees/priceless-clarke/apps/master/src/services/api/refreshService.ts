/**
 * Data Refresh Service
 * 
 * Handles data refresh operations for collections
 */

import { pb } from '../pb';
import { RefreshDataResponse } from './types';

export const refreshService = {
    /**
     * Refresh data for specified collections or all collections
     * 
     * Note: Rate limit errors (429) are thrown immediately and should be handled by the caller.
     * 
     * @param {string[]} [collections] - Optional array of collection names to refresh
     * @param {boolean} [incremental=true] - Whether to perform incremental refresh
     * @returns {Promise<RefreshDataResponse>} Refresh result with status information
     */
    async refreshData(collections?: string[], incremental = true): Promise<RefreshDataResponse> {
        const baseUrl = pb.baseUrlValue;

        const csrfToken = await pb.getCsrfToken();
        const response = await fetch(`${baseUrl}/api/data/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pb.authStore.token}`,
                ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify({ collections, incremental })
        });

        if (!response.ok) {
            // Handle rate limit errors (429) - don't retry, let the caller handle it
            if (response.status === 429) {
                // Try to extract retry-after header if available
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default to 60 seconds

                // Create a rate limit error with retry information
                const error = new Error(`Rate limit exceeded. Please retry after ${waitTime}ms`);
                (error as any).code = 'RATE_LIMIT_ERROR';
                (error as any).retryAfter = waitTime;
                (error as any).status = 429;
                throw error;
            }

            // Try to read the error message from the response
            let errorMessage = 'Failed to refresh data';
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // If response is not JSON, use status text
                errorMessage = response.statusText || errorMessage;
            }

            // Create error with more context
            const error = new Error(errorMessage);
            // Add status code for handling authentication errors
            (error as any).status = response.status;
            (error as any).code = response.status === 401 ? 'AUTHENTICATION_ERROR' :
                response.status === 429 ? 'RATE_LIMIT_ERROR' : 'REFRESH_ERROR';
            throw error;
        }

        return await response.json();
    }
};

