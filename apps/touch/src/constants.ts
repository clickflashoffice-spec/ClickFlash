
import {
    Album, Photographer, Photo, Order, DailyObjective, LoginHistory, TouchKiosk,
    Product, Pack, Currency, FileSystemItem, SessionType, Booking, WorkingHours, PhotoCategory,
    Destination, Expense, Loan, Adjustment, Equipment, ExpenseCategory, EquipmentCategory, OrderItem
} from './types';

// --- CONFIGURATION CONSTANTS ---
export const DEFAULT_MASTER_PORT = 8090;
export const DEFAULT_TOUCH_PORT = 8091; // Aligned with server.js default
export const DEFAULT_MASTER_HOST = '127.0.0.1';
export const DEFAULT_MASTER_BASE_URL = `http://${DEFAULT_MASTER_HOST}:${DEFAULT_MASTER_PORT}`; // Master backend: 8090

// Kiosk configuration
export const LEGACY_KIOSK_ID = '123'; // Legacy/unconfigured kiosk ID sentinel value
export const KIOSK_ID_PATTERN = /^kiosk-[a-z0-9]+$/;

// --- MOCK DATA ---

const PHOTO_URLS = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop', // Beach
    'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1000&auto=format&fit=crop', // Beach Sunset
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1000&auto=format&fit=crop', // Massage/Spa
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1000&auto=format&fit=crop', // Pool
    'https://images.unsplash.com/photo-1514362545857-3bc16549766b?q=80&w=1000&auto=format&fit=crop', // Dinner
    'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000&auto=format&fit=crop', // Cinque Terre
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1000&auto=format&fit=crop', // Venice
    'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?q=80&w=1000&auto=format&fit=crop', // Mountain
    'https://images.unsplash.com/photo-1533929736472-11199a9d55ae?q=80&w=1000&auto=format&fit=crop', // Party
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1000&auto=format&fit=crop'  // Club
];

export const MOCK_FILE_SYSTEM: FileSystemItem[] = [
    {
        name: 'OS (C:)',
        type: 'folder',
        path: 'C:',
        children: [
            { name: 'Users', type: 'folder', path: 'C:/Users', children: [] },
            { name: 'Windows', type: 'folder', path: 'C:/Windows', children: [] },
        ]
    },
    {
        name: 'SD Card (E:)',
        type: 'folder',
        path: 'E:',
        children: [
            {
                name: 'DCIM',
                type: 'folder',
                path: 'E:/DCIM',
                children: [
                    {
                        name: '100_CANON',
                        type: 'folder',
                        path: 'E:/DCIM/100_CANON',
                        children: PHOTO_URLS.slice(0, 5).map((url, i) => ({
                            name: `IMG_000${i + 1}.JPG`,
                            type: 'photo',
                            path: `E:/DCIM/100_CANON/IMG_000${i + 1}.JPG`,
                            photo: { id: `imp_${i}`, title: `Import ${i + 1}`, url, photographerId: 1, albumId: '' }
                        }))
                    }
                ]
            }
        ]
    }
];

export const MOCK_WORKING_HOURS: WorkingHours = {
    monday: { shift1: { start: '09:00', end: '13:00', enabled: true }, shift2: { start: '15:00', end: '19:00', enabled: true } },
    tuesday: { shift1: { start: '09:00', end: '13:00', enabled: true }, shift2: { start: '15:00', end: '19:00', enabled: true } },
    wednesday: { shift1: { start: '09:00', end: '13:00', enabled: true }, shift2: { start: '15:00', end: '19:00', enabled: true } },
    thursday: { shift1: { start: '09:00', end: '13:00', enabled: true }, shift2: { start: '15:00', end: '19:00', enabled: true } },
    friday: { shift1: { start: '09:00', end: '13:00', enabled: true }, shift2: { start: '15:00', end: '19:00', enabled: true } },
    saturday: { shift1: { start: '10:00', end: '14:00', enabled: true }, shift2: { start: '', end: '', enabled: false } },
    sunday: { shift1: { start: '', end: '', enabled: false }, shift2: { start: '', end: '', enabled: false } },
};

