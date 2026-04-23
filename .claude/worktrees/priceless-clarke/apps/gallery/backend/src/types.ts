export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    password?: string;
    workingHours?: any;
    created_at: string;
    updated_at: string;
}

export interface Album {
    id: string;
    title: string;
    date: string;
    status: string;
    photographerId: number;
    eventType?: string;
    roomNumber?: string;
    source?: string;
    categories?: string[];
    created_at: string;
    updated_at: string;
}

export interface Photo {
    id: string;
    albumId: string;
    url: string;
    photographerId: number;
    title?: string;
    manualEdits?: any;
    created_at: string;
    updated_at: string;
}

export interface Order {
    id: string;
    date: string;
    status: string;
    clientName: string;
    albumId: string;
    totalAmount: number;
    items: any;
    created_at: string;
    updated_at: string;
}

export interface DecodedToken {
    id: number;
    email: string;
    role: string;
    iat: number;
    exp: number;
}
