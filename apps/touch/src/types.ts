export * from "@clickflash/types";
export type AppRole = import("@clickflash/types").UserRole;
export type PhotoCategory = string;

export type View = 'Dashboard' | 'Albums' | 'Orders' | 'Photographers' | 'Settings' | 'Bookings' | 'Clients' | 'Documentation' | 'Products';

export type AppMode = 'master' | 'touch' | 'management' | 'customer';

export interface ApiError extends Error {
    status?: number;
    code?: string;
    retryAfter?: number;
    details?: unknown;
}

export interface ShootIdea {
    title: string;
    description: string;
    settings: {
        aperture: string;
        shutter_speed: string;
        iso: string;
    };
}

export interface CartItem {
    id: string;
    photo: import("@clickflash/types").Photo;
    quantity: number;
    size: string;
    price: number;
    mode: 'Normal' | 'AI';
    deliveryType?: 'digital' | 'print' | 'both';
    productId?: string;
}

export interface KioskSettings {
    logoUrl: string;
    welcomeMessage: string;
    kioskId: string;
    currencyCode?: string;
    password?: string;
    serverUrl?: string;
    screensaverTimeout?: number; // In seconds, 0 to disable
    enableRFID?: boolean;
    enableFaceLogin?: boolean;
    enableFaceSearch?: boolean;
    sharedFolderPath?: string;
    touchOrdersFolder?: string;
}

export interface ActivityItem {
    id: string;
    type: 'order' | 'expense' | 'adjustment';
    date: string;
    description: string;
    amount: number;
    context: string;
}
export type DestinationFeatures = NonNullable<import("@clickflash/types").Destination["features"]>;
