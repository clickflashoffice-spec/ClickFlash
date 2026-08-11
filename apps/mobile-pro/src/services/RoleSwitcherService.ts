import * as SecureStore from 'expo-secure-store';
import { appState } from '../store';
import { logger } from '@clickflash/logger';

export type UserRole = 'PHOTOGRAPHER' | 'STAFF' | 'STUDIO' | 'ADMIN';

const ROLE_STORAGE_KEY = 'clickflash_pro_active_role';

class RoleSwitcherService {
  private currentRole: UserRole = 'PHOTOGRAPHER';

  async initialize(): Promise<UserRole> {
    try {
      const storedRole = await SecureStore.getItemAsync(ROLE_STORAGE_KEY);
      if (storedRole && this.isValidRole(storedRole)) {
        this.currentRole = storedRole as UserRole;
      } else {
        this.currentRole = 'PHOTOGRAPHER';
      }
      appState.activeRole = this.currentRole;
      logger.info(`[RoleSwitcherService] Initialized with role: ${this.currentRole}`);
      return this.currentRole;
    } catch (error) {
      logger.error('[RoleSwitcherService] Error loading role from secure store:', error);
      this.currentRole = 'PHOTOGRAPHER';
      appState.activeRole = this.currentRole;
      return this.currentRole;
    }
  }

  async setRole(newRole: UserRole): Promise<void> {
    try {
      await SecureStore.setItemAsync(ROLE_STORAGE_KEY, newRole);
      this.currentRole = newRole;
      appState.activeRole = newRole;
      logger.info(`[RoleSwitcherService] Role switched to: ${newRole}`);
    } catch (error) {
      logger.error(`[RoleSwitcherService] Failed to set role to ${newRole}:`, error);
      throw error;
    }
  }

  getRole(): UserRole {
    return this.currentRole;
  }

  private isValidRole(role: string): boolean {
    return ['PHOTOGRAPHER', 'STAFF', 'STUDIO', 'ADMIN'].includes(role);
  }
}

export const roleSwitcherService = new RoleSwitcherService();
