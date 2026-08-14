
import Dexie, { Table } from 'dexie';
import {
    Photographer, Order, Album, Product, Pack, TouchKiosk, SessionType, Currency, Booking,
    Destination, Expense, Loan, Adjustment, Equipment, ExpenseCategory, EquipmentCategory
} from '../types.ts';

export interface CullingCacheEntry {
    albumId: string;
    data: any; // CullingAnalysisResult
    updatedAt: number;
}

export interface CustomerEngagementRecord {
    customerEmail: string;
    totalEmailsSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    lifetimeValue: number;
    engagementScore: number;
    lastEvent?: string;
    lastUpdated: number;
}

export interface EmailRetryRecord {
    id?: number;
    payload: any;
    retryCount: number;
    lastAttempt: number;
    status: 'pending' | 'failed';
}

export interface FileRecord {
    id: string;
    data: Blob;
}

export interface BackgroundJob {
    id?: number;
    type: 'thumbnail' | 'watermark' | 'migrate' | 'bridge_push' | 'ai_analyze' | 'auto_edit' | 'batch_enhance';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    priority: number;
    payload: unknown;
    retries: number;
    error?: string;
    createdAt: number;
    updatedAt: number;
}

export type AIBatchOperation = 'auto-enhance' | 'smart-crop' | 'face-retouch';

export interface BatchJob {
    id: string;
    photoIds: string[];
    operation: AIBatchOperation;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    progress: number;
    createdAt: number;
    completedAt?: number;
    error?: string;
}

export interface CampaignTemplate {
    id: string;
    name: string;
    type: 'post-event' | 'abandoned-cart' | 're-engagement' | 'manual';
    trigger?: string; // e.g., '1h-after-event', '1d-before-expiry'
    subjectTemplate: string;
    bodyHtml: string;
    bodyText: string;
    isActive: boolean;
    delayMinutes?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CampaignSend {
    id: string;
    campaignId: string;
    templateId?: string;
    customerEmail: string;
    albumId?: string;
    orderId?: string;
    status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
    sentAt?: string;
    deliveredAt?: string;
    openedAt?: string;
    clickedAt?: string;
    trackingId: string;
    messageId?: string;
    error?: string;
    metadata?: {
        ip?: string;
        userAgent?: string;
        linkClicked?: string;
    };
    qualityGateRouting?: string;
    createdAt: string;
}

export class StarMasterDatabase extends Dexie {
    users!: Table<Photographer, number>;
    orders!: Table<Order, string>;
    albums!: Table<Album, string>;
    products!: Table<Product, string>;
    packs!: Table<Pack, string>;
    kiosks!: Table<TouchKiosk, string>;
    sessionTypes!: Table<SessionType, string>;
    bookings!: Table<Booking, string>;
    destinations!: Table<Destination, string>;
    expenses!: Table<Expense, string>;
    loans!: Table<Loan, string>;
    adjustments!: Table<Adjustment, string>;
    equipment!: Table<Equipment, string>;
    expenseCategories!: Table<ExpenseCategory, string>;
    equipmentCategories!: Table<EquipmentCategory, string>;
    currencies!: Table<Currency, string>;
    files!: Table<FileRecord, string>; // Binary storage
    backgroundJobs!: Table<BackgroundJob, number>;
    campaignTemplates!: Table<CampaignTemplate, string>;
    campaignSends!: Table<CampaignSend, string>;
    cullingCache!: Table<CullingCacheEntry, string>;
    customerEngagements!: Table<CustomerEngagementRecord, string>;
    emailRetryQueue!: Table<EmailRetryRecord, number>;
    batchJobs!: Table<BatchJob, string>;

    constructor() {
        super('StarMasterDB');
        // Dexie version() method typing workaround
        const v = (this as unknown as { version: (n: number) => { stores: (schema: Record<string, string>) => any } });

        v.version(4).stores({
            users: 'id, email',
            orders: 'id, date, status, photographerId',
            albums: 'id, date, status, photographerId',
            products: 'id, category',
            packs: 'id',
            kiosks: 'id',
            sessionTypes: 'id',
            bookings: 'id, bookingDate, status, photographerId',
            destinations: 'id',
            expenses: 'id, date, category, destinationId, photographerId',
            loans: 'id, status',
            adjustments: 'id, date, photographerId, status',
            equipment: 'id, type, status, destinationId, assignedToPhotographerId',
            expenseCategories: 'id',
            equipmentCategories: 'id',
            currencies: 'id',
            files: 'id' // No indexing needed on data
        });

        v.version(5).stores({
            backgroundJobs: '++id, type, status, priority, createdAt'
        });

        v.version(7).stores({
            campaignTemplates: 'id, type, trigger, isActive',
            campaignSends: 'id, campaignId, templateId, customerEmail, status, sentAt, trackingId, createdAt',
            dataVersions: 'collection, version, lastUpdated'
        });

        v.version(8).stores({
            cullingCache: 'albumId',
            customerEngagements: 'customerEmail',
            emailRetryQueue: '++id, status, lastAttempt'
        });

        v.version(9).stores({
            batchJobs: 'id, status, createdAt'
        });
    }
}

export interface DataVersionRecord {
    collection: string;
    version: number;
    lastUpdated: number;
    data?: unknown;
}

export const db = new StarMasterDatabase();
