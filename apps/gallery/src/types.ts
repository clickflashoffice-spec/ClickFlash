
import type { FC } from 'react';

export type View = 'Dashboard' | 'Albums' | 'Orders' | 'Photographers' | 'Settings' | 'Bookings' | 'Clients' | 'Documentation' | 'Products';

/**
 * Extended Error type for API errors
 * 
 * Used for error handling when API calls return errors with status codes
 * and error codes that aren't part of the standard Error type.
 */
export interface ApiError extends Error {
    status?: number;
    code?: string;
    retryAfter?: number;
    details?: unknown;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface DayShift {
    start: string;
    end: string;
    enabled: boolean;
}

export interface DayWorkingHours {
    shift1: DayShift;
    shift2: DayShift;
}

export type WorkingHours = {
    [key in DayOfWeek]: DayWorkingHours;
};

export type AppRole = 'CEO' | 'Manager' | 'Team Leader' | 'Admin' | 'Photographer';

export type Permission =
    // Master Portal
    | 'viewDashboard'
    | 'viewAlbums'
    | 'manageOwnAlbums'
    | 'manageAllAlbums'
    | 'viewOrders'
    | 'viewOwnOrders'
    | 'viewAllOrders'
    | 'viewPhotographers'
    | 'managePhotographers'
    | 'viewBookings'
    | 'manageBookings'
    | 'viewSettings'
    | 'manageLocalSettings'
    | 'manageSessionTypes'
    | 'viewProducts'
    | 'manageProducts'
    // Management Portal Permissions
    | 'viewManagementDashboard'
    | 'viewDestinations'
    | 'viewReports'
    | 'viewExpenses'
    | 'viewCapital'
    | 'viewAdjustments'
    | 'manageAdjustments'
    | 'viewPerformance'
    | 'viewWarehouse'
    | 'manageEquipmentCategories'
    | 'viewPayroll'
    | 'runPayroll'
    | 'viewEcommerceSettings'
    | 'viewGlobalSettings'
    | 'manageGlobalSettings'
    | 'viewDocumentation'
    | 'manageExpenseCategories';


export interface Photographer {
    id: string;
    name: string;
    email: string;
    password?: string;
    specialty: string;
    avatarUrl: string;
    role: AppRole;
    monthlyTarget: number;
    dailyPhotoTarget: number;
    workingHours?: WorkingHours;
    payrollType: 'Salary' | 'Commission';
    monthlySalary?: number;
    commissionRate?: number;
    destinationId?: string;
}

// Changed from union type to string to allow dynamic creation in Settings
export type PhotoCategory = string;

export interface RetouchAction {
    id: string;
    type: 'heal';
    x: number;
    y: number;
    radius: number;
    sourceX?: number; // Clone source X
    sourceY?: number; // Clone source Y
    timestamp: number;
}

/**
 * ManualEdits Interface
 * 
 * Represents manual photo editing adjustments applied to photos.
 * All values are applied as CSS filters or transforms in the photo editor.
 * 
 * Value ranges:
 * - Exposure, Contrast, Highlights, Shadows, Saturation: -100 to 100
 * - Hue Rotate: 0 to 360 (degrees)
 * - Rotate: -180 to 180 (degrees, in 90° increments for quick rotate)
 * - Straighten: -15 to 15 (degrees)
 * - Clarity: 0 to 100 (percentage)
 * - Soften: 0 to 20 (pixels, blur radius)
 * - Grayscale, Sepia, Invert, DropShadow: 0 to 100 (percentage/opacity)
 * 
 * These edits are stored in the database as JSON and applied non-destructively.
 * The original photo file is never modified.
 */
export interface ManualEdits {
    /** Exposure adjustment (-100 to 100) */
    exposure: number;
    /** Contrast adjustment (-100 to 100) */
    contrast: number;
    /** Highlights adjustment (-100 to 100) */
    highlights: number;
    /** Shadows adjustment (-100 to 100) */
    shadows: number;
    /** Saturation adjustment (-100 to 100) */
    saturate: number;
    /** Vibrance adjustment (-100 to 100) - More natural saturation control */
    vibrance: number;
    /** Grayscale filter (0 to 100) */
    grayscale: number;
    /** Sepia filter (0 to 100) */
    sepia: number;
    /** Invert filter (0 to 100) */
    invert: number;
    /** Hue rotation (0 to 360 degrees) */
    hueRotate: number;
    /** Color temperature adjustment (-100 to 100) - Warm/cool */
    temperature: number;
    /** Tint adjustment (-100 to 100) - Green/magenta */
    tint: number;
    /** White point adjustment (0 to 100) */
    whites: number;
    /** Black point adjustment (0 to 100) */
    blacks: number;
    /** Soften/blur effect (0 to 20 pixels) */
    soften: number;
    /** Rotation angle (-180 to 180 degrees) */
    rotate: number;
    /** Straighten angle (-15 to 15 degrees) */
    straighten: number;
    /** Horizontal perspective correction (-50 to 50) */
    perspectiveX: number;
    /** Vertical perspective correction (-50 to 50) */
    perspectiveY: number;
    /** Clarity/sharpness (0 to 100 percent) */
    clarity: number;
    /** Drop shadow opacity (0 to 100) */
    dropShadow: number;
    /** Vignette effect intensity (-100 to 100) */
    vignette: number;
    retouchActions?: RetouchAction[];
    crop?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface Photo {
    id: string;
    albumId: string;
    title: string;
    url: any; // Can be string URL or Blob for offline
    thumbnailUrl?: string;
    photographerId: number;
    category?: PhotoCategory;
    manualEdits?: ManualEdits;
    proofingStatus?: 'pending' | 'approved' | 'rejected';
    metadata?: PhotoMetadata;
    original_file?: string; // High-resolution file path (restricted access)
}

export interface PhotoMetadata {
    camera?: string;
    lens?: string;
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    dateTaken?: string;
    dimensions?: { width: number; height: number };
    fileSize?: number;
    focalLength?: string;
}

export interface Album {
    id: string;
    title: string;
    date: string;
    photos: Photo[];
    coverPhotoUrl: string;
    photographerId: number;
    source: string;
    roomNumber: string;
    categories?: PhotoCategory[];
    status?: string;
    updatedAt?: string;
    updated_at?: string;
}

export interface OrderItem {
    id: string;
    name: string;
    format: string;
    quantity: number;
    price: number;
    photo?: Photo;
}

export interface Order {
    id: string;
    date: string;
    clientName: string;
    email: string;
    status: 'Completed' | 'Pending' | 'Processing' | 'Cancelled' | 'Delivered';
    total: number;
    photographerId: number;
    items: OrderItem[];
    appliedDiscount?: number;
    destinationId?: string;
    // Added paymentMethod
    paymentMethod?: 'Cash' | 'Card';
    updatedAt?: string;
    updated_at?: string;
}

export interface DailyObjective {
    id: string;
    photographerId: number;
    date: string;
    photoTarget: number;
    status: 'Completed' | 'Pending';
}

export interface LoginHistory {
    id: string;
    photographerId: number;
    date: string;
    ip: string;
}

export interface TouchKiosk {
    id: string;
    name: string;
    status: 'Connected' | 'Disconnected';
}

export interface Product {
    id: string;
    name: string;
    category: 'Print' | 'Digital' | 'Merchandise' | 'Other';
    price: number;
    stock: number;
    isFeatured?: boolean;
}

export interface Pack {
    id: string;
    name: string;
    description: string;
    price: number;
    products: string[];
}

export interface Currency {
    code: string;
    name: string;
    symbol: string;
    rate: number; // relative to base currency
}

export interface SessionType {
    id: string;
    name: string;
    numberOfPhotos: number;
    price: number;
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
    photo: Photo;
    quantity: number;
    size: string;
    price: number;
    mode: 'Normal' | 'AI';
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
}

export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled';

export interface Booking {
    id: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    bookingDate: string;
    bookingTime: string;
    sessionId: string;
    photographerId: number;
    status: BookingStatus;
    destinationId?: string;
    notes?: string;
}

export interface FileSystemItem {
    name: string;
    type: 'folder' | 'photo';
    path: string;
    children?: FileSystemItem[];
    photo?: Photo;
}


// --- Management Types ---

export interface DestinationFeatures {
    ai: boolean;
    face: boolean;
    watermark: boolean;
    whiteLabel?: boolean;
}

export interface Destination {
    id: string;
    name: string;
    country: string;
    type: 'Resort' | 'City';
    licenseKey?: string; // For linking Master Portal to Cloud
    features?: DestinationFeatures;
    updatedAt?: string;
}

export interface ExpenseCategory {
    id: string;
    label: string;
}

export interface Expense {
    id: string;
    date: string;
    description: string;
    category: string; // ExpenseCategory ID
    cost: number;
    destinationId: string;
    photographerId?: number;
    invoiceUrl?: string;
}

export interface Loan {
    id: string;
    date: string;
    source: string;
    amount: number;
    interestRate: number;
    status: 'Active' | 'Paid Off';
    destinationId?: string;
    payments?: LoanPayment[];
}

export interface LoanPayment {
    id: string;
    loanId: string;
    date: string;
    amount: number;
    notes?: string;
}

export interface Adjustment {
    id: string;
    date: string;
    photographerId: number;
    amount: number;
    description: string;
    type: 'Bonus' | 'Deduction';
    status: 'Paid' | 'Unpaid';
}

export type EquipmentStatus = 'Available' | 'In Use' | 'In Storage' | 'Needs Repair';

export interface EquipmentCategory {
    id: string;
    label: string;
}
export interface Equipment {
    id: string;
    name: string;
    type: string; // EquipmentCategory ID
    status: EquipmentStatus;
    destinationId?: string;
    assignedToPhotographerId?: number;
}

export interface ActivityItem {
    id: string;
    type: 'order' | 'expense' | 'adjustment';
    date: string;
    description: string;
    amount: number;
    context: string;
}