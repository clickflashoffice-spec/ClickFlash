
import Dexie, { Table } from 'dexie';
import { 
    Photographer, Order, Album, Product, Pack, TouchKiosk, SessionType, Currency, Booking,
    Destination, Expense, Loan, Adjustment, Equipment, ExpenseCategory, EquipmentCategory
} from '../types.ts';

export interface FileRecord {
    id: string;
    data: Blob;
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
    currencies!: Table<Currency & { id: string }, string>;
    files!: Table<FileRecord, string>; // Binary storage

    constructor() {
        super('StarMasterDB');
        // Dexie version() method typing workaround
        (this as unknown as { version: (n: number) => { stores: (schema: Record<string, string>) => void } }).version(4).stores({
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
    }
}

export const db = new StarMasterDatabase();
