import { pb } from "./pb";
import {
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
  EquipmentStatus,
  Loan,
  SessionType,
  SyncLog,
  AlbumStatus,
  Currency,
  PaginatedList,
} from "../types";
import { PocketRecord } from "./pbTypes";
import { logger } from "../utils/logger";
import { marketingAutomationService } from "./marketingAutomationService";
import { orchestrationService } from "./orchestrationService";
import { TIMEOUTS } from "../constants/timing";

/**
 * API Service - Wrapper around pb adapter for convenient data operations
 *
 * This service provides a clean interface for all CRUD operations with:
 * - Automatic retry logic for network failures
 * - Comprehensive error handling
 * - Request/response logging in development
 * - Type-safe operations
 *
 * All methods return Promises and handle errors gracefully.
 */


import { genericCrudApi } from './api/genericCrudApi';
import { usersPhotographersApi } from './api/usersPhotographersApi';
import { albumsApi } from './api/albumsApi';
import { photosApi } from './api/photosApi';
import { ordersApi } from './api/ordersApi';
import { productsApi } from './api/productsApi';
import { packsApi } from './api/packsApi';
import { bookingsApi } from './api/bookingsApi';
import { expensesApi } from './api/expensesApi';
import { expenseCategoriesApi } from './api/expenseCategoriesApi';
import { sessionTypesApi } from './api/sessionTypesApi';
import { adjustmentsApi } from './api/adjustmentsApi';
import { equipmentApi } from './api/equipmentApi';
import { loansApi } from './api/loansApi';
import { kioskManagementApi } from './api/kioskManagementApi';
import { settingsApi } from './api/settingsApi';
import { dataExportImportForSyncBackupApi } from './api/dataExportImportForSyncBackupApi';
import { databaseResetApi } from './api/databaseResetApi';
import { initializationApi } from './api/initializationApi';
import { portfolioApi } from './api/portfolioApi';
import { inventoryStockApi } from './api/inventoryStockApi';
import { massDeploymentCeoScaleApi } from './api/massDeploymentCeoScaleApi';
import { governanceSyncApi } from './api/governanceSyncApi';

export const apiService = {
  ...genericCrudApi,
  ...usersPhotographersApi,
  ...albumsApi,
  ...photosApi,
  ...ordersApi,
  ...productsApi,
  ...packsApi,
  ...bookingsApi,
  ...expensesApi,
  ...expenseCategoriesApi,
  ...sessionTypesApi,
  ...adjustmentsApi,
  ...equipmentApi,
  ...loansApi,
  ...kioskManagementApi,
  ...settingsApi,
  ...dataExportImportForSyncBackupApi,
  ...databaseResetApi,
  ...initializationApi,
  ...portfolioApi,
  ...inventoryStockApi,
  ...massDeploymentCeoScaleApi,
  ...governanceSyncApi,
};

export * from './api/genericCrudApi';
export * from './api/usersPhotographersApi';
export * from './api/albumsApi';
export * from './api/photosApi';
export * from './api/ordersApi';
export * from './api/productsApi';
export * from './api/packsApi';
export * from './api/bookingsApi';
export * from './api/expensesApi';
export * from './api/expenseCategoriesApi';
export * from './api/sessionTypesApi';
export * from './api/adjustmentsApi';
export * from './api/equipmentApi';
export * from './api/loansApi';
export * from './api/kioskManagementApi';
export * from './api/settingsApi';
export * from './api/dataExportImportForSyncBackupApi';
export * from './api/databaseResetApi';
export * from './api/initializationApi';
export * from './api/portfolioApi';
export * from './api/inventoryStockApi';
export * from './api/massDeploymentCeoScaleApi';
export * from './api/governanceSyncApi';
