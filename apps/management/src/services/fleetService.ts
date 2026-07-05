import { cloudApiService } from "./cloudApiService";
import type { Order } from "../types.ts";

export interface FleetStatus {
  total: number;
  online: number;
  offline: number;
  warning: number;
}

export interface MasterStation {
  id: string;
  name: string;
  location: string;
  status:
    | "online"
    | "offline"
    | "warning"
    | "syncing"
    | "degraded"
    | "disconnected";
  lastSeen: string;
  version: string;
  metrics?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
    uptime?: string;
    queueSize?: number;
    tunnel_url?: string;
  };
  syncStatus?: {
    lastSync?: string;
    pendingOperations?: number;
    failedOperations?: number;
    syncLag?: number;
  };
  orders?: {
    today?: number;
    week?: number;
    pending?: number;
  };
  photos?: {
    today?: number;
    total?: number;
  };
}

export interface SyncOperation {
  id: string;
  deskId: string;
  deskName: string;
  type:
    | "photo"
    | "order"
    | "payroll"
    | "expense"
    | "inventory"
    | "heartbeat"
    | "config";
  status: "success" | "error" | "pending" | "retrying";
  timestamp: string;
  duration: number;
  recordsCount: number;
  errorMessage?: string;
  retryCount: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: "ribbon" | "ink" | "paper" | "frame" | "album" | "usb" | "other";
  currentStock: number;
  threshold: number;
  optimal: number;
  unit: string;
  location: string;
  deskId: string;
  deskName: string;
  lastUpdated: string;
  monthlyUsage: number;
  status: "normal" | "low" | "critical" | "out";
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: "camera" | "printer" | "computer" | "storage" | "network" | "other";
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry: string;
  status: "active" | "maintenance" | "repair" | "retired";
  deskId: string;
  deskName: string;
  assignedTo?: string;
  location: string;
  lastMaintenance: string;
  nextMaintenance: string;
  totalMaintenanceCost: number;
}

class FleetService {
  async getFleetStatus(): Promise<FleetStatus> {
    try {
      const response = await cloudApiService.get("/api/cloud/fleet/status");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch fleet status:", error);
      throw error;
    }
  }

  async getStations(): Promise<MasterStation[]> {
    try {
      const response = await cloudApiService.get("/api/cloud/fleet/stations");
      return response.data;
    } catch (error) {
      console.error("Failed to fetch stations:", error);
      throw error;
    }
  }