export const MOCK_PHOTOGRAPHERS: Photographer[] = [
    { id: '1', name: 'Alaeddine', email: 'alaeddine@example.com', specialty: 'Portraits', avatarUrl: 'https://i.pravatar.cc/150?u=alaeddine', role: 'CEO', monthlyTarget: 10000, dailyPhotoTarget: 500, workingHours: MOCK_WORKING_HOURS, payrollType: 'Salary', monthlySalary: 5000, destinationId: 'dest1' },
    { id: '2', name: 'Jane Doe', email: 'jane@example.com', specialty: 'Landscapes', avatarUrl: 'https://i.pravatar.cc/150?u=jane', role: 'Team Leader', monthlyTarget: 7500, dailyPhotoTarget: 400, workingHours: MOCK_WORKING_HOURS, payrollType: 'Salary', monthlySalary: 3500, destinationId: 'dest1' },
    { id: '3', name: 'Carlos Estevez', email: 'carlos@example.com', specialty: 'Events', avatarUrl: 'https://i.pravatar.cc/150?u=carlos', role: 'Admin', monthlyTarget: 5000, dailyPhotoTarget: 300, workingHours: MOCK_WORKING_HOURS, payrollType: 'Commission', commissionRate: 0.15, destinationId: 'dest2' },
    { id: '4', name: 'Emily Carter', email: 'emily@example.com', specialty: 'Weddings', avatarUrl: 'https://i.pravatar.cc/150?u=emily', role: 'Photographer', monthlyTarget: 6000, dailyPhotoTarget: 350, workingHours: MOCK_WORKING_HOURS, payrollType: 'Commission', commissionRate: 0.20, destinationId: 'dest1' },
];

// --- Rich Album Data for Testing ---
export const MOCK_ALBUMS: Album[] = [
    {
        id: 'album1', title: 'Sunset Couples', date: '2025-10-24', coverPhotoUrl: PHOTO_URLS[1], photographerId: 2, source: '100_NIKON', roomNumber: '101',
        status: 'Finalized', categories: ['Photo Session', 'Evening'],
        photos: [
            { id: 'p1a1', title: 'Golden Hour Kiss', url: PHOTO_URLS[1], photographerId: 2, albumId: 'album1' },
            { id: 'p1a2', title: 'Walking on Beach', url: PHOTO_URLS[0], photographerId: 2, albumId: 'album1' },
            { id: 'p1a3', title: 'Silhouette', url: PHOTO_URLS[3], photographerId: 2, albumId: 'album1' },
        ]
    },
    {
        id: 'album2', title: 'Smith Family Fun', date: '2025-10-24', coverPhotoUrl: PHOTO_URLS[0], photographerId: 3, source: '101_CANON', roomNumber: '205',
        status: 'Finalized', categories: ['Beach & Pool', 'Activities'],
        photos: [
            { id: 'p2a1', title: 'Jump Shot', url: PHOTO_URLS[0], photographerId: 3, albumId: 'album2' },
            { id: 'p2a2', title: 'Building Castle', url: PHOTO_URLS[2], photographerId: 3, albumId: 'album2' },
            { id: 'p2a3', title: 'Group Smile', url: PHOTO_URLS[5], photographerId: 3, albumId: 'album2' },
            { id: 'p2a4', title: 'Splash', url: PHOTO_URLS[6], photographerId: 3, albumId: 'album2' },
        ]
    },
    {
        id: 'album3', title: 'Gala Dinner Night', date: '2025-10-23', coverPhotoUrl: PHOTO_URLS[4], photographerId: 1, source: 'SONY_A7', roomNumber: 'Lobby',
        status: 'Finalized', categories: ['Restaurant', 'Evening'],
        photos: [
            { id: 'p3a1', title: 'Table 12', url: PHOTO_URLS[4], photographerId: 1, albumId: 'album3' },
            { id: 'p3a2', title: 'Toasting', url: PHOTO_URLS[8], photographerId: 1, albumId: 'album3' },
            { id: 'p3a3', title: 'Buffet', url: PHOTO_URLS[9], photographerId: 1, albumId: 'album3' },
        ]
    },
    {
        id: 'album4', title: 'Morning Yoga', date: '2025-10-25', coverPhotoUrl: PHOTO_URLS[2], photographerId: 4, source: 'Tether', roomNumber: 'Gym',
        status: 'Draft', categories: ['Activities'],
        photos: [
            { id: 'p4a1', title: 'Pose 1', url: PHOTO_URLS[2], photographerId: 4, albumId: 'album4' },
            { id: 'p4a2', title: 'Meditation', url: PHOTO_URLS[7], photographerId: 4, albumId: 'album4' },
        ]
    },
];

// --- Rich Customer Data for Testing ---
const CUSTOMER_GALLERY_PHOTOS: Photo[] = [
    { id: 'cg_photo_1', title: 'Family Portrait 1', url: PHOTO_URLS[0], photographerId: 3, albumId: 'album2' },
    { id: 'cg_photo_2', title: 'Kids Playing', url: PHOTO_URLS[1], photographerId: 3, albumId: 'album2' },
    { id: 'cg_photo_3', title: 'Sunset View', url: PHOTO_URLS[2], photographerId: 3, albumId: 'album2' },
    { id: 'cg_photo_4', title: 'Dinner Smile', url: PHOTO_URLS[4], photographerId: 3, albumId: 'album3' },
    { id: 'cg_photo_5', title: 'Pool Splash', url: PHOTO_URLS[3], photographerId: 3, albumId: 'album2' },
    { id: 'cg_photo_6', title: 'Romantic Walk', url: PHOTO_URLS[5], photographerId: 3, albumId: 'album1' },
];

