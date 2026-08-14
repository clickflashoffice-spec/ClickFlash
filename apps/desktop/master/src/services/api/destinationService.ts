/**
 * Destination Service
 * 
 * Handles all CRUD operations for destinations
 */

import { pb } from '../pb';
import { Destination } from '../../types';
import { isApiError, createApiError } from '../../utils/errorUtils';

export const destinationService = {
    /**
     * Get all destinations
     */
    async getDestinations(): Promise<Destination[]> {
        const records = await pb.collection('destinations').getFullList();
        return records as Destination[];
    },

    /**
     * Create a new destination
     */
    async createDestination(data: Partial<Destination>): Promise<Destination> {
        try {
            const record = await pb.collection('destinations').create(data);
            return record as Destination;
        } catch (error: unknown) {
            // Extract detailed error message from PocketBase/Backend
            let errorMessage = 'Failed to create destination';

            // Use type-safe error checking
            if (isApiError(error)) {
                if (error.isNetworkError || (error.message && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('connect')))) {
                    errorMessage = error.message || 'Cannot connect to backend server. Please ensure the server is running.';
                } else if (error.response?.data) {
                    const pbError = error.response.data;

                    // First, check for detailed error in the details field
                    if (pbError.details?.error) {
                        errorMessage = pbError.details.error;
                    } else if (pbError.details?.message) {
                        errorMessage = pbError.details.message;
                    } else if (pbError.message) {
                        errorMessage = pbError.message;
                        // If message is generic, try to get more details
                        if (errorMessage.includes('Failed to complete') && pbError.details) {
                            const detailsError = pbError.details.error || pbError.details.message;
                            if (detailsError) {
                                errorMessage = detailsError;
                            }
                        }
                    } else if (pbError.error) {
                        errorMessage = typeof pbError.error === 'string' ? pbError.error : errorMessage;
                    }
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            // Provide more helpful error messages for common issues
            if (errorMessage.includes('does not exist') || errorMessage.includes('Table') || errorMessage.includes('no such table')) {
                errorMessage = `Database table error: ${errorMessage}. Please restart the backend server to run migrations.`;
            } else if (errorMessage.includes('UNIQUE constraint') || errorMessage.includes('duplicate')) {
                errorMessage = `A destination with this name already exists. Please use a different name.`;
            } else if (errorMessage.includes('NOT NULL constraint') || errorMessage.includes('required')) {
                errorMessage = `Missing required fields: ${errorMessage}. Please fill in all required destination fields.`;
            }

            throw createApiError(errorMessage, error);
        }
    },

    /**
     * Update an existing destination
     */
    async updateDestination(id: string, data: Partial<Destination>): Promise<Destination> {
        try {
            const record = await pb.collection('destinations').update(id, data);
            return record as Destination;
        } catch (error: unknown) {
            // Use same error extraction as createDestination
            let errorMessage = 'Failed to update destination';

            if (isApiError(error)) {
                if (error.isNetworkError || (error.message && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('connect')))) {
                    errorMessage = error.message || 'Cannot connect to backend server.';
                } else if (error.response?.data) {
                    const pbError = error.response.data;
                    if (pbError.details?.error) errorMessage = pbError.details.error;
                    else if (pbError.details?.message) errorMessage = pbError.details.message;
                    else if (pbError.message) errorMessage = pbError.message;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            throw createApiError(errorMessage, error);
        }
    },

    /**
     * Delete a destination
     */
    async deleteDestination(id: string): Promise<void> {
        await pb.collection('destinations').delete(id);
    }
};
