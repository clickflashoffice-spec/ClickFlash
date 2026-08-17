import { z } from 'zod';
/**
 * ClickFlash Ecosystem - Shared TypeScript Types
 * Version: 4.2.0
 *
 * These types are the definitive contract for all layers of the ecosystem.
 * Shared between Master Portal, Touch Kiosk, Gallery, Management, Website, and MoneyTrash.
 *
 * NEVER use `any` - use `unknown` and type guards instead.
 */
import type { UserRole, ManualEdits } from '@clickflash/validation';
export { PhotoSchema, CartItemSchema, UserSchema, OrderSchema, UserRoleSchema, AlbumSchema, ProductSchema, BookingSchema, DestinationSchema, TouchKioskSchema, SyncLogSchema, SessionTypeSchema, CurrencySchema, PaginationSchema, SortSchema, DateRangeSchema } from '@clickflash/validation';
export * from './ble.js';
export * from './phase3.js';
export * from './auth.js';
export * from './magicShot.js';
export type { PhotoCreate, AlbumCreate, UserCreate, OrderCreate, ProductCreate, BookingCreate, Client, LicenseKey, Pagination, Sort, ManualEdits, PermissionString, RolePermissions, RfidAuth, PosOrderCreate, UserRole, MobileLogin, MobileUpload, MobileSync, FleetHeartbeat, FleetCommand, LicenseValidation, LicenseRevoke } from '@clickflash/validation';
export interface BaseRecord {
    id: string;
    created?: string;
    updated?: string;
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
    tenantId?: string;
}
export interface Tenant extends BaseRecord {
    name: string;
    region?: string;
    baseCurrency?: string;
    config?: Record<string, unknown>;
}
export interface Guest extends BaseRecord {
    name?: string;
    email?: string;
    phone?: string;
    whatsappOptIn?: boolean;
    faceDescriptor?: string;
    faceVector?: number[];
    rfidTag?: string;
    status?: 'Active' | 'Inactive';
}
export interface GuestCreateInput {
    name?: string;
    email?: string;
    phone?: string;
    faceDescriptor?: string;
}
export declare const PayrollTypeSchema: z.ZodEnum<["Salary", "Commission"]>;
export type PayrollType = z.infer<typeof PayrollTypeSchema>;
export declare const DayOfWeekSchema: z.ZodEnum<["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]>;
export type DayOfWeek = z.infer<typeof DayOfWeekSchema>;
export interface DayShift {
    start: string;
    end: string;
    enabled: boolean;
}
export interface DayWorkingHours {
    shift1: DayShift;
    shift2: DayShift;
}
export type WorkingHours = Record<DayOfWeek, DayWorkingHours>;
export interface User extends BaseRecord {
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string;
    specialty?: string;
    monthlyTarget?: number;
    dailyPhotoTarget?: number;
    payrollType?: PayrollType;
    monthlySalary?: number;
    commissionRate?: number;
    destinationId?: string;
    workingHoursJSON?: WorkingHours | string;
    workingHours?: WorkingHours;
    password?: string;
    faceDescriptor?: string;
}
export interface UserCreateInput {
    name: string;
    email: string;
    role: UserRole;
    password: string;
    destinationId?: string;
}
export interface UserUpdateInput extends Partial<Omit<User, 'id' | 'created' | 'updated'>> {
}
export interface Annotation {
    id: string;
    type: 'brush' | 'text' | 'shape';
    points?: Array<{
        x: number;
        y: number;
    }>;
    color: string;
    width: number;
    opacity: number;
    text?: string;
    rect?: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
}
export interface RetouchAction {
    id: string;
    type: 'heal' | 'clone';
    x: number;
    y: number;
    radius: number;
    sourceX?: number;
    sourceY?: number;
    timestamp: number;
}
export interface PhotoMetadata {
    camera?: string;
    lens?: string;
    iso?: number;
    aperture?: string;
    shutterSpeed?: string;
    dateTaken?: string;
    dimensions?: {
        width: number;
        height: number;
    };
    fileSize?: number;
    focalLength?: string;
    manualEdits?: ManualEdits;
    orientation?: number;
    exif?: {
        ISO?: number;
        ExposureTime?: string;
        FNumber?: string;
        FocalLength?: string;
        DateTime?: string;
        Make?: string;
        Model?: string;
        Orientation?: number;
    };
}
export type CullingStatus = 'Selected' | 'Rejected' | 'Pending';
export type ProofingStatus = 'pending' | 'approved' | 'rejected';
export type AnomalySeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export interface AnomalyEvent extends BaseRecord {
    photographerId: string | number;
    type: 'Idle' | 'LocationSpoof' | 'ExcessiveVoids' | 'CashUnderTable' | 'BuddyPunching';
    severity: AnomalySeverity;
    timestamp: string;
    spotId?: string;
    details?: Record<string, unknown>;
    resolved?: boolean;
}
/**
 * ClickFlash Photo Model
 * Standardized for Master, Touch, and Cloud ecosystem.
 */
export interface Photo extends BaseRecord {
    id: string;
    albumId: string;
    spotId?: string;
    url: string;
    watermarkUrl?: string;
    originalUrl?: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    title?: string;
    photographerId: string | number;
    category?: string;
    manualEdits?: ManualEdits | null;
    autoEdits?: ManualEdits | null;
    autoEnhanced?: boolean;
    metadata?: PhotoMetadata;
    originalFilename?: string;
    fileHash?: string;
    storagePath?: string;
    proofingStatus?: ProofingStatus;
    sync_status?: string;
    sync_id?: string;
    width?: number;
    height?: number;
    resolution?: number;
    size?: number;
    fileSize?: number;
    capturedAt?: string;
    hotelId?: string;
    mimeType?: string;
    cullingStatus?: CullingStatus;
    quality_flags?: string | string[];
    overallScore?: number;
    sharpnessScore?: number;
    orientation?: number;
    aiTags?: {
        clothing_colors?: string[];
        accessories?: string[];
        context?: string;
        people_count?: number;
    };
    _pixelModified?: boolean;
    _metadataModified?: boolean;
}
export interface PhotoCreateInput {
    albumId: string;
    url: string;
    originalUrl?: string;
    thumbnailUrl?: string;
    title?: string;
    photographerId: string | number;
    category?: string;
    metadata?: PhotoMetadata;
    originalFilename?: string;
    fileHash?: string;
    storagePath?: string;
    width?: number;
    height?: number;
    mimeType?: string;
    fileSize?: number;
    capturedAt?: string;
    hotelId?: string;
}
export interface PhotoUpdateInput extends Partial<Omit<Photo, 'id' | 'created' | 'updated'>> {
}
export interface CartItem extends BaseRecord {
    id: string;
    photoId: string;
    photo: Photo;
    name: string;
    format?: string;
    quantity: number;
    price: number;
    deliveryType?: 'digital' | 'print' | 'both';
    productId?: string;
}
export type OrderItemCreateInput = CartItemCreateInput;
export interface CartItemCreateInput {
    photoId: string;
    name: string;
    format?: string;
    quantity: number;
    price: number;
    deliveryType?: 'digital' | 'print' | 'both';
    productId?: string;
}
export type OrderStatus = 'Completed' | 'Pending' | 'Processing' | 'Cancelled' | 'Delivered';
export type PaymentMethod = 'Cash' | 'Card';
export interface OrderItem extends BaseRecord {
    id: string;
    name: string;
    format?: string;
    quantity: number;
    price: number;
    photo?: Photo;
    deliveryType?: 'digital' | 'print' | 'both';
    productId?: string;
    checksum?: string;
}
export interface Order extends BaseRecord {
    date: string;
    clientName: string;
    email: string;
    phone?: string;
    whatsappOptIn?: boolean;
    status: OrderStatus;
    total: number;
    photographerId: string | number;
    items: OrderItem[];
    appliedDiscount?: number;
    destinationId?: string;
    paymentMethod?: PaymentMethod;
    albumId?: string;
    source?: 'kiosk' | 'manual';
    orderNumber?: string;
    roomNumber?: string;
    rfidTag?: string;
    access_pin?: string;
    magic_link_token?: string;
    cloud_sync_status?: string;
    cloud_sync_error?: string;
    checksum?: string;
    updatedAt?: string;
}
export interface OrderCreateInput {
    date: string;
    clientName: string;
    email: string;
    phone?: string;
    whatsappOptIn?: boolean;
    status: OrderStatus;
    total: number;
    photographerId: string | number;
    items: OrderItemCreateInput[];
    appliedDiscount?: number;
    destinationId?: string;
    paymentMethod?: PaymentMethod;
    albumId?: string;
    source?: 'kiosk' | 'manual';
    roomNumber?: string;
}
export interface OrderUpdateInput extends Partial<Omit<Order, 'id' | 'created' | 'updated'>> {
}
export type AlbumStatus = 'Draft' | 'Finalized' | 'Archived';
export interface Album extends BaseRecord {
    title: string;
    date: string;
    photographerId: string | number;
    roomNumber?: string;
    source?: string;
    eventType?: string;
    status?: AlbumStatus;
    customerEmail?: string;
    customerPhone?: string;
    whatsappOptIn?: boolean;
    coverPhotoUrl?: string;
    thumbnailUrl?: string;
    categories?: string[];
    photos?: Photo[];
    numberOfPhotos?: number;
}
export interface AlbumCreateInput {
    title: string;
    date: string;
    photographerId: string | number;
    roomNumber?: string;
    source?: string;
    eventType?: string;
    customerEmail?: string;
    customerPhone?: string;
    whatsappOptIn?: boolean;
}
export interface AlbumUpdateInput extends Partial<Omit<Album, 'id' | 'created' | 'updated'>> {
}
export interface Product extends BaseRecord {
    name: string;
    category?: string;
    price: number;
    stock?: number;
    isFeatured?: boolean;
    description?: string;
    imageUrl?: string;
    basePrice?: number;
    yieldMultiplier?: number;
}
export interface Pack extends BaseRecord {
    name: string;
    description?: string;
    price: number;
    products: string[];
    basePrice?: number;
    yieldMultiplier?: number;
}
export interface SessionType extends BaseRecord {
    name: string;
    numberOfPhotos: number;
    price: number;
}
export interface Currency extends BaseRecord {
    code: string;
    name: string;
    symbol: string;
    rate: number;
}
export type KioskStatus = 'Active' | 'Inactive' | 'Maintenance' | 'Connected' | 'Disconnected';
export interface TouchKiosk extends BaseRecord {
    name: string;
    status: KioskStatus;
    lastHeartbeat?: string;
    settings?: Record<string, unknown>;
    ipAddress?: string;
    version?: string;
    uploadFolderPath?: string;
    ordersFolderPath?: string;
}
export interface Destination extends BaseRecord {
    name: string;
    country: string;
    type: 'Resort' | 'City';
    licenseKey?: string;
    features?: {
        ai: boolean;
        face: boolean;
        watermark: boolean;
    };
    lastSeen?: string;
    status?: 'Online' | 'Offline' | 'Connected' | 'Disconnected' | 'Degraded';
    healthMetrics?: {
        cpu?: {
            load: number;
            temp: number | null;
        };
        memory?: {
            used: number;
            total: number;
            percent: number;
        };
        disk?: {
            used: number;
            total: number;
            percent: number;
        };
        queueDepth?: {
            photos: number;
            db: number;
        };
        sales?: {
            todayRevenue: number;
            todayOrders: number;
            pendingOrders: number;
        };
        uptime?: number;
    };
    version?: string;
    ipAddress?: string;
    siteCode?: string;
}
export declare enum GalleryTheme {
    CLASSIC = "CLASSIC",
    FILMSTRIP = "FILMSTRIP",
    GLASSMORPHIC = "GLASSMORPHIC"
}
export declare enum AIPermission {
    MAGIC_ENHANCE = "MAGIC_ENHANCE",
    REMOVE_BG = "REMOVE_BG",
    WATERMARK_FREE = "WATERMARK_FREE"
}
export interface GalleryConfig {
    theme: GalleryTheme;
    features: {
        enablePhotoBooks: boolean;
        enableReels: boolean;
        enableAiFigures: boolean;
    };
    aiPermissions: AIPermission[];
}
export interface SyncLog extends BaseRecord {
    masterId: string;
    destinationId?: string;
    level: 'info' | 'warn' | 'error';
    event: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    details?: Record<string, unknown>;
}
export interface PaginatedList<T> {
    items: T[];
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
}
export type Photographer = User;
export type Permission = "viewDashboard" | "viewAlbums" | "manageOwnAlbums" | "manageAllAlbums" | "viewOrders" | "viewOwnOrders" | "viewAllOrders" | "viewPhotographers" | "managePhotographers" | "viewBookings" | "manageBookings" | "viewSettings" | "manageLocalSettings" | "manageSessionTypes" | "viewProducts" | "manageProducts" | "viewManagementDashboard" | "viewDestinations" | "viewReports" | "viewExpenses" | "viewCapital" | "viewAdjustments" | "manageAdjustments" | "viewPerformance" | "viewWarehouse" | "manageEquipmentCategories" | "viewPayroll" | "runPayroll" | "viewEcommerceSettings" | "viewGlobalSettings" | "manageGlobalSettings" | "viewDocumentation" | "manageExpenseCategories" | "viewConsumables" | "manageConsumables" | "viewPortfolio" | "managePortfolio";
export interface DailyObjective extends BaseRecord {
    photographer_id: string | number;
    date: string;
    target: number;
    status: "Pending" | "Completed";
}
export interface LoginHistory extends BaseRecord {
    photographerId: string;
    date: string;
    ip: string;
}
export interface ExpenseCategory {
    id: string;
    label: string;
}
export interface EquipmentCategory {
    id: string;
    label: string;
}
export interface Expense extends BaseRecord {
    date: string;
    description: string;
    category: string;
    cost: number;
    destinationId: string;
    photographerId?: string;
}
export interface LoanPayment {
    id: string;
    loanId: string;
    date: string;
    amount: number;
}
export interface Loan extends BaseRecord {
    date: string;
    source: string;
    amount: number;
    interestRate: number;
    status: "Active" | "Paid Off";
    payments: LoanPayment[];
}
export interface Adjustment extends BaseRecord {
    date: string;
    photographerId: string;
    amount: number;
    description: string;
    type: "Bonus" | "Deduction";
    status: "Paid" | "Unpaid";
}
export interface Equipment extends BaseRecord {
    name: string;
    type: string;
    status: "In Use" | "Available" | "Needs Repair" | "Retired" | "In Storage";
    assignedToPhotographerId?: string;
    destinationId: string;
}
export interface AssistanceRequest {
    id: string;
    kioskId: string;
    message: string;
    timestamp: Date;
    status?: "pending" | "resolved" | "dismissed";
}
export interface FileSystemItem {
    name: string;
    type: "folder" | "photo";
    path: string;
    children?: FileSystemItem[];
    photo?: Photo;
}
export interface Booking extends BaseRecord {
    clientName: string;
    email: string;
    phone?: string;
    clientEmail?: string;
    clientPhone?: string;
    bookingDate: string;
    bookingTime?: string;
    sessionTypeId: string;
    sessionId?: string;
    photographerId?: string;
    notes?: string;
    status: "confirmed" | "pending" | "cancelled" | "completed" | "no-show" | "Confirmed" | "Pending" | "Cancelled" | "Completed" | "No-show";
}
export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed" | "no-show" | "Confirmed" | "Pending" | "Cancelled" | "Completed" | "No-show";
export interface SystemSetting extends BaseRecord {
    key: string;
    value: string | number | boolean | Record<string, unknown>;
    description?: string;
}
/**
 * Self-scoped photographer command-center snapshot.
 *
 * Producers must derive photographer, desk, and tenant identity from the
 * authenticated principal. Callers must not be allowed to select these values.
 * Money is represented exclusively as signed, safe integer minor units.
 */
export declare const PhotographerCommandCenterV1Schema: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1">;
    generatedAt: z.ZodString;
    source: z.ZodEnum<["MASTER", "MANAGEMENT_HUB"]>;
    scope: z.ZodObject<{
        photographerId: z.ZodString;
        deskId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        timezone: z.ZodEffects<z.ZodString, string, string>;
        currency: z.ZodString;
        currencyExponent: z.ZodNumber;
        from: z.ZodEffects<z.ZodString, string, string>;
        toExclusive: z.ZodEffects<z.ZodString, string, string>;
    }, "strict", z.ZodTypeAny, {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        from: string;
        toExclusive: string;
        tenantId?: string | undefined;
    }, {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        from: string;
        toExclusive: string;
        tenantId?: string | undefined;
    }>;
    sync: z.ZodObject<{
        sourceWatermark: z.ZodString;
        lastHubSyncAt: z.ZodNullable<z.ZodString>;
        stale: z.ZodBoolean;
        pendingEventCount: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        sourceWatermark: string;
        lastHubSyncAt: string | null;
        stale: boolean;
        pendingEventCount: number;
    }, {
        sourceWatermark: string;
        lastHubSyncAt: string | null;
        stale: boolean;
        pendingEventCount: number;
    }>;
    shift: z.ZodObject<{
        state: z.ZodEnum<["OFF_SHIFT", "ON_SHIFT", "UNKNOWN"]>;
        clockedInAt: z.ZodNullable<z.ZodString>;
        workedSecondsToday: z.ZodNullable<z.ZodNumber>;
        verification: z.ZodEnum<["VERIFIED", "UNVERIFIED", "UNAVAILABLE"]>;
    }, "strict", z.ZodTypeAny, {
        state: "OFF_SHIFT" | "ON_SHIFT" | "UNKNOWN";
        clockedInAt: string | null;
        workedSecondsToday: number | null;
        verification: "VERIFIED" | "UNVERIFIED" | "UNAVAILABLE";
    }, {
        state: "OFF_SHIFT" | "ON_SHIFT" | "UNKNOWN";
        clockedInAt: string | null;
        workedSecondsToday: number | null;
        verification: "VERIFIED" | "UNVERIFIED" | "UNAVAILABLE";
    }>;
    activity: z.ZodObject<{
        capturesReceived: z.ZodNullable<z.ZodNumber>;
        photosCatalogued: z.ZodNumber;
        photosEdited: z.ZodNullable<z.ZodNumber>;
        photosDelivered: z.ZodNullable<z.ZodNumber>;
        distinctPhotosSold: z.ZodNumber;
        qualityFlagged: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        capturesReceived: number | null;
        photosCatalogued: number;
        photosEdited: number | null;
        photosDelivered: number | null;
        distinctPhotosSold: number;
        qualityFlagged: number;
    }, {
        capturesReceived: number | null;
        photosCatalogued: number;
        photosEdited: number | null;
        photosDelivered: number | null;
        distinctPhotosSold: number;
        qualityFlagged: number;
    }>;
    sales: z.ZodObject<{
        completedOrders: z.ZodNumber;
        grossMinor: z.ZodNumber;
        tipsMinor: z.ZodNumber;
        averageOrderMinor: z.ZodNumber;
        settledMinor: z.ZodNullable<z.ZodNumber>;
        refundMinor: z.ZodNullable<z.ZodNumber>;
        netMinor: z.ZodNullable<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        completedOrders: number;
        grossMinor: number;
        tipsMinor: number;
        averageOrderMinor: number;
        settledMinor: number | null;
        refundMinor: number | null;
        netMinor: number | null;
    }, {
        completedOrders: number;
        grossMinor: number;
        tipsMinor: number;
        averageOrderMinor: number;
        settledMinor: number | null;
        refundMinor: number | null;
        netMinor: number | null;
    }>;
    earnings: z.ZodObject<{
        commissionMinor: z.ZodNullable<z.ZodNumber>;
        salaryMinor: z.ZodNullable<z.ZodNumber>;
        bonusMinor: z.ZodNullable<z.ZodNumber>;
        deductionMinor: z.ZodNullable<z.ZodNumber>;
        paidOutMinor: z.ZodNullable<z.ZodNumber>;
        payableMinor: z.ZodNullable<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        commissionMinor: number | null;
        salaryMinor: number | null;
        bonusMinor: number | null;
        deductionMinor: number | null;
        paidOutMinor: number | null;
        payableMinor: number | null;
    }, {
        commissionMinor: number | null;
        salaryMinor: number | null;
        bonusMinor: number | null;
        deductionMinor: number | null;
        paidOutMinor: number | null;
        payableMinor: number | null;
    }>;
    performance: z.ZodObject<{
        revenueTargetMinor: z.ZodNullable<z.ZodNumber>;
        photoTarget: z.ZodNullable<z.ZodNumber>;
        meetingsTaken: z.ZodNullable<z.ZodNumber>;
        meetingsMade: z.ZodNullable<z.ZodNumber>;
        meetingConversionBps: z.ZodNullable<z.ZodNumber>;
        photoSellThroughBps: z.ZodNullable<z.ZodNumber>;
        averageSessionSeconds: z.ZodNullable<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        revenueTargetMinor: number | null;
        photoTarget: number | null;
        meetingsTaken: number | null;
        meetingsMade: number | null;
        meetingConversionBps: number | null;
        photoSellThroughBps: number | null;
        averageSessionSeconds: number | null;
    }, {
        revenueTargetMinor: number | null;
        photoTarget: number | null;
        meetingsTaken: number | null;
        meetingsMade: number | null;
        meetingConversionBps: number | null;
        photoSellThroughBps: number | null;
        averageSessionSeconds: number | null;
    }>;
    daily: z.ZodArray<z.ZodObject<{
        date: z.ZodEffects<z.ZodString, string, string>;
        grossMinor: z.ZodNumber;
        orders: z.ZodNumber;
        photosCatalogued: z.ZodNumber;
        distinctPhotosSold: z.ZodNumber;
        workedSeconds: z.ZodNullable<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        date: string;
        photosCatalogued: number;
        distinctPhotosSold: number;
        grossMinor: number;
        orders: number;
        workedSeconds: number | null;
    }, {
        date: string;
        photosCatalogued: number;
        distinctPhotosSold: number;
        grossMinor: number;
        orders: number;
        workedSeconds: number | null;
    }>, "many">;
    completeness: z.ZodObject<{
        sales: z.ZodEnum<["FINAL", "PROVISIONAL"]>;
        settlement: z.ZodEnum<["FINAL", "UNAVAILABLE"]>;
        earnings: z.ZodEnum<["FINAL", "PROVISIONAL", "UNAVAILABLE"]>;
        shifts: z.ZodEnum<["FINAL", "PROVISIONAL", "UNAVAILABLE"]>;
        issues: z.ZodArray<z.ZodString, "many">;
    }, "strict", z.ZodTypeAny, {
        issues: string[];
        sales: "FINAL" | "PROVISIONAL";
        earnings: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
        settlement: "UNAVAILABLE" | "FINAL";
        shifts: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
    }, {
        issues: string[];
        sales: "FINAL" | "PROVISIONAL";
        earnings: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
        settlement: "UNAVAILABLE" | "FINAL";
        shifts: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
    }>;
}, "strict", z.ZodTypeAny, {
    shift: {
        state: "OFF_SHIFT" | "ON_SHIFT" | "UNKNOWN";
        clockedInAt: string | null;
        workedSecondsToday: number | null;
        verification: "VERIFIED" | "UNVERIFIED" | "UNAVAILABLE";
    };
    source: "MASTER" | "MANAGEMENT_HUB";
    schemaVersion: "1";
    generatedAt: string;
    scope: {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        from: string;
        toExclusive: string;
        tenantId?: string | undefined;
    };
    sync: {
        sourceWatermark: string;
        lastHubSyncAt: string | null;
        stale: boolean;
        pendingEventCount: number;
    };
    activity: {
        capturesReceived: number | null;
        photosCatalogued: number;
        photosEdited: number | null;
        photosDelivered: number | null;
        distinctPhotosSold: number;
        qualityFlagged: number;
    };
    sales: {
        completedOrders: number;
        grossMinor: number;
        tipsMinor: number;
        averageOrderMinor: number;
        settledMinor: number | null;
        refundMinor: number | null;
        netMinor: number | null;
    };
    earnings: {
        commissionMinor: number | null;
        salaryMinor: number | null;
        bonusMinor: number | null;
        deductionMinor: number | null;
        paidOutMinor: number | null;
        payableMinor: number | null;
    };
    performance: {
        revenueTargetMinor: number | null;
        photoTarget: number | null;
        meetingsTaken: number | null;
        meetingsMade: number | null;
        meetingConversionBps: number | null;
        photoSellThroughBps: number | null;
        averageSessionSeconds: number | null;
    };
    daily: {
        date: string;
        photosCatalogued: number;
        distinctPhotosSold: number;
        grossMinor: number;
        orders: number;
        workedSeconds: number | null;
    }[];
    completeness: {
        issues: string[];
        sales: "FINAL" | "PROVISIONAL";
        earnings: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
        settlement: "UNAVAILABLE" | "FINAL";
        shifts: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
    };
}, {
    shift: {
        state: "OFF_SHIFT" | "ON_SHIFT" | "UNKNOWN";
        clockedInAt: string | null;
        workedSecondsToday: number | null;
        verification: "VERIFIED" | "UNVERIFIED" | "UNAVAILABLE";
    };
    source: "MASTER" | "MANAGEMENT_HUB";
    schemaVersion: "1";
    generatedAt: string;
    scope: {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        from: string;
        toExclusive: string;
        tenantId?: string | undefined;
    };
    sync: {
        sourceWatermark: string;
        lastHubSyncAt: string | null;
        stale: boolean;
        pendingEventCount: number;
    };
    activity: {
        capturesReceived: number | null;
        photosCatalogued: number;
        photosEdited: number | null;
        photosDelivered: number | null;
        distinctPhotosSold: number;
        qualityFlagged: number;
    };
    sales: {
        completedOrders: number;
        grossMinor: number;
        tipsMinor: number;
        averageOrderMinor: number;
        settledMinor: number | null;
        refundMinor: number | null;
        netMinor: number | null;
    };
    earnings: {
        commissionMinor: number | null;
        salaryMinor: number | null;
        bonusMinor: number | null;
        deductionMinor: number | null;
        paidOutMinor: number | null;
        payableMinor: number | null;
    };
    performance: {
        revenueTargetMinor: number | null;
        photoTarget: number | null;
        meetingsTaken: number | null;
        meetingsMade: number | null;
        meetingConversionBps: number | null;
        photoSellThroughBps: number | null;
        averageSessionSeconds: number | null;
    };
    daily: {
        date: string;
        photosCatalogued: number;
        distinctPhotosSold: number;
        grossMinor: number;
        orders: number;
        workedSeconds: number | null;
    }[];
    completeness: {
        issues: string[];
        sales: "FINAL" | "PROVISIONAL";
        earnings: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
        settlement: "UNAVAILABLE" | "FINAL";
        shifts: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
    };
}>, {
    shift: {
        state: "OFF_SHIFT" | "ON_SHIFT" | "UNKNOWN";
        clockedInAt: string | null;
        workedSecondsToday: number | null;
        verification: "VERIFIED" | "UNVERIFIED" | "UNAVAILABLE";
    };
    source: "MASTER" | "MANAGEMENT_HUB";
    schemaVersion: "1";
    generatedAt: string;
    scope: {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        from: string;
        toExclusive: string;
        tenantId?: string | undefined;
    };
    sync: {
        sourceWatermark: string;
        lastHubSyncAt: string | null;
        stale: boolean;
        pendingEventCount: number;
    };
    activity: {
        capturesReceived: number | null;
        photosCatalogued: number;
        photosEdited: number | null;
        photosDelivered: number | null;
        distinctPhotosSold: number;
        qualityFlagged: number;
    };
    sales: {
        completedOrders: number;
        grossMinor: number;
        tipsMinor: number;
        averageOrderMinor: number;
        settledMinor: number | null;
        refundMinor: number | null;
        netMinor: number | null;
    };
    earnings: {
        commissionMinor: number | null;
        salaryMinor: number | null;
        bonusMinor: number | null;
        deductionMinor: number | null;
        paidOutMinor: number | null;
        payableMinor: number | null;
    };
    performance: {
        revenueTargetMinor: number | null;
        photoTarget: number | null;
        meetingsTaken: number | null;
        meetingsMade: number | null;
        meetingConversionBps: number | null;
        photoSellThroughBps: number | null;
        averageSessionSeconds: number | null;
    };
    daily: {
        date: string;
        photosCatalogued: number;
        distinctPhotosSold: number;
        grossMinor: number;
        orders: number;
        workedSeconds: number | null;
    }[];
    completeness: {
        issues: string[];
        sales: "FINAL" | "PROVISIONAL";
        earnings: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
        settlement: "UNAVAILABLE" | "FINAL";
        shifts: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
    };
}, {
    shift: {
        state: "OFF_SHIFT" | "ON_SHIFT" | "UNKNOWN";
        clockedInAt: string | null;
        workedSecondsToday: number | null;
        verification: "VERIFIED" | "UNVERIFIED" | "UNAVAILABLE";
    };
    source: "MASTER" | "MANAGEMENT_HUB";
    schemaVersion: "1";
    generatedAt: string;
    scope: {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        from: string;
        toExclusive: string;
        tenantId?: string | undefined;
    };
    sync: {
        sourceWatermark: string;
        lastHubSyncAt: string | null;
        stale: boolean;
        pendingEventCount: number;
    };
    activity: {
        capturesReceived: number | null;
        photosCatalogued: number;
        photosEdited: number | null;
        photosDelivered: number | null;
        distinctPhotosSold: number;
        qualityFlagged: number;
    };
    sales: {
        completedOrders: number;
        grossMinor: number;
        tipsMinor: number;
        averageOrderMinor: number;
        settledMinor: number | null;
        refundMinor: number | null;
        netMinor: number | null;
    };
    earnings: {
        commissionMinor: number | null;
        salaryMinor: number | null;
        bonusMinor: number | null;
        deductionMinor: number | null;
        paidOutMinor: number | null;
        payableMinor: number | null;
    };
    performance: {
        revenueTargetMinor: number | null;
        photoTarget: number | null;
        meetingsTaken: number | null;
        meetingsMade: number | null;
        meetingConversionBps: number | null;
        photoSellThroughBps: number | null;
        averageSessionSeconds: number | null;
    };
    daily: {
        date: string;
        photosCatalogued: number;
        distinctPhotosSold: number;
        grossMinor: number;
        orders: number;
        workedSeconds: number | null;
    }[];
    completeness: {
        issues: string[];
        sales: "FINAL" | "PROVISIONAL";
        earnings: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
        settlement: "UNAVAILABLE" | "FINAL";
        shifts: "UNAVAILABLE" | "FINAL" | "PROVISIONAL";
    };
}>;
export type PhotographerCommandCenterV1 = z.infer<typeof PhotographerCommandCenterV1Schema>;
/**
 * Deterministic Image Edit Recipe Contract
 * Guarantees immutable provenance, deterministic colors, and exact re-renders.
 */