const CUSTOMER_ORDER_ITEMS: OrderItem[] = CUSTOMER_GALLERY_PHOTOS.map((photo, index) => ({
    id: `item-customer-gallery-${index}`,
    name: `Digital Download - ${photo.title}`,
    format: 'Digital',
    quantity: 1,
    price: 15,
    photo: photo
}));

const CUSTOMER_ORDER_TOTAL = CUSTOMER_ORDER_ITEMS.reduce((sum, item) => sum + item.quantity * item.price, 0);

export const MOCK_ORDERS: Order[] = [
    { id: 'ORD-001', date: '2025-10-20', clientName: 'John Doe', email: 'john@example.com', status: 'Completed', total: CUSTOMER_ORDER_TOTAL, photographerId: 3, items: CUSTOMER_ORDER_ITEMS, destinationId: 'dest1' },
    { id: 'ORD-002', date: '2025-10-22', clientName: 'Alice Smith', email: 'alice@example.com', status: 'Pending', total: 75.00, photographerId: 4, items: [], destinationId: 'dest1' },
    { id: 'ORD-003', date: '2025-10-24', clientName: 'Robert Brown', email: 'bob@example.com', status: 'Delivered', total: 120.00, photographerId: 2, items: [], destinationId: 'dest1' },
    { id: 'ORD-004', date: '2025-10-24', clientName: 'Sarah Connor', email: 'sarah@example.com', status: 'Completed', total: 45.00, photographerId: 1, items: [], destinationId: 'dest2' },
];

export const MOCK_OBJECTIVES: DailyObjective[] = [
    { id: 'obj1', photographer_id: '1', date: '2025-10-24', target: 500, status: 'Pending' },
    { id: 'obj2', photographer_id: '1', date: '2025-10-23', target: 500, status: 'Completed' },
];

export const MOCK_LOGIN_HISTORY: LoginHistory[] = [
    { id: 'log1', photographerId: '1', date: '2025-10-24 09:05:12', ip: '192.168.1.10' },
    { id: 'log2', photographerId: '1', date: '2025-10-23 08:55:00', ip: '192.168.1.10' },
];

export const MOCK_KIOSKS: TouchKiosk[] = [
    { id: 'kiosk-lobby-1', name: 'Lobby Kiosk #1', status: 'Connected' },
    { id: 'kiosk-pool-1', name: 'Pool Kiosk #1', status: 'Disconnected' },
];

export const MOCK_PRODUCTS: Product[] = [
    { id: 'prod1', name: 'Standard Print 10x15', category: 'Print', price: 10, stock: 500, isFeatured: true },
    { id: 'prod2', name: 'Large Print 20x30', category: 'Print', price: 25, stock: 100 },
    { id: 'prod3', name: 'Digital Photo', category: 'Digital', price: 15, stock: 9999, isFeatured: true },
    { id: 'prod4', name: 'Canvas Frame', category: 'Merchandise', price: 80, stock: 20 },
    { id: 'prod5', name: 'USB Stick (All Photos)', category: 'Digital', price: 150, stock: 50, isFeatured: true },
];

export const MOCK_PACKS: Pack[] = [
    { id: 'pack1', name: 'Digital Pack (5 Photos)', description: '5 digital photos of your choice.', price: 60, products: ['prod3'] },
    { id: 'pack2', name: 'Family Combo', description: '10 Prints + USB Stick', price: 200, products: ['prod1', 'prod5'] },
];

export const MOCK_SESSION_TYPES: SessionType[] = [
    { id: 'sess1', name: 'Beach Mini-Session', numberOfPhotos: 20, price: 150 },
    { id: 'sess2', name: 'Full Family Session', numberOfPhotos: 50, price: 300 },
    { id: 'sess3', name: 'Wedding Package', numberOfPhotos: 500, price: 1500 },
];

export const PHOTO_THEMES = ['Family Fun', 'Romantic Sunset', 'Beach Activities', 'Candid Moments', 'Golden Hour Portraits'];
export const MOCK_PRINT_SIZES = [
    { size: 'Digital Copy', price: 15, productId: 'prod3' },
    { size: '10x15cm Print', price: 10, productId: 'prod1' },
    { size: '13x18cm Print', price: 15, productId: 'prod1' },
    { size: '20x30cm Print', price: 25, productId: 'prod2' },
    { size: 'A4 Framed Print', price: 50, productId: 'prod2' },
    { size: 'Magnet', price: 8, productId: 'prod4' },
];

