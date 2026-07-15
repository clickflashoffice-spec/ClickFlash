export interface Env {
    JWT_SECRET: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    DB: D1Database;
    LICENSE_PRIVATE_KEY?: string;
    LICENSE_PUBLIC_KEY?: string;
}

export interface User {
    id: string | number;
    name: string;
    email: string;
    role: string;
    status: string;
    workingHours?: any;
    password?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Album {
    id: string;
    title: string;
    date: string;
    status: string;
    photographerId: string | number;
    eventType?: string;
    roomNumber?: string;
    source?: string;
    categories?: string[];
    created_at?: string;
    updated_at?: string;
}

export interface Photo {
    id: string;
    albumId: string;
    url: string;
    manualEdits?: any;
    created_at?: string;
    updated_at?: string;
}

export interface Order {
    id: string;
    date: string;
    status: string;
    clientName: string;
    albumId: string;
    totalAmount: number;
    items?: any;
    created_at?: string;
    updated_at?: string;
}

export interface DatabaseRow {
    [key: string]: any;
}

export interface ApiResponse<T> {
    items: T[];
    page?: number;
    perPage?: number;
    totalItems?: number;
    totalPages?: number;
}