export declare const ImageEditRecipeV1Schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1">;
    provenance: z.ZodObject<{
        authorId: z.ZodString;
        engineVersion: z.ZodString;
        modelVersions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        profileVersions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        confidence: z.ZodOptional<z.ZodNumber>;
        timestamp: z.ZodString;
        generator: z.ZodEnum<["MANUAL", "AI", "SYSTEM"]>;
    }, "strict", z.ZodTypeAny, {
        timestamp: string;
        authorId: string;
        engineVersion: string;
        generator: "MANUAL" | "AI" | "SYSTEM";
        modelVersions?: Record<string, string> | undefined;
        profileVersions?: Record<string, string> | undefined;
        confidence?: number | undefined;
    }, {
        timestamp: string;
        authorId: string;
        engineVersion: string;
        generator: "MANUAL" | "AI" | "SYSTEM";
        modelVersions?: Record<string, string> | undefined;
        profileVersions?: Record<string, string> | undefined;
        confidence?: number | undefined;
    }>;
    source: z.ZodObject<{
        fileHash: z.ZodString;
        derivativeHashes: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        fileHash: string;
        width: number;
        height: number;
        derivativeHashes?: Record<string, string> | undefined;
    }, {
        fileHash: string;
        width: number;
        height: number;
        derivativeHashes?: Record<string, string> | undefined;
    }>;
    color: z.ZodObject<{
        exposure: z.ZodDefault<z.ZodNumber>;
        contrast: z.ZodDefault<z.ZodNumber>;
        highlights: z.ZodDefault<z.ZodNumber>;
        shadows: z.ZodDefault<z.ZodNumber>;
        whites: z.ZodDefault<z.ZodNumber>;
        blacks: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        tint: z.ZodDefault<z.ZodNumber>;
        saturate: z.ZodDefault<z.ZodNumber>;
        vibrance: z.ZodDefault<z.ZodNumber>;
        clarity: z.ZodDefault<z.ZodNumber>;
        soften: z.ZodDefault<z.ZodNumber>;
        sharpen: z.ZodDefault<z.ZodNumber>;
        hueRotate: z.ZodDefault<z.ZodNumber>;
        grayscale: z.ZodDefault<z.ZodNumber>;
        sepia: z.ZodDefault<z.ZodNumber>;
        invert: z.ZodDefault<z.ZodNumber>;
        brightness: z.ZodDefault<z.ZodNumber>;
    }, "strict", z.ZodTypeAny, {
        exposure: number;
        contrast: number;
        highlights: number;
        shadows: number;
        whites: number;
        blacks: number;
        temperature: number;
        tint: number;
        saturate: number;
        vibrance: number;
        clarity: number;
        soften: number;
        sharpen: number;
        hueRotate: number;
        grayscale: number;
        sepia: number;
        invert: number;
        brightness: number;
    }, {
        exposure?: number | undefined;
        contrast?: number | undefined;
        highlights?: number | undefined;
        shadows?: number | undefined;
        whites?: number | undefined;
        blacks?: number | undefined;
        temperature?: number | undefined;
        tint?: number | undefined;
        saturate?: number | undefined;
        vibrance?: number | undefined;
        clarity?: number | undefined;
        soften?: number | undefined;
        sharpen?: number | undefined;
        hueRotate?: number | undefined;
        grayscale?: number | undefined;
        sepia?: number | undefined;
        invert?: number | undefined;
        brightness?: number | undefined;
    }>;
    geometry: z.ZodObject<{
        rotate: z.ZodDefault<z.ZodNumber>;
        straighten: z.ZodDefault<z.ZodNumber>;
        perspectiveX: z.ZodDefault<z.ZodNumber>;
        perspectiveY: z.ZodDefault<z.ZodNumber>;
        crop: z.ZodDefault<z.ZodNullable<z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
            x: number;
            y: number;
        }, {
            width: number;
            height: number;
            x: number;
            y: number;
        }>>>;
    }, "strict", z.ZodTypeAny, {
        rotate: number;
        straighten: number;
        perspectiveX: number;
        perspectiveY: number;
        crop: {
            width: number;
            height: number;
            x: number;
            y: number;
        } | null;
    }, {
        rotate?: number | undefined;
        straighten?: number | undefined;
        perspectiveX?: number | undefined;
        perspectiveY?: number | undefined;
        crop?: {
            width: number;
            height: number;
            x: number;
            y: number;
        } | null | undefined;
    }>;
    retouchActions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        x: z.ZodNumber;
        y: z.ZodNumber;
        radius: z.ZodNumber;
        sourceX: z.ZodNumber;
        sourceY: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        x: number;
        y: number;
        radius: number;
        sourceX: number;
        sourceY: number;
    }, {
        x: number;
        y: number;
        radius: number;
        sourceX: number;
        sourceY: number;
    }>, "many">>;
    guard: z.ZodOptional<z.ZodObject<{
        safe: z.ZodDefault<z.ZodBoolean>;
        flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strict", z.ZodTypeAny, {
        safe: boolean;
        flags: string[];
    }, {
        safe?: boolean | undefined;
        flags?: string[] | undefined;
    }>>;
    approvals: z.ZodDefault<z.ZodArray<z.ZodObject<{
        approverId: z.ZodString;
        timestamp: z.ZodString;
        decision: z.ZodEnum<["APPROVED", "REJECTED", "PENDING"]>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        approverId: string;
        decision: "APPROVED" | "REJECTED" | "PENDING";
    }, {
        timestamp: string;
        approverId: string;
        decision: "APPROVED" | "REJECTED" | "PENDING";
    }>, "many">>;
    colorProfile: z.ZodOptional<z.ZodObject<{
        workingSpace: z.ZodString;
        outputSpace: z.ZodString;
        depth: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        workingSpace: string;
        outputSpace: string;
        depth: number;
    }, {
        workingSpace: string;
        outputSpace: string;
        depth: number;
    }>>;
}, "strict", z.ZodTypeAny, {
    source: {
        fileHash: string;
        width: number;
        height: number;
        derivativeHashes?: Record<string, string> | undefined;
    };
    schemaVersion: "1";
    provenance: {
        timestamp: string;
        authorId: string;
        engineVersion: string;
        generator: "MANUAL" | "AI" | "SYSTEM";
        modelVersions?: Record<string, string> | undefined;
        profileVersions?: Record<string, string> | undefined;
        confidence?: number | undefined;
    };
    color: {
        exposure: number;
        contrast: number;
        highlights: number;
        shadows: number;
        whites: number;
        blacks: number;
        temperature: number;
        tint: number;
        saturate: number;
        vibrance: number;
        clarity: number;
        soften: number;
        sharpen: number;
        hueRotate: number;
        grayscale: number;
        sepia: number;
        invert: number;
        brightness: number;
    };
    geometry: {
        rotate: number;
        straighten: number;
        perspectiveX: number;
        perspectiveY: number;
        crop: {
            width: number;
            height: number;
            x: number;
            y: number;
        } | null;
    };
    retouchActions: {
        x: number;
        y: number;
        radius: number;
        sourceX: number;
        sourceY: number;
    }[];
    approvals: {
        timestamp: string;
        approverId: string;
        decision: "APPROVED" | "REJECTED" | "PENDING";
    }[];
    guard?: {
        safe: boolean;
        flags: string[];
    } | undefined;
    colorProfile?: {
        workingSpace: string;
        outputSpace: string;
        depth: number;
    } | undefined;
}, {
    source: {
        fileHash: string;
        width: number;
        height: number;
        derivativeHashes?: Record<string, string> | undefined;
    };
    schemaVersion: "1";
    provenance: {
        timestamp: string;
        authorId: string;
        engineVersion: string;
        generator: "MANUAL" | "AI" | "SYSTEM";
        modelVersions?: Record<string, string> | undefined;
        profileVersions?: Record<string, string> | undefined;
        confidence?: number | undefined;
    };
    color: {
        exposure?: number | undefined;
        contrast?: number | undefined;
        highlights?: number | undefined;
        shadows?: number | undefined;
        whites?: number | undefined;
        blacks?: number | undefined;
        temperature?: number | undefined;
        tint?: number | undefined;
        saturate?: number | undefined;
        vibrance?: number | undefined;
        clarity?: number | undefined;
        soften?: number | undefined;
        sharpen?: number | undefined;
        hueRotate?: number | undefined;
        grayscale?: number | undefined;
        sepia?: number | undefined;
        invert?: number | undefined;
        brightness?: number | undefined;
    };
    geometry: {
        rotate?: number | undefined;
        straighten?: number | undefined;
        perspectiveX?: number | undefined;
        perspectiveY?: number | undefined;
        crop?: {
            width: number;
            height: number;
            x: number;
            y: number;
        } | null | undefined;
    };
    retouchActions?: {
        x: number;
        y: number;
        radius: number;
        sourceX: number;
        sourceY: number;
    }[] | undefined;
    guard?: {
        safe?: boolean | undefined;
        flags?: string[] | undefined;
    } | undefined;
    approvals?: {
        timestamp: string;
        approverId: string;
        decision: "APPROVED" | "REJECTED" | "PENDING";
    }[] | undefined;
    colorProfile?: {
        workingSpace: string;
        outputSpace: string;
        depth: number;
    } | undefined;
}>;
export type ImageEditRecipeV1 = z.infer<typeof ImageEditRecipeV1Schema>;
/**
 * Integer-only money used by immutable photographer events. The currency
 * exponent is carried with every monetary fact so consumers never guess the
 * scale (for example TND uses 3 decimal places and JPY uses 0).
 */
