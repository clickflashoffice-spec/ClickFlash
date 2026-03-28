/**
 * Shared types for API services
 */



/**
 * Collection refresh status information
 */
export interface CollectionRefreshStatus {
    status: 'refreshed';
    recordCount: number;
    updatedCount?: number;
    incremental: boolean;
    lastRefreshTime?: string;
    maxUpdatedAt?: string;
    warning?: string;
    table: string;
}

/**
 * Data refresh response
 */
export interface RefreshDataResponse {
    success: boolean;
    refreshed: string[];
    status: {
        startTime: string;
        endTime?: string;
        duration?: string;
        durationMs?: number;
        collectionsRefreshed: number;
        collectionsRequested: number;
        collections: Record<string, CollectionRefreshStatus>;
        errors: Array<{
            collection: string;
            table: string;
            error: string;
            stack?: string;
        }>;
        warnings: Array<{
            collection?: string;
            table?: string;
            warning: string;
            invalidCollections?: string[];
            availableCollections?: string[];
        }>;
    };
}

