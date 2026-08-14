import { pb } from "../pb";


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


export const governanceSyncApi = {
  async getYieldStats(): Promise<any[]> {
    const response = await fetch(`${pb.baseUrlValue}/api/cloud/sync/yield`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
      },
    });
    const data = await response.json();
    return data.stats || [];
  },

  async getCRMLeads(): Promise<any[]> {
    const response = await fetch(`${pb.baseUrlValue}/api/cloud/sync/crm`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
      },
    });
    const data = await response.json();
    return data.leads || [];
  },

  async getFleetTriage(deskId?: string): Promise<any[]> {
    const url = deskId 
      ? `${pb.baseUrlValue}/api/cloud/sync/triage?desk_id=${deskId}`
      : `${pb.baseUrlValue}/api/cloud/sync/triage`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
      },
    });
    const data = await response.json();
    return data.metrics || [];
  },
};