export declare const MoneyMinorV1Schema: z.ZodEffects<z.ZodObject<{
    amountMinor: z.ZodNumber;
    currency: z.ZodString;
    currencyExponent: z.ZodNumber;
}, "strict", z.ZodTypeAny, {
    amountMinor: number;
    currency: string;
    currencyExponent: number;
}, {
    amountMinor: number;
    currency: string;
    currencyExponent: number;
}>, {
    amountMinor: number;
    currency: string;
    currencyExponent: number;
}, {
    amountMinor: number;
    currency: string;
    currencyExponent: number;
}>;
export declare const PhotographerEventKindV1Schema: z.ZodEnum<["ORDER_COMPLETED", "PAYMENT_CAPTURED", "SETTLEMENT_POSTED", "REFUND_POSTED", "ATTRIBUTION_ASSIGNED", "COMMISSION_ACCRUED", "ADJUSTMENT_POSTED", "PAYOUT_POSTED", "SHIFT_STARTED", "SHIFT_ENDED", "BREAK_STARTED", "BREAK_ENDED", "REVERSAL_POSTED", "RECONCILIATION_APPROVED"]>;
export type PhotographerEventKindV1 = z.infer<typeof PhotographerEventKindV1Schema>;
/**
 * Append-only, source-identifiable photographer fact. This contract contains
 * no customer PII and does not by itself declare earnings payable.
 */