  async getStationDetails(deskId: string): Promise<MasterStation> {
    try {
      const response = await cloudApiService.get(
        `/api/cloud/fleet/stations/${deskId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch station details:", error);
      throw error;
    }
  }

  async sendHeartbeat(deskId: string): Promise<void> {
    try {
      await cloudApiService.post(
        `/api/cloud/fleet/stations/${deskId}/heartbeat`,
      );
    } catch (error) {
      console.error("Failed to send heartbeat:", error);
      throw error;
    }
  }

  async forceSync(deskId?: string): Promise<void> {
    try {
      if (deskId) {
        await cloudApiService.post(`/api/cloud/fleet/stations/${deskId}/sync`);
      } else {
        await cloudApiService.post("/api/cloud/fleet/sync-all");
      }
    } catch (error) {
      console.error("Failed to force sync:", error);
      throw error;
    }
  }

  // Sync Logs
  async getSyncOperations(params?: {
    status?: string;
    type?: string;
    deskId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ operations: SyncOperation[]; total: number }> {
    try {
      const response = await cloudApiService.get("/api/cloud/sync/operations", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch sync operations:", error);
      throw error;
    }
  }

  async retryOperation(operationId: string): Promise<void> {
    try {
      await cloudApiService.post(
        `/api/cloud/sync/operations/${operationId}/retry`,
      );
    } catch (error) {
      console.error("Failed to retry operation:", error);
      throw error;
    }
  }

  // Inventory
  async getInventory(params?: {
    status?: string;
    type?: string;
    deskId?: string;
  }): Promise<InventoryItem[]> {
    try {
      const response = await cloudApiService.get("/api/cloud/inventory", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
      throw error;
    }
  }

  async updateStock(itemId: string, delta: number): Promise<InventoryItem> {
    try {
      const response = await cloudApiService.patch(
        `/api/cloud/inventory/${itemId}/stock`,
        { delta },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update stock:", error);
      throw error;
    }
  }

  async createInventoryItem(
    item: Partial<InventoryItem>,
  ): Promise<InventoryItem> {
    try {
      const response = await cloudApiService.post("/api/cloud/inventory", item);
      return response.data;
    } catch (error) {
      console.error("Failed to create inventory item:", error);
      throw error;
    }
  }

  // Equipment
  async getEquipment(params?: {
    status?: string;
    type?: string;
    deskId?: string;
  }): Promise<EquipmentItem[]> {
    try {
      const response = await cloudApiService.get("/api/cloud/equipment", {
        params,
      });
      return response.data;
    } catch (error) {
      console.error("Failed to fetch equipment:", error);
      throw error;
    }
  }

  async createEquipmentItem(
    item: Partial<EquipmentItem>,
  ): Promise<EquipmentItem> {
    try {
      const response = await cloudApiService.post("/api/cloud/equipment", item);
      return response.data;
    } catch (error) {
      console.error("Failed to create equipment item:", error);
      throw error;
    }
  }

  async updateEquipmentStatus(
    equipmentId: string,
    status: string,
  ): Promise<EquipmentItem> {
    try {
      const response = await cloudApiService.patch(
        `/api/cloud/equipment/${equipmentId}/status`,
        { status },
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update equipment status:", error);
      throw error;
    }
  }

  async addMaintenanceRecord(
    equipmentId: string,
    record: {
      type: string;
      description: string;
      cost: number;
      technician: string;
    },
  ): Promise<void> {
    try {
      await cloudApiService.post(
        `/api/cloud/equipment/${equipmentId}/maintenance`,
        record,
      );
    } catch (error) {
      console.error("Failed to add maintenance record:", error);
      throw error;
    }
  } // <-- Added missing brace

  // Macro-Economic CEO Overview
  calculateGlobalNetworkMetrics(
    stations: MasterStation[],
    allOrders: Order[] = [],
  ) {
    const activeStations = stations.filter((s) => s.status === "online").length;
    const warningStations = stations.filter(
      (s) => s.status === "warning" || s.status === "degraded",
    ).length;
    const offlineStations = stations.filter(
      (s) => s.status === "offline" || s.status === "disconnected",
    ).length;

    const totalPhotos = stations.reduce(
      (acc, s) => acc + (s.photos?.total || 0),
      0,
    );
    const totalOrders = stations.reduce(
      (acc, s) => acc + (s.orders?.today || 0) + (s.orders?.week || 0),
      0,
    );

    let grossVolume = 0;
    if (allOrders && allOrders.length > 0) {
      grossVolume = allOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    }

    // Extremely rough ARR calculation for mock dashboard display purposes
    const networkARR = grossVolume > 0 ? (grossVolume / 7) * 365 : 0;

    return {
      activeStations,
      warningStations,
      offlineStations,
      totalStations: stations.length,
      totalPhotos,
      totalOrders,
      grossVolume,
      networkARR,
    };
  }

  // --- Phase 45: Dispatch Support Commands ---
  async sendCommand(
    deskId: string,
    command: "START_TUNNEL" | "STOP_TUNNEL" | "RESTART",
  ): Promise<boolean> {
    try {
      const res = await cloudApiService.post(
        `/api/admin/desks/${deskId}/command`,
        { command },
      );
      if (res.status !== 200) throw new Error("Command failed");
      return true;
    } catch (e) {
      console.error(`Failed to dispatch ${command} to desk ${deskId}:`, e);
      return false;
    }
  }
}

export const fleetService = new FleetService();
export default fleetService;