export const BASE_CURRENCY: Currency = { id: 'EUR', code: 'EUR', name: 'Euro', symbol: '€', rate: 1 };
export const AVAILABLE_CURRENCIES: Currency[] = [
    BASE_CURRENCY,
    { id: 'USD', code: 'USD', name: 'US Dollar', symbol: '$', rate: 1.1 },
    { id: 'TND', code: 'TND', name: 'Tunisian Dinar', symbol: 'DT', rate: 3.4 },
    { id: 'GBP', code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.85 },
];

// --- New Mock Data for Management Portal ---
export const MOCK_DESTINATIONS: Destination[] = [
    { id: 'dest1', name: 'Occidental Sousse Marhaba', country: 'Tunisia', type: 'Resort', licenseKey: 'SM-TUN-001', features: { ai: true, face: true, watermark: true } },
    { id: 'dest2', name: 'Barcelo Concorde Green Park', country: 'Tunisia', type: 'Resort', licenseKey: 'SM-TUN-002', features: { ai: true, face: true, watermark: false } },
    { id: 'dest3', name: 'Manhattan City Shoots', country: 'USA', type: 'City', licenseKey: 'SM-USA-001', features: { ai: false, face: false, watermark: true } },
];
export const MOCK_EXPENSE_CATEGORIES: ExpenseCategory[] = [
    { id: 'TRAVEL', label: 'Travel' }, { id: 'EQUIPMENT', label: 'Equipment' }, { id: 'MARKETING', label: 'Marketing' }, { id: 'SALARIES', label: 'Salaries' }
];
export const MOCK_EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
    { id: 'CAMERA', label: 'Camera' }, { id: 'LENS', label: 'Lens' }, { id: 'LIGHTING', label: 'Lighting' }, { id: 'IT', label: 'IT Infrastructure' }
];
export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp1', date: '2025-10-10', description: 'New Lens Canon RF 50mm', category: 'EQUIPMENT', cost: 1200, destinationId: 'dest1', photographerId: '4' },
    { id: 'exp2', date: '2025-10-12', description: 'Facebook Ads Q4', category: 'MARKETING', cost: 500, destinationId: 'dest1' },
    { id: 'exp3', date: '2025-10-15', description: 'Taxi to Airport', category: 'TRAVEL', cost: 45, destinationId: 'dest2' },
];
export const MOCK_LOANS: Loan[] = [
    { id: 'loan1', date: '2025-01-15', source: 'Bank ABC', amount: 50000, interestRate: 0.05, status: 'Active', payments: [] },
    { id: 'loan2', date: '2024-06-01', source: 'Investor X', amount: 20000, interestRate: 0.0, status: 'Paid Off', payments: [{ id: 'pay1', loanId: 'loan2', date: '2024-12-01', amount: 20000 }] }
];
export const MOCK_ADJUSTMENTS: Adjustment[] = [
    { id: 'adj1', date: '2025-10-01', photographerId: '2', amount: 250, description: 'Top performer bonus', type: 'Bonus', status: 'Unpaid' },
    { id: 'adj2', date: '2025-10-05', photographerId: '3', amount: 50, description: 'Late arrival fine', type: 'Deduction', status: 'Unpaid' }
];
export const MOCK_EQUIPMENT: Equipment[] = [
    { id: 'eq1', name: 'Canon R5 #1', type: 'CAMERA', status: 'In Use', assignedToPhotographerId: '4', destinationId: 'dest1' },
    { id: 'eq2', name: 'Canon R6 #2', type: 'CAMERA', status: 'Available', destinationId: 'dest1' },
    { id: 'eq3', name: 'Profoto B10', type: 'LIGHTING', status: 'Needs Repair', destinationId: 'dest1' },
];


export const MOCK_DATA_MAP = {
    users: MOCK_PHOTOGRAPHERS,
    albums: MOCK_ALBUMS,
    orders: MOCK_ORDERS,
    products: MOCK_PRODUCTS,
    packs: MOCK_PACKS,
    kiosks: MOCK_KIOSKS,
    sessionTypes: MOCK_SESSION_TYPES,
    bookings: [] as Booking[],
    destinations: MOCK_DESTINATIONS,
    expenses: MOCK_EXPENSES,
    loans: MOCK_LOANS,
    adjustments: MOCK_ADJUSTMENTS,
    equipment: MOCK_EQUIPMENT,
    expenseCategories: MOCK_EXPENSE_CATEGORIES,
    equipmentCategories: MOCK_EQUIPMENT_CATEGORIES,
    currencies: AVAILABLE_CURRENCIES,
};
