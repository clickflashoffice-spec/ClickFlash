/**
 * Error Utility Types and Functions
 * 
 * Provides type-safe error handling utilities for API responses
 */

/** API error structure with optional properties from backend responses */
export interface ApiErrorDetails {
    message?: string;
    error?: string;
    status?: number;
    code?: string;
    isNetworkError?: boolean;
    response?: {
        status: number;
        data?: {
            message?: string;
            error?: string;
            details?: {
                error?: string;
                message?: string;
            };
            data?: Record<string, unknown>;
        };
    };
}

/**
 * Type guard to check if an error has API error structure
 */
export function isApiError(error: unknown): error is ApiErrorDetails {
    return (
        typeof error === 'object' &&
        error !== null &&
        ('message' in error || 'response' in error || 'isNetworkError' in error)
    );
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (isApiError(error)) {
        // Check for network errors
        if (error.isNetworkError && error.message) {
            return error.message;
        }
        // Check response data
        if (error.response?.data) {
            const data = error.response.data;
            if (data.details?.error) return data.details.error;
            if (data.details?.message) return data.details.message;
            if (data.message) return data.message;
            if (data.error) return data.error;
        }
        // Check direct message
        if (error.message) return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return fallback;
}

/**
 * Create an enriched error with API response metadata
 */
export function createApiError(message: string, source?: unknown): Error & Partial<ApiErrorDetails> {
    const error = new Error(message) as Error & Partial<ApiErrorDetails>;

    if (isApiError(source)) {
        if (source.response) error.response = source.response;
        if (source.status) error.status = source.status;
        if (source.isNetworkError) error.isNetworkError = true;
    }

    return error;
}
