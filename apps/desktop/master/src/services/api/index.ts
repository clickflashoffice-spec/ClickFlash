/**
 * API Services Index
 * 
 * Re-exports all API services for convenient importing
 */

export * from './types';
export * from './userService';
export * from './dashboardService';
export * from './permissionService';
export * from './cullingService';
export * from './cloudService';
export * from './configService';
// ... existing exports
export * from './refreshService';
export * from './orderService';
export * from './productService';
export * from './bookingService';
export * from './loanService';
export * from './sessionTypeService';
export * from './expenseService';
export * from './packService';
export * from './destinationService';
export * from './kioskService';
export * from './albumService';
export * from './photoService';
export * from './settingsService';
export * from './dataExportService';
export * from './diagnosticsService';
export * from './faceService';
export * from './objectiveService';
export * from './analyticsService';
export * from './analyticsExportService';
export * from './marketingService';
export * from './ledgerService';
export * from './securityService';

// Re-export services as a combined object for backward compatibility
import { userService } from './userService';
import { permissionService } from './permissionService';
import { cloudService } from './cloudService';
import { cullingService } from './cullingService';
import { faceService } from './faceService';
import { authService } from './authService';
import { refreshService } from './refreshService';
import { orderService } from './orderService';
import { productService } from './productService';
import { bookingService } from './bookingService';
import { loanService } from './loanService';
import { sessionTypeService } from './sessionTypeService';
import { expenseService } from './expenseService';
import { packService } from './packService';
import { destinationService } from './destinationService';
import { kioskService } from './kioskService';
import { albumService } from './albumService';
import { photoService } from './photoService';
import { settingsService } from './settingsService';
import { dataExportService } from './dataExportService';
import { diagnosticsService } from './diagnosticsService';
import { objectiveService } from './objectiveService';
import { analyticsService } from './analyticsService';
import { marketingService } from './marketingService';
import { dashboardService } from './dashboardService';
import { ledgerService } from './ledgerService';
import { configService } from './configService';
import { securityService } from './securityService';

/**
 * Combined API service object (for backward compatibility)
 * 
 * @deprecated Use individual service imports instead
 * Example: import { userService } from './api/userService';
 */
export const apiServicePartial = {
    ...userService,
    ...permissionService,
    ...authService,
    ...refreshService,
    ...orderService,
    ...productService,
    ...bookingService,
    ...loanService,
    ...sessionTypeService,
    ...expenseService,
    ...packService,
    ...destinationService,
    ...kioskService,
    ...albumService,
    ...photoService,
    ...settingsService,
    ...dataExportService,
    ...diagnosticsService,
    ...cullingService,
    ...cloudService,
    ...faceService,
    ...objectiveService,
    ...analyticsService,
    ...marketingService,
    ...dashboardService,
    ...ledgerService,
    ...configService,
    ...securityService
};