export declare const PhotographerEventV1Schema: z.ZodEffects<z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1">;
    eventId: z.ZodString;
    producer: z.ZodEnum<["MASTER", "GALLERY", "MANAGEMENT_HUB", "CLOUD_BACKEND", "MOBILE_PHOTOGRAPHER", "SYSTEM_IMPORT"]>;
    producerEventId: z.ZodString;
    photographerId: z.ZodString;
    occurredAt: z.ZodString;
    recordedAt: z.ZodString;
    scope: z.ZodObject<{
        deskId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        timezone: z.ZodEffects<z.ZodString, string, string>;
    }, "strict", z.ZodTypeAny, {
        deskId: string;
        timezone: string;
        tenantId?: string | undefined;
    }, {
        deskId: string;
        timezone: string;
        tenantId?: string | undefined;
    }>;
    sourceRecordId: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationEventId: z.ZodOptional<z.ZodString>;
    payload: z.ZodDiscriminatedUnion<"kind", [z.ZodObject<{
        kind: z.ZodLiteral<"ORDER_COMPLETED">;
        orderId: z.ZodString;
        gross: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        tips: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        photoCount: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        orderId: string;
        kind: "ORDER_COMPLETED";
        gross: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        tips: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        photoCount: number;
    }, {
        orderId: string;
        kind: "ORDER_COMPLETED";
        gross: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        tips: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        photoCount: number;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"PAYMENT_CAPTURED">;
        orderId: z.ZodString;
        paymentId: z.ZodString;
        amount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        method: z.ZodEnum<["CASH", "CARD", "STRIPE", "OTHER"]>;
    }, "strict", z.ZodTypeAny, {
        orderId: string;
        kind: "PAYMENT_CAPTURED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        method: "CASH" | "CARD" | "STRIPE" | "OTHER";
    }, {
        orderId: string;
        kind: "PAYMENT_CAPTURED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        method: "CASH" | "CARD" | "STRIPE" | "OTHER";
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"SETTLEMENT_POSTED">;
        orderId: z.ZodString;
        paymentId: z.ZodString;
        settlementId: z.ZodString;
        grossAmount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        feeAmount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        netAmount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
    }, "strict", z.ZodTypeAny, {
        orderId: string;
        kind: "SETTLEMENT_POSTED";
        paymentId: string;
        settlementId: string;
        grossAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        feeAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        netAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
    }, {
        orderId: string;
        kind: "SETTLEMENT_POSTED";
        paymentId: string;
        settlementId: string;
        grossAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        feeAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        netAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"REFUND_POSTED">;
        orderId: z.ZodString;
        paymentId: z.ZodString;
        refundId: z.ZodString;
        amount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        reasonCode: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        orderId: string;
        kind: "REFUND_POSTED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        refundId: string;
        reasonCode: string;
    }, {
        orderId: string;
        kind: "REFUND_POSTED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        refundId: string;
        reasonCode: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"ATTRIBUTION_ASSIGNED">;
        orderId: z.ZodString;
        method: z.ZodEnum<["DIRECT_CAPTURE", "ALBUM_OWNER", "KIOSK_SESSION", "MANUAL_REVIEW", "SYSTEM_RULE"]>;
        confidenceBps: z.ZodNullable<z.ZodNumber>;
        assignedById: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        orderId: string;
        kind: "ATTRIBUTION_ASSIGNED";
        method: "DIRECT_CAPTURE" | "ALBUM_OWNER" | "KIOSK_SESSION" | "MANUAL_REVIEW" | "SYSTEM_RULE";
        confidenceBps: number | null;
        assignedById?: string | undefined;
    }, {
        orderId: string;
        kind: "ATTRIBUTION_ASSIGNED";
        method: "DIRECT_CAPTURE" | "ALBUM_OWNER" | "KIOSK_SESSION" | "MANUAL_REVIEW" | "SYSTEM_RULE";
        confidenceBps: number | null;
        assignedById?: string | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"COMMISSION_ACCRUED">;
        commissionId: z.ZodString;
        orderId: z.ZodString;
        policyId: z.ZodString;
        policyVersion: z.ZodString;
        basis: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        rateBps: z.ZodNumber;
        amount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
    }, "strict", z.ZodTypeAny, {
        orderId: string;
        kind: "COMMISSION_ACCRUED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        commissionId: string;
        policyId: string;
        policyVersion: string;
        basis: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        rateBps: number;
    }, {
        orderId: string;
        kind: "COMMISSION_ACCRUED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        commissionId: string;
        policyId: string;
        policyVersion: string;
        basis: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        rateBps: number;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"ADJUSTMENT_POSTED">;
        adjustmentId: z.ZodString;
        direction: z.ZodEnum<["CREDIT", "DEBIT"]>;
        amount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        reasonCode: z.ZodString;
        approvedById: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        kind: "ADJUSTMENT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        reasonCode: string;
        adjustmentId: string;
        direction: "CREDIT" | "DEBIT";
        approvedById: string;
    }, {
        kind: "ADJUSTMENT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        reasonCode: string;
        adjustmentId: string;
        direction: "CREDIT" | "DEBIT";
        approvedById: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"PAYOUT_POSTED">;
        payoutId: z.ZodString;
        reconciliationId: z.ZodString;
        amount: z.ZodEffects<z.ZodEffects<z.ZodObject<{
            amountMinor: z.ZodNumber;
            currency: z.ZodString;
            currencyExponent: z.ZodNumber;
        }, "strict", z.ZodTypeAny, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }, {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        }>;
        periodFrom: z.ZodEffects<z.ZodString, string, string>;
        periodToExclusive: z.ZodEffects<z.ZodString, string, string>;
    }, "strict", z.ZodTypeAny, {
        kind: "PAYOUT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        payoutId: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
    }, {
        kind: "PAYOUT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        payoutId: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"SHIFT_STARTED">;
        shiftId: z.ZodString;
        stationId: z.ZodOptional<z.ZodString>;
        verification: z.ZodEnum<["BIOMETRIC", "PIN", "ADMIN", "UNVERIFIED"]>;
    }, "strict", z.ZodTypeAny, {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_STARTED";
        shiftId: string;
        stationId?: string | undefined;
    }, {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_STARTED";
        shiftId: string;
        stationId?: string | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"SHIFT_ENDED">;
        shiftId: z.ZodString;
        stationId: z.ZodOptional<z.ZodString>;
        verification: z.ZodEnum<["BIOMETRIC", "PIN", "ADMIN", "UNVERIFIED"]>;
    }, "strict", z.ZodTypeAny, {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_ENDED";
        shiftId: string;
        stationId?: string | undefined;
    }, {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_ENDED";
        shiftId: string;
        stationId?: string | undefined;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"BREAK_STARTED">;
        shiftId: z.ZodString;
        breakId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        kind: "BREAK_STARTED";
        shiftId: string;
        breakId: string;
    }, {
        kind: "BREAK_STARTED";
        shiftId: string;
        breakId: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"BREAK_ENDED">;
        shiftId: z.ZodString;
        breakId: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        kind: "BREAK_ENDED";
        shiftId: string;
        breakId: string;
    }, {
        kind: "BREAK_ENDED";
        shiftId: string;
        breakId: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"REVERSAL_POSTED">;
        reversesEventId: z.ZodString;
        reasonCode: z.ZodString;
        approvedById: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        kind: "REVERSAL_POSTED";
        reasonCode: string;
        approvedById: string;
        reversesEventId: string;
    }, {
        kind: "REVERSAL_POSTED";
        reasonCode: string;
        approvedById: string;
        reversesEventId: string;
    }>, z.ZodObject<{
        kind: z.ZodLiteral<"RECONCILIATION_APPROVED">;
        reconciliationId: z.ZodString;
        periodFrom: z.ZodEffects<z.ZodString, string, string>;
        periodToExclusive: z.ZodEffects<z.ZodString, string, string>;
        currency: z.ZodString;
        currencyExponent: z.ZodNumber;
        eventSetHash: z.ZodString;
        approvedById: z.ZodString;
        approvedAt: z.ZodString;
    }, "strict", z.ZodTypeAny, {
        currency: string;
        currencyExponent: number;
        kind: "RECONCILIATION_APPROVED";
        approvedById: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
        eventSetHash: string;
        approvedAt: string;
    }, {
        currency: string;
        currencyExponent: number;
        kind: "RECONCILIATION_APPROVED";
        approvedById: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
        eventSetHash: string;
        approvedAt: string;
    }>]>;
}, "strict", z.ZodTypeAny, {
    photographerId: string;
    schemaVersion: "1";
    scope: {
        deskId: string;
        timezone: string;
        tenantId?: string | undefined;
    };
    eventId: string;
    producer: "MASTER" | "MANAGEMENT_HUB" | "GALLERY" | "CLOUD_BACKEND" | "MOBILE_PHOTOGRAPHER" | "SYSTEM_IMPORT";
    producerEventId: string;
    occurredAt: string;
    recordedAt: string;
    sourceRecordId: string;
    payload: {
        orderId: string;
        kind: "ORDER_COMPLETED";
        gross: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        tips: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        photoCount: number;
    } | {
        orderId: string;
        kind: "PAYMENT_CAPTURED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        method: "CASH" | "CARD" | "STRIPE" | "OTHER";
    } | {
        orderId: string;
        kind: "SETTLEMENT_POSTED";
        paymentId: string;
        settlementId: string;
        grossAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        feeAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        netAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
    } | {
        orderId: string;
        kind: "REFUND_POSTED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        refundId: string;
        reasonCode: string;
    } | {
        orderId: string;
        kind: "ATTRIBUTION_ASSIGNED";
        method: "DIRECT_CAPTURE" | "ALBUM_OWNER" | "KIOSK_SESSION" | "MANUAL_REVIEW" | "SYSTEM_RULE";
        confidenceBps: number | null;
        assignedById?: string | undefined;
    } | {
        orderId: string;
        kind: "COMMISSION_ACCRUED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        commissionId: string;
        policyId: string;
        policyVersion: string;
        basis: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        rateBps: number;
    } | {
        kind: "ADJUSTMENT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        reasonCode: string;
        adjustmentId: string;
        direction: "CREDIT" | "DEBIT";
        approvedById: string;
    } | {
        kind: "PAYOUT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        payoutId: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_STARTED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_ENDED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        kind: "BREAK_STARTED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "BREAK_ENDED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "REVERSAL_POSTED";
        reasonCode: string;
        approvedById: string;
        reversesEventId: string;
    } | {
        currency: string;
        currencyExponent: number;
        kind: "RECONCILIATION_APPROVED";
        approvedById: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
        eventSetHash: string;
        approvedAt: string;
    };
    correlationId?: string | undefined;
    causationEventId?: string | undefined;
}, {
    photographerId: string;
    schemaVersion: "1";
    scope: {
        deskId: string;
        timezone: string;
        tenantId?: string | undefined;
    };
    eventId: string;
    producer: "MASTER" | "MANAGEMENT_HUB" | "GALLERY" | "CLOUD_BACKEND" | "MOBILE_PHOTOGRAPHER" | "SYSTEM_IMPORT";
    producerEventId: string;
    occurredAt: string;
    recordedAt: string;
    sourceRecordId: string;
    payload: {
        orderId: string;
        kind: "ORDER_COMPLETED";
        gross: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        tips: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        photoCount: number;
    } | {
        orderId: string;
        kind: "PAYMENT_CAPTURED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        method: "CASH" | "CARD" | "STRIPE" | "OTHER";
    } | {
        orderId: string;
        kind: "SETTLEMENT_POSTED";
        paymentId: string;
        settlementId: string;
        grossAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        feeAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        netAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
    } | {
        orderId: string;
        kind: "REFUND_POSTED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        refundId: string;
        reasonCode: string;
    } | {
        orderId: string;
        kind: "ATTRIBUTION_ASSIGNED";
        method: "DIRECT_CAPTURE" | "ALBUM_OWNER" | "KIOSK_SESSION" | "MANUAL_REVIEW" | "SYSTEM_RULE";
        confidenceBps: number | null;
        assignedById?: string | undefined;
    } | {
        orderId: string;
        kind: "COMMISSION_ACCRUED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        commissionId: string;
        policyId: string;
        policyVersion: string;
        basis: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        rateBps: number;
    } | {
        kind: "ADJUSTMENT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        reasonCode: string;
        adjustmentId: string;
        direction: "CREDIT" | "DEBIT";
        approvedById: string;
    } | {
        kind: "PAYOUT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        payoutId: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_STARTED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_ENDED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        kind: "BREAK_STARTED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "BREAK_ENDED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "REVERSAL_POSTED";
        reasonCode: string;
        approvedById: string;
        reversesEventId: string;
    } | {
        currency: string;
        currencyExponent: number;
        kind: "RECONCILIATION_APPROVED";
        approvedById: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
        eventSetHash: string;
        approvedAt: string;
    };
    correlationId?: string | undefined;
    causationEventId?: string | undefined;
}>, {
    photographerId: string;
    schemaVersion: "1";
    scope: {
        deskId: string;
        timezone: string;
        tenantId?: string | undefined;
    };
    eventId: string;
    producer: "MASTER" | "MANAGEMENT_HUB" | "GALLERY" | "CLOUD_BACKEND" | "MOBILE_PHOTOGRAPHER" | "SYSTEM_IMPORT";
    producerEventId: string;
    occurredAt: string;
    recordedAt: string;
    sourceRecordId: string;
    payload: {
        orderId: string;
        kind: "ORDER_COMPLETED";
        gross: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        tips: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        photoCount: number;
    } | {
        orderId: string;
        kind: "PAYMENT_CAPTURED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        method: "CASH" | "CARD" | "STRIPE" | "OTHER";
    } | {
        orderId: string;
        kind: "SETTLEMENT_POSTED";
        paymentId: string;
        settlementId: string;
        grossAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        feeAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        netAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
    } | {
        orderId: string;
        kind: "REFUND_POSTED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        refundId: string;
        reasonCode: string;
    } | {
        orderId: string;
        kind: "ATTRIBUTION_ASSIGNED";
        method: "DIRECT_CAPTURE" | "ALBUM_OWNER" | "KIOSK_SESSION" | "MANUAL_REVIEW" | "SYSTEM_RULE";
        confidenceBps: number | null;
        assignedById?: string | undefined;
    } | {
        orderId: string;
        kind: "COMMISSION_ACCRUED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        commissionId: string;
        policyId: string;
        policyVersion: string;
        basis: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        rateBps: number;
    } | {
        kind: "ADJUSTMENT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        reasonCode: string;
        adjustmentId: string;
        direction: "CREDIT" | "DEBIT";
        approvedById: string;
    } | {
        kind: "PAYOUT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        payoutId: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_STARTED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_ENDED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        kind: "BREAK_STARTED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "BREAK_ENDED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "REVERSAL_POSTED";
        reasonCode: string;
        approvedById: string;
        reversesEventId: string;
    } | {
        currency: string;
        currencyExponent: number;
        kind: "RECONCILIATION_APPROVED";
        approvedById: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
        eventSetHash: string;
        approvedAt: string;
    };
    correlationId?: string | undefined;
    causationEventId?: string | undefined;
}, {
    photographerId: string;
    schemaVersion: "1";
    scope: {
        deskId: string;
        timezone: string;
        tenantId?: string | undefined;
    };
    eventId: string;
    producer: "MASTER" | "MANAGEMENT_HUB" | "GALLERY" | "CLOUD_BACKEND" | "MOBILE_PHOTOGRAPHER" | "SYSTEM_IMPORT";
    producerEventId: string;
    occurredAt: string;
    recordedAt: string;
    sourceRecordId: string;
    payload: {
        orderId: string;
        kind: "ORDER_COMPLETED";
        gross: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        tips: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        photoCount: number;
    } | {
        orderId: string;
        kind: "PAYMENT_CAPTURED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        method: "CASH" | "CARD" | "STRIPE" | "OTHER";
    } | {
        orderId: string;
        kind: "SETTLEMENT_POSTED";
        paymentId: string;
        settlementId: string;
        grossAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        feeAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        netAmount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
    } | {
        orderId: string;
        kind: "REFUND_POSTED";
        paymentId: string;
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        refundId: string;
        reasonCode: string;
    } | {
        orderId: string;
        kind: "ATTRIBUTION_ASSIGNED";
        method: "DIRECT_CAPTURE" | "ALBUM_OWNER" | "KIOSK_SESSION" | "MANUAL_REVIEW" | "SYSTEM_RULE";
        confidenceBps: number | null;
        assignedById?: string | undefined;
    } | {
        orderId: string;
        kind: "COMMISSION_ACCRUED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        commissionId: string;
        policyId: string;
        policyVersion: string;
        basis: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        rateBps: number;
    } | {
        kind: "ADJUSTMENT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        reasonCode: string;
        adjustmentId: string;
        direction: "CREDIT" | "DEBIT";
        approvedById: string;
    } | {
        kind: "PAYOUT_POSTED";
        amount: {
            amountMinor: number;
            currency: string;
            currencyExponent: number;
        };
        payoutId: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_STARTED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        verification: "UNVERIFIED" | "BIOMETRIC" | "PIN" | "ADMIN";
        kind: "SHIFT_ENDED";
        shiftId: string;
        stationId?: string | undefined;
    } | {
        kind: "BREAK_STARTED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "BREAK_ENDED";
        shiftId: string;
        breakId: string;
    } | {
        kind: "REVERSAL_POSTED";
        reasonCode: string;
        approvedById: string;
        reversesEventId: string;
    } | {
        currency: string;
        currencyExponent: number;
        kind: "RECONCILIATION_APPROVED";
        approvedById: string;
        reconciliationId: string;
        periodFrom: string;
        periodToExclusive: string;
        eventSetHash: string;
        approvedAt: string;
    };
    correlationId?: string | undefined;
    causationEventId?: string | undefined;
}>;
export type PhotographerEventV1 = z.infer<typeof PhotographerEventV1Schema>;
export declare const PhotographerReconciliationIssueCodeV1Schema: z.ZodEnum<["MISSING_ORDER", "DUPLICATE_ORDER_COMPLETION", "MISSING_PAYMENT_CAPTURE", "MISSING_SETTLEMENT", "MISSING_ATTRIBUTION", "AMBIGUOUS_ATTRIBUTION", "PAYMENT_TOTAL_MISMATCH", "SETTLEMENT_TOTAL_MISMATCH", "REFUND_EXCEEDS_CAPTURE", "REFUND_WITHOUT_PAYMENT", "COMMISSION_WITHOUT_ORDER", "COMMISSION_WITHOUT_ATTRIBUTION", "CURRENCY_MISMATCH", "PAYOUT_WITHOUT_APPROVAL", "STALE_APPROVAL"]>;
export declare const PhotographerReconciliationReadinessV1Schema: z.ZodObject<{
    schemaVersion: z.ZodLiteral<"1">;
    status: z.ZodEnum<["UNAVAILABLE", "BLOCKED", "READY_FOR_REVIEW", "APPROVED"]>;
    scope: z.ZodObject<{
        photographerId: z.ZodString;
        deskId: z.ZodString;
        tenantId: z.ZodOptional<z.ZodString>;
        timezone: z.ZodEffects<z.ZodString, string, string>;
        periodFrom: z.ZodEffects<z.ZodString, string, string>;
        periodToExclusive: z.ZodEffects<z.ZodString, string, string>;
        currency: z.ZodString;
        currencyExponent: z.ZodNumber;
    }, "strict", z.ZodTypeAny, {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        periodFrom: string;
        periodToExclusive: string;
        tenantId?: string | undefined;
    }, {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        periodFrom: string;
        periodToExclusive: string;
        tenantId?: string | undefined;
    }>;
    assessedAt: z.ZodString;
    coveredEventCount: z.ZodNumber;
    eventSetHash: z.ZodNullable<z.ZodString>;
    approvalEventId: z.ZodNullable<z.ZodString>;
    issues: z.ZodArray<z.ZodObject<{
        code: z.ZodEnum<["MISSING_ORDER", "DUPLICATE_ORDER_COMPLETION", "MISSING_PAYMENT_CAPTURE", "MISSING_SETTLEMENT", "MISSING_ATTRIBUTION", "AMBIGUOUS_ATTRIBUTION", "PAYMENT_TOTAL_MISMATCH", "SETTLEMENT_TOTAL_MISMATCH", "REFUND_EXCEEDS_CAPTURE", "REFUND_WITHOUT_PAYMENT", "COMMISSION_WITHOUT_ORDER", "COMMISSION_WITHOUT_ATTRIBUTION", "CURRENCY_MISMATCH", "PAYOUT_WITHOUT_APPROVAL", "STALE_APPROVAL"]>;
        eventId: z.ZodOptional<z.ZodString>;
        orderId: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        code: "MISSING_ORDER" | "DUPLICATE_ORDER_COMPLETION" | "MISSING_PAYMENT_CAPTURE" | "MISSING_SETTLEMENT" | "MISSING_ATTRIBUTION" | "AMBIGUOUS_ATTRIBUTION" | "PAYMENT_TOTAL_MISMATCH" | "SETTLEMENT_TOTAL_MISMATCH" | "REFUND_EXCEEDS_CAPTURE" | "REFUND_WITHOUT_PAYMENT" | "COMMISSION_WITHOUT_ORDER" | "COMMISSION_WITHOUT_ATTRIBUTION" | "CURRENCY_MISMATCH" | "PAYOUT_WITHOUT_APPROVAL" | "STALE_APPROVAL";
        orderId?: string | undefined;
        eventId?: string | undefined;
    }, {
        code: "MISSING_ORDER" | "DUPLICATE_ORDER_COMPLETION" | "MISSING_PAYMENT_CAPTURE" | "MISSING_SETTLEMENT" | "MISSING_ATTRIBUTION" | "AMBIGUOUS_ATTRIBUTION" | "PAYMENT_TOTAL_MISMATCH" | "SETTLEMENT_TOTAL_MISMATCH" | "REFUND_EXCEEDS_CAPTURE" | "REFUND_WITHOUT_PAYMENT" | "COMMISSION_WITHOUT_ORDER" | "COMMISSION_WITHOUT_ATTRIBUTION" | "CURRENCY_MISMATCH" | "PAYOUT_WITHOUT_APPROVAL" | "STALE_APPROVAL";
        orderId?: string | undefined;
        eventId?: string | undefined;
    }>, "many">;
}, "strict", z.ZodTypeAny, {
    status: "UNAVAILABLE" | "APPROVED" | "BLOCKED" | "READY_FOR_REVIEW";
    issues: {
        code: "MISSING_ORDER" | "DUPLICATE_ORDER_COMPLETION" | "MISSING_PAYMENT_CAPTURE" | "MISSING_SETTLEMENT" | "MISSING_ATTRIBUTION" | "AMBIGUOUS_ATTRIBUTION" | "PAYMENT_TOTAL_MISMATCH" | "SETTLEMENT_TOTAL_MISMATCH" | "REFUND_EXCEEDS_CAPTURE" | "REFUND_WITHOUT_PAYMENT" | "COMMISSION_WITHOUT_ORDER" | "COMMISSION_WITHOUT_ATTRIBUTION" | "CURRENCY_MISMATCH" | "PAYOUT_WITHOUT_APPROVAL" | "STALE_APPROVAL";
        orderId?: string | undefined;
        eventId?: string | undefined;
    }[];
    schemaVersion: "1";
    scope: {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        periodFrom: string;
        periodToExclusive: string;
        tenantId?: string | undefined;
    };
    eventSetHash: string | null;
    assessedAt: string;
    coveredEventCount: number;
    approvalEventId: string | null;
}, {
    status: "UNAVAILABLE" | "APPROVED" | "BLOCKED" | "READY_FOR_REVIEW";
    issues: {
        code: "MISSING_ORDER" | "DUPLICATE_ORDER_COMPLETION" | "MISSING_PAYMENT_CAPTURE" | "MISSING_SETTLEMENT" | "MISSING_ATTRIBUTION" | "AMBIGUOUS_ATTRIBUTION" | "PAYMENT_TOTAL_MISMATCH" | "SETTLEMENT_TOTAL_MISMATCH" | "REFUND_EXCEEDS_CAPTURE" | "REFUND_WITHOUT_PAYMENT" | "COMMISSION_WITHOUT_ORDER" | "COMMISSION_WITHOUT_ATTRIBUTION" | "CURRENCY_MISMATCH" | "PAYOUT_WITHOUT_APPROVAL" | "STALE_APPROVAL";
        orderId?: string | undefined;
        eventId?: string | undefined;
    }[];
    schemaVersion: "1";
    scope: {
        photographerId: string;
        deskId: string;
        timezone: string;
        currency: string;
        currencyExponent: number;
        periodFrom: string;
        periodToExclusive: string;
        tenantId?: string | undefined;
    };
    eventSetHash: string | null;
    assessedAt: string;
    coveredEventCount: number;
    approvalEventId: string | null;
}>;
export type PhotographerReconciliationReadinessV1 = z.infer<typeof PhotographerReconciliationReadinessV1Schema>;
export interface RevenueSnapshot {
    date: string;
    hourlyRevenue: Record<string, number>;
    totalRevenue: number;
    orderCount: number;
}
export interface ProductStats {
    productId: string;
    name: string;
    category: string;
    quantitySold: number;
    revenue: number;
}
export interface PhotographerPerformance {
    photographerId: string;
    name: string;
    revenueGenerated: number;
    ordersCompleted: number;
    averageOrderValue: number;
    processingEfficiency: number;
}
export interface StationStatus {
    success: boolean;
    health: {
        cpuLoad: number;
        cpuTemp: number | null;
        memoryUsed: number;
        memoryTotal: number;
        memoryPercent: number;
        diskUsed: number;
        diskTotal: number;
        diskPercent: number;
        diskIO: number;
        networkLatency: number;
        uptime: number;
        timestamp: string;
    } | null;
    sync: {
        timestamp: string;
        lastSync: string | null;
        isConnected: boolean;
        queue: {
            pending: number;
            failed: number;
        };
        circuit: {
            state: "CLOSED" | "OPEN" | "HALF_OPEN";
            openedAt: string | null;
        };
    } | null;
    identity: {
        deskId: string | null;
        machineId: string;
        isProvisioned: boolean;
        provisioningStatus: "VERIFIED" | "PENDING_TRIAGE" | "UNPROVISIONED";
    } | null;
    timestamp: string;
}
export interface MobileSession extends BaseRecord {
    photographerId: string | number;
    deviceId: string;
    deviceModel?: string;
    loginTime: string;
    lastActive: string;
    token: string;
    status: 'active' | 'expired' | 'revoked';
}
export interface FaceVector extends BaseRecord {
    photoId: string;
    descriptor: number[];
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export type WeatherCondition = 'Clear' | 'Cloudy' | 'Rain' | 'Snow' | 'Extreme';
export type CrowdDensity = 'Low' | 'Medium' | 'High' | 'Peak';
export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export interface DynamicPriceMultiplier {
    baseMultiplier: number;
    weather?: Partial<Record<WeatherCondition, number>>;
    crowdDensity?: Partial<Record<CrowdDensity, number>>;
    timeOfDay?: Partial<Record<TimeOfDay, number>>;
}
export interface YieldPricingRule extends BaseRecord {
    name: string;
    destinationId: string;
    isActive: boolean;
    priority: number;
    conditions: {
        weather?: WeatherCondition[];
        crowdDensity?: CrowdDensity[];
        timeOfDay?: TimeOfDay[];
    };
    multiplier: number;
    validFrom?: string;
    validTo?: string;
}
export type ReelFormat = '9:16_vertical' | '16:9_landscape' | '1:1_square';
export type ReelMusicGenre = 'cinematic' | 'upbeat' | 'resort_vacation' | 'trending' | 'epic';
export interface ReelRequest {
    galleryId: string;
    photoIds: string[];
    musicGenre?: ReelMusicGenre;
    format?: ReelFormat;
    durationSeconds?: number;
    includeKenBurns?: boolean;
}
export interface ReelJob extends BaseRecord {
    galleryId: string;
    format: ReelFormat;
    durationSeconds: number;
    status: 'queued' | 'rendering' | 'completed' | 'failed';
    videoUrl?: string;
    thumbnailUrl?: string;
    error?: string;
}
export type EnhanceLevel = 'auto-correct' | 'pro-retouch' | 'magic-shot' | 'cinematic-hdr';
export interface EnhancementRequest {
    photoId: string;
    originalUrl: string;
    level: EnhanceLevel;
    arElements?: string[];
    destinationTheme?: string;
}
export interface EnhanceJob extends BaseRecord {
    photoId: string;
    level: EnhanceLevel;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    enhancedUrl?: string;
    metadata?: Record<string, unknown>;
    error?: string;
}
export type Mesh3DStyle = 'realistic' | 'stylized' | 'low-poly';
export type Mesh3DFormat = 'gltf' | 'glb' | 'obj' | 'stl' | 'splat' | 'ply' | 'nerf';
export interface MeshGenerationRequest {
    photoIds: string[];
    style: Mesh3DStyle;
    format?: Mesh3DFormat;
    webhookUrl?: string;
    guestId?: string;
}
export interface Mesh3DJob extends BaseRecord {
    photoIds: string[];
    style: Mesh3DStyle;
    format: Mesh3DFormat;
    status: 'queued' | 'reconstructing_mesh' | 'texturing' | 'completed' | 'failed';
    modelUrl?: string;
    thumbnailUrl?: string;
    polygonCount?: number;
    error?: string;
}
export type GaussianSplatQuality = 'fast_preview' | 'cinematic_6dof' | 'ultra_dense';
export type GaussianSplatFormat = 'splat' | 'ply';
export interface CameraIntrinsics {
    focalLength?: number;
    fovDegrees?: number;
    sensorWidthMm?: number;
    principalPoint?: {
        x: number;
        y: number;
    };
    focalLengthX?: number;
    focalLengthY?: number;
    principalPointX?: number;
    principalPointY?: number;
    distortionCoefficients?: number[];
}
export interface GaussianSplatRequest {
    photoIds: string[];
    sceneId?: string;
    quality?: GaussianSplatQuality;
    format?: GaussianSplatFormat;
    cameraIntrinsics?: CameraIntrinsics;
    pointBudget?: number;
    boundingRadiusMeters?: number;
    webhookUrl?: string;
    guestId?: string;
}
export interface GaussianSplatJob extends BaseRecord {
    photoIds?: string[];
    sceneId?: string;
    quality?: GaussianSplatQuality | 'STANDARD' | 'HIGH' | 'CINEMATIC_4K';
    format?: GaussianSplatFormat;
    status?: 'queued' | 'feature_matching' | 'structure_from_motion' | 'gaussian_rasterization' | 'completed' | 'failed' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    splatUrl?: string;
    plyUrl?: string;
    thumbnailUrl?: string;
    splatCount?: number;
    fileSizeBytes?: number;
    compressionRatio?: number;
    renderFpsEstimate?: number;
    error?: string;
}
export interface SalvageAnalysis extends BaseRecord {
    photoId: string;
    galleryId: string;
    filePath: string;
    emotionalScore: number;
    smileScore: number;
    sharpnessScore: number;
    compositionScore?: number;
    aiSalvageScore: number;
    recommendation: 'salvage_for_upsell' | 'archive_cold_storage' | 'purge';
    reasoning?: string;
}
export type SalvageItem = SalvageAnalysis;
export interface BatchAnalyzerEvent extends BaseRecord {
    batchId: string;
    destinationId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    totalPhotosScanned: number;
    salvagedCount: number;
    archivedCount: number;
    purgedCount: number;
    analyses: SalvageAnalysis[];
}
export interface UnsoldBatchScanResult {
    totalScanned: number;
    salvagedCount: number;
    archivedCount: number;
    purgedCount: number;
    items: SalvageAnalysis[];
    campaign?: SalvageCampaign;
}
export interface SalvageCampaign {
    id: string;
    galleryId: string;
    guestPhone?: string;
    guestEmail?: string;
    discountPercentage: number;
    magicLinkUrl: string;
    expiresAt: string;
    status: 'draft' | 'dispatched' | 'converted' | 'expired';
}
export interface MediaDiscardEvent extends BaseRecord {
    photoId: string;
    batchId: string;
    photographerId: string | number;
    discardReason: 'low_quality' | 'unrecognized_faces' | 'excessive_blur' | 'storage_optimization';
    deletedAt: string;
    purgedFromStorage: boolean;
}
export interface SalesTriggerEvent extends BaseRecord {
    triggerId: string;
    batchId: string;
    galleryId: string;
    guestPhone?: string;
    guestWhatsApp?: string;
    aiSalvageScore: number;
    selectedPhotoIds: string[];
    proposedDiscountPercentage: number;
    magicLinkUrl?: string;
    dispatchedToWhatsApp: boolean;
    dispatchedAt?: string;
}
export interface MetaWebhookEntry {
    id: string;
    time?: number;
    changes: Array<{
        field: string;
        value: {
            messaging_product: string;
            metadata: {
                display_phone_number: string;
                phone_number_id: string;
            };
            contacts?: Array<{
                profile: {
                    name: string;
                };
                wa_id: string;
            }>;
            messages?: Array<{
                from: string;
                id: string;
                timestamp: string;
                type: 'text' | 'interactive' | 'button' | 'image' | 'location' | 'unknown' | string;
                text?: {
                    body: string;
                };
                interactive?: {
                    type: 'button_reply' | 'list_reply' | string;
                    button_reply?: {
                        id: string;
                        title: string;
                    };
                    list_reply?: {
                        id: string;
                        title: string;
                        description?: string;
                    };
                };
                button?: {
                    text: string;
                    payload?: string;
                };
            }>;
            statuses?: Array<{
                id: string;
                status: 'sent' | 'delivered' | 'read' | 'failed' | string;
                timestamp: string;
                recipient_id: string;
            }>;
        };
    }>;
}
export interface MetaWebhookPayload {
    object: string;
    entry: MetaWebhookEntry[];
}
export interface SwarmLeadEngagement {
    guestId?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerName?: string;
    resortName?: string;
    albumId?: string;
    galleryId?: string;
    totalOpened?: number;
    totalFavorites?: number;
    cartTotal?: number;
    lastActiveAt?: number;
    topActivity?: string;
    whatsappOptIn?: boolean;
}
export interface SwarmNegotiationSession extends BaseRecord {
    phoneNumber: string;
    guestId?: string;
    albumId?: string;
    engagementLevel: 'COLD' | 'WARM' | 'HOT';
    offeredDiscountPercentage: number;
    offeredDiscountCode?: string;
    magicLinkUrl?: string;
    status: 'active' | 'converted' | 'expired' | 'declined';
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: string;
    }>;
}
export interface SwarmDispatchResult {
    success: boolean;
    leadId?: string;
    recipientPhone: string;
    message: string;
    discountCode?: string;
    discountPercentage?: number;
    magicLinkUrl?: string;
    urgencyLevel: 'low' | 'medium' | 'high';
}
export type PhotoGradeCategory = 'HERO_GRADE' | 'COMMERCIAL_GRADE' | 'EMOTIONAL_SAVED_GRADE' | 'DISCARD_GRADE';
export interface TechnicalMetrics {
    sharpnessScore: number;
    contrastScore: number;
    lightingScore: number;
    exposureScore: number;
    blurScore: number;
    compositionScore: number;
}
export interface VlmEmotionalMetrics {
    emotionalScore: number;
    smileScore: number;
    eyeContactScore: number;
    candidBondingScore: number;
    triumphMomentScore: number;
    emotionalKeywords: string[];
    sceneDescription: string;
}
export interface AIGradingResult {
    photoId: string;
    filePath: string;
    galleryId?: string;
    category: PhotoGradeCategory;
    overallScore: number;
    technicalMetrics: TechnicalMetrics;
    emotionalMetrics: VlmEmotionalMetrics;
    emotionalBypassTriggered: boolean;
    emotionalBypassReason?: string;
    suggestedCrop?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    monetizationTags: string[];
    gradeReason: string;
    processedAt: string;
}
export interface AIGradeBatchRequest {
    photos: Array<{
        filePath: string;
        photoId?: string;
        galleryId?: string;
    }>;
    concurrencyLimit?: number;
    bypassThreshold?: number;
    minHeroScore?: number;
}
export interface AIGradeBatchResult {
    total: number;
    heroCount: number;
    commercialCount: number;
    emotionalSavedCount: number;
    discardCount: number;
    durationMs: number;
    results: AIGradingResult[];
}
export interface SpatialHoloGalleryConfig {
    fov: number;
    ambientLightIntensity: number;
    spatialDepthScale: number;
    enableHeadTracking: boolean;
    enableSpatialAudio: boolean;
    theme: 'CRYSTAL_ORBIT' | 'CYBER_GALLERY' | 'VOLUMETRIC_HORIZON';
}
export interface WebGPUProcessingPipeline {
    supported: boolean;
    deviceType?: 'discrete' | 'integrated' | 'cpu';
    maxTextureDimension2D?: number;
    superResolutionFactor: 2 | 4;
    activeModel: 'EDSR_QUANTIZED' | 'ESRGAN_COMPACT' | 'BOKEH_NEURAL_SEGMENT';
}
export interface VoiceConciergeSession extends BaseRecord {
    sessionId: string;
    guestLanguage: string;
    voiceStyle: 'ENERGETIC_RESORT_GUIDE' | 'LUXURY_VIP_CONCIERGE' | 'FRIENDLY_LOCAL_PHOTOGRAPHER';
    activeIntent?: 'BROWSE_PHOTOS' | 'SELECT_BUNDLE' | 'MAGIC_EDIT' | 'CHECKOUT' | 'FAQ';
    transcriptLog: Array<{
        speaker: 'guest' | 'concierge';
        text: string;
        timestamp: string;
    }>;
}
export interface AutonomousRoboticTelemetry extends BaseRecord {
    nodeType: 'DRONE_DOCK' | 'COASTER_HIGH_SPEED_CAM' | 'ROVING_ROVER_CAM';
    batteryPercentage: number;
    connectionStatus: 'ONLINE_5G' | 'LAN_UWB' | 'DEGRADED';
    activeMission?: string;
    coordinates: {
        lat: number;
        lng: number;
        altitudeMeters?: number;
    };
    capturesPerMinute: number;
    storageAvailableGb: number;
}
export interface GaussianSplatModel extends BaseRecord {
    splatUrl: string;
    pointCount: number;
    boundsRadius: number;
    focalLength: number;
    sceneClassification: 'COASTER_LOOP' | 'CHARACTER_MEET' | 'WATER_SPLASH' | 'SCENIC_PANORAMA';
    qualityScore: number;
    lodLevels: number;
}
export interface TranscodeChunk {
    chunkIndex: number;
    startTimeSec: number;
    durationSec: number;
    assignedNodeId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    chunkOutputUrl?: string;
    renderTimeMs?: number;
    error?: string;
}
export interface TranscodeGridNode {
    nodeId: string;
    role: 'MASTER' | 'TOUCH_KIOSK' | 'WORKER_EDGE';
    ipAddress: string;
    port: number;
    hardwareCores: number;
    hasGpuAcceleration: boolean;
    isBusy: boolean;
    currentLoadPercent: number;
    lastHeartbeatTimestamp: number;
}
export interface DistributedTranscodingJob extends BaseRecord {
    jobId: string;
    sourceAssetUrl: string;
    targetFormat: '4K_H265' | 'PRORES_HERO' | 'TIKTOK_9_16_BEAT_SYNC';
    chunkCount: number;
    completedChunks: number;
    assignedNodes: string[];
    status: 'QUEUED' | 'SLICING' | 'TRANSCODING' | 'STITCHING' | 'COMPLETED' | 'FAILED';
    renderTimeMs?: number;
    outputUrl?: string;
    chunks?: TranscodeChunk[];
    error?: string;
}
export interface NlpSemanticQuery {
    queryText: string;
    queryEmbedding?: number[];
    categoryFilter?: string;
    minSimilarity: number;
    maxResults: number;
}
export interface DroneMissionDispatch extends BaseRecord {
    missionId: string;
    droneNodeId: string;
    vipGuestId: string;
    flightPathMode: 'ORBIT_360' | 'HERO_FLYBY' | 'PULLBACK_REVEAL' | 'STATIONARY_HOVER';
    targetGps: {
        latitude: number;
        longitude: number;
        altitudeMeters: number;
    };
    status: 'PREFLIGHT' | 'AIRBORNE' | 'RECORDING' | 'RETURNING' | 'LANDED_CHARGING';
    batteryRemainingPercent: number;
}
export type LightingPreset = 'GOLDEN_HOUR' | 'CYBERPUNK_NEON' | 'DRAMATIC_SUNSET' | 'STUDIO_REMBRANDT' | 'FAIRY_TALE_DUSK' | 'MOONLIT_NIGHT';
export interface NeuralRelightingConfig {
    preset: LightingPreset;
    intensity: number;
    lightAzimuthDeg: number;
    lightElevationDeg: number;
    colorTemperatureK: number;
    specularBoost: number;
    depthThreshold: number;
}
export interface AtmosphericVfxJob extends BaseRecord {
    photoId: string;
    relightingConfig: NeuralRelightingConfig;
    particleEffect?: 'FIREWORKS' | 'GOLDEN_DUST' | 'MAGICAL_SNOW' | 'AURORA_BOREALIS' | 'WATER_DROPLET_SPARKLE';
    outputUrl?: string;
    depthMapUrl?: string;
    processingTimeMs?: number;
    status: 'QUEUED' | 'ESTIMATING_DEPTH' | 'COMPUTING_PBR_RELIGHT' | 'COMPLETED' | 'FAILED';
}
export interface NeuromorphicCaptureFrame {
    frameIndex: number;
    timestampMicroseconds: number;
    opticalFlowMagnitude: number;
    velocityVector: {
        x: number;
        y: number;
    };
    motionBlurScore: number;
    deblurredBufferUrl?: string;
    coherenceConfidence: number;
}
export interface HighSpeedMotionDeblurConfig {
    shutterSpeedMicroseconds: number;
    coasterSpeedKmh: number;
    targetResolution: '1080P_120FPS' | '4K_60FPS' | '8K_RAW';
    motionVectorInterpolationPasses: number;
    eventThreshold: number;
}
export interface GameTheoreticYieldQuote {
    sessionId: string;
    guestFamilySize: number;
    parkDwellHours: number;
    totalPhotosCaptured: number;
    rawCartValueUsd: number;
    elasticityScore: number;
    recommendedBundleDiscountPercent: number;
    optimizedPriceUsd: number;
    includedVipPerks: string[];
    expirationSeconds: number;
    negotiationRound: number;
}
export interface ZeroTrustNodeAttestation {
    nodeId: string;
    hardwareFingerprintDigest: string;
    tpmEnclavePublicKey: string;
    leaseGrantedAt: string;
    leaseExpiresAt: string;
    allowedCapabilities: Array<'EDGE_INGESTION' | 'VECTOR_SEARCH' | 'TRANSCODE_GRID' | 'SPLATTING_3D' | 'PAYMENT_CAPTURE'>;
    signatureEd25519: string;
    nonce: string;
}
export interface AudioSteganographicPayload {
    guestId: string;
    albumId: string;
    carrierFrequencyHz: number;
    watermarkDigest: string;
    forensicTimestamp: number;
    inaudibleCarrierEnabled: boolean;
}
export interface StoryboardChapter {
    title: string;
    narrativeScript: string;
    photoIds: string[];
    durationSeconds: number;
    cameraMotion: 'KEN_BURNS_PAN' | 'PARALLAX_ZOOM' | 'MATRIX_ORBIT';
    bgmTrack: string;
}
export interface AiNarrativeFilmStoryboard extends BaseRecord {
    storyboardId: string;
    guestFamilyName: string;
    totalDurationSeconds: number;
    narratorVoice: 'DISNEY_WARM_STORYTELLER' | 'EPIC_CINEMATIC_HERO' | 'CHEERFUL_RESORT_HOST';
    chapters: StoryboardChapter[];
    status: 'DRAFTING' | 'GENERATING_VOICE' | 'COMPOSING_4K' | 'READY';
    renderedFilmUrl?: string;
}
export interface FotaTelemetryHeartbeat extends BaseRecord {
    nodeId: string;
    nodeRole: 'MASTER_LAN_GATEWAY' | 'TOUCH_KIOSK' | 'MOBILE_PRO' | 'EDGE_CAMERA_UWB';
    firmwareVersion: string;
    cpuTempCelsius: number;
    shutterActuationsTotal: number;
    batteryPercentage?: number;
    storageFreeGb: number;
    pendingUpdateVersion?: string;
    lastPingTimestamp: number;
}
export interface PppCurrencyRate extends BaseRecord {
    currencyCode: string;
    countryName: string;
    pppMultiplier: number;
    rawExchangeRateToUsd: number;
    localizedSymbol: string;
}
export interface FourDGaussianVideoSequence extends BaseRecord {
    sequenceId: string;
    sceneName: string;
    totalFrames: number;
    fps: number;
    splatChunkUrls: string[];
    boundsRadiusMeters: number;
    compressionCodec: 'SPLAT_STREAM_V2' | 'DYNAMIC_LOD_4D';
    streamingBitrateKbps: number;
}
export interface MultilingualDubbingJob extends BaseRecord {
    jobId: string;
    sourceFilmId: string;
    targetLanguage: string;
    translatedScript: string;
    dubbedAudioUrl?: string;
    lipSyncConfidenceScore: number;
    status: 'QUEUED' | 'TRANSLATING' | 'VOICE_CLONING' | 'LIP_SYNCING' | 'COMPLETED' | 'FAILED';
}
export interface DroneSwarmFormation extends BaseRecord {
    formationId: string;
    activeDroneIds: string[];
    landmarkTarget: string;
    formationPattern: 'V_FORMATION' | 'SPIRAL_ASCENT' | 'PINWHEEL_360' | 'DYNAMIC_TRACKING';
    minSeparationMeters: number;
    collisionAvoidanceActive: boolean;
    status: 'FORMING' | 'COORDINATED_SHOOT' | 'DISPERSING' | 'RETURN_TO_DOCK';
}
export interface ZkBiometricRevocationProof extends BaseRecord {
    proofId: string;
    guestCommitmentHash: string;
    nullifierHash: string;
    snarkProofHex: string;
    verificationKeyDigest: string;
    isVerified: boolean;
    revokedAt: string;
}
