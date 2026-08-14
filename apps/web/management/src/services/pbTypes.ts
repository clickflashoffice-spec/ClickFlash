// services/pbTypes.ts
// Type definitions for the custom PocketBase adapter

export interface CollectionOptions {
    sort?: string;
    filter?: string;
    expand?: string;
    page?: number;
    perPage?: number;
    fields?: string;
}

export interface PocketRecord {
    id: string;
    collectionId?: string;
    [key: string]: unknown;
}

export type Record = PocketRecord; // alias for compatibility

export interface GetListResult {
    items: PocketRecord[];
    totalItems: number;
}

export interface AuthResponse {
    token: string;
    admin: { id: string };
}

export interface CollectionInfo {
    name: string;
    type: string;
}

export interface FileUrlParams {
    record: PocketRecord;
    filename: string;
}

export interface HealthCheckResult {
    code: number;
    status?: string;
    version?: string;
    db?: string;
    security?: string;
    [key: string]: unknown;
}
