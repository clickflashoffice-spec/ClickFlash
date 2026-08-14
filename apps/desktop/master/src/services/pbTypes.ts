// services/pbTypes.ts
// Type definitions for the custom PocketBase adapter
// Now re-exports from shared types for consistency

import {
    BaseRecord,
    User
} from '../types/shared';

export * from '../types/shared';

export interface CollectionOptions {
    sort?: string;
    filter?: string;
    expand?: string;
    page?: number;
    perPage?: number;
    fields?: string;
}

export interface PocketRecord extends BaseRecord {
    [key: string]: unknown;
}

export type Record = PocketRecord; // alias for compatibility

export interface GetListResult<T = PocketRecord> {
    items: T[];
    totalItems: number;
    page?: number;
    perPage?: number;
    totalPages?: number;
}

export interface AuthResponse {
    token: string;
    admin: { id: string };
    record?: User;
}

export interface CollectionInfo {
    name: string;
    type: string;
}

export interface FileUrlParams {
    record: BaseRecord;
    filename: string;
}

export interface HealthCheckResult {
    code: number;
    status?: string;
    version?: string;
    db?: string;
    security?: string;
    timestamp?: string;
    [key: string]: unknown;
}

