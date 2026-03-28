/**
 * API Service - Main Export
 * 
 * This file maintains backward compatibility by re-exporting all services
 * from the modular API service structure.
 * 
 * @deprecated For new code, import individual services directly:
 *   import { userService } from './api/userService';
 *   import { albumService } from './api/albumService';
 * 
 * The modular structure provides:
 * - Better code organization
 * - Easier navigation
 * - Reduced merge conflicts
 * - Clearer separation of concerns
 */

// Re-export all services from the modular structure
import { apiServicePartial } from './api';

// Export as apiService for backward compatibility
export const apiService = apiServicePartial;

// Re-export types
export type { CollectionRefreshStatus, RefreshDataResponse } from './api/types';
