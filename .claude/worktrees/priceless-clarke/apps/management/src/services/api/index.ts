/**
 * API Service Index
 * Re-exports all domain-specific API services for convenient importing
 * 
 * Architecture:
 * - Each domain has its own service file
 * - This index provides a unified import point
 * - The original apiService remains as a backward-compatible wrapper
 * 
 * Domain Modules:
 * - usersService: User/Photographer CRUD operations
 * - ordersService: Order management
 * - albumsService: Album management
 * - photosService: Photo operations
 * - productsService: Product/Pack management
 * - inventoryService: Equipment, loans, settings
 * - syncService: Data sync/backup operations
 */

export { usersService } from './usersService';
export { ordersService } from './ordersService';
export { albumsService } from './albumsService';
export { photosService } from './photosService';
export { productsService } from './productsService';
export { inventoryService } from './inventoryService';
export { syncService } from './syncService';

// Re-export types for convenience
export type { 
  Photographer, 
  Order, 
  Album, 
  Photo, 
  Product, 
  Pack,
  Booking,
  Destination,
  Expense,
  ExpenseCategory,
  Adjustment,
  Equipment,
  EquipmentCategory,
  Loan,
  SessionType,
  SyncLog,
  Currency,
  PaginatedList
} from '../../types';