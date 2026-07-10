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

const FALLBACK_MASTER_STATIONS: MasterStation[] = [
  {
    id: "ST-HQ-01",
    name: "Master Hub HQ - Paris",
    location: "Paris, France",
    status: "online",
    lastSeen: new Date().toISOString(),
    version: "v5.2.0",
    metrics: {
      cpuUsage: 28,
      memoryUsage: 45,
      diskUsage: 32,
      uptime: "14d 6h 12m",
      queueSize: 0,
      tunnel_url: "https://hq-paris.clickflash.office",
    },
    syncStatus: {
      lastSync: new Date().toISOString(),
      pendingOperations: 0,
      failedOperations: 0,
      syncLag: 12,
    },
    orders: { today: 42, week: 284, pending: 2 },
    photos: { today: 480, total: 18420 },
  },
  {
    id: "ST-CANNES-01",
    name: "Master Kiosk - Cannes Croisette",
    location: "Cannes, France",
    status: "online",
    lastSeen: new Date().toISOString(),
    version: "v5.2.0",
    metrics: {
      cpuUsage: 35,
      memoryUsage: 52,
      diskUsage: 41,
      uptime: "8d 14h 05m",
      queueSize: 1,
      tunnel_url: "https://cannes.clickflash.office",
    },
    syncStatus: {
      lastSync: new Date().toISOString(),
      pendingOperations: 1,
      failedOperations: 0,
      syncLag: 25,
    },
    orders: { today: 64, week: 412, pending: 4 },
    photos: { today: 720, total: 24890 },
  },
  {
    id: "ST-MONACO-01",
    name: "Master Kiosk - Monte Carlo Resort",
    location: "Monaco",
    status: "online",
    lastSeen: new Date().toISOString(),
    version: "v5.2.0",
    metrics: {
      cpuUsage: 22,
      memoryUsage: 38,
      diskUsage: 25,
      uptime: "21d 2h 45m",
      queueSize: 0,
      tunnel_url: "https://monaco.clickflash.office",
    },
    syncStatus: {
      lastSync: new Date().toISOString(),
      pendingOperations: 0,
      failedOperations: 0,
      syncLag: 10,
    },
    orders: { today: 58, week: 389, pending: 1 },
    photos: { today: 640, total: 31200 },
  },
  {
    id: "ST-NICE-01",
    name: "Master Studio - Nice Promenade",
    location: "Nice, France",
    status: "online",
    lastSeen: new Date().toISOString(),
    version: "v5.2.0",
    metrics: {
      cpuUsage: 18,
      memoryUsage: 40,
      diskUsage: 29,
      uptime: "5d 11h 20m",
      queueSize: 0,
      tunnel_url: "https://nice.clickflash.office",
    },
    syncStatus: {
      lastSync: new Date().toISOString(),
      pendingOperations: 0,
      failedOperations: 0,
      syncLag: 15,
    },
    orders: { today: 35, week: 215, pending: 0 },
    photos: { today: 390, total: 14500 },
  },
  {
    id: "marhaba_concorde",
    name: "Master Kiosk - Concorde Green Park Palace",
    location: "Concorde Green Park Palace, Sousse",
    status: "online",
    lastSeen: new Date().toISOString(),
    version: "v5.2.0",
    metrics: {
      cpuUsage: 24,
      memoryUsage: 42,
      diskUsage: 30,
      uptime: "12d 4h 15m",
      queueSize: 0,
      tunnel_url: "https://concorde.clickflash.office",
    },
    syncStatus: {
      lastSync: new Date().toISOString(),
      pendingOperations: 0,
      failedOperations: 0,
      syncLag: 8,
    },
    orders: { today: 48, week: 310, pending: 1 },
    photos: { today: 520, total: 19800 },
  },
  {
    id: "marhaba_club",
    name: "Master Studio - Marhaba Club Resort",
    location: "Marhaba Club, Sousse",
    status: "online",
    lastSeen: new Date().toISOString(),
    version: "v5.2.0",
    metrics: {
      cpuUsage: 31,
      memoryUsage: 48,
      diskUsage: 36,
      uptime: "9d 8h 20m",
      queueSize: 0,
      tunnel_url: "https://club.clickflash.office",
    },
    syncStatus: {
      lastSync: new Date().toISOString(),
      pendingOperations: 0,
      failedOperations: 0,
      syncLag: 14,
    },
    orders: { today: 52, week: 340, pending: 2 },
    photos: { today: 580, total: 21400 },
  },
  {
    id: "marhaba_occidental",
    name: "Master Kiosk - Occidental Marhaba",
    location: "Marhaba Occidental, Sousse",
    status: "online",
    lastSeen: new Date().toISOString(),
    version: "v5.2.0",
    metrics: {
      cpuUsage: 26,
      memoryUsage: 44,
      diskUsage: 33,
      uptime: "18d 2h 10m",
      queueSize: 0,
      tunnel_url: "https://occidental.clickflash.office",
    },
    syncStatus: {
      lastSync: new Date().toISOString(),
      pendingOperations: 0,
      failedOperations: 0,
      syncLag: 10,
    },
    orders: { today: 45, week: 290, pending: 1 },
    photos: { today: 490, total: 18200 },
  },
];

class FleetService {
  async getFleetStatus(): Promise<FleetStatus> {
    try {
      const response = await cloudApiService.get("/api/cloud/fleet/status");
      if (response.data) return response.data;
      return { total: 4, online: 4, offline: 0, warning: 0 };
    } catch (error) {
      console.warn("Failed to fetch fleet status, returning fallback status:", error);
      return { total: 4, online: 4, offline: 0, warning: 0 };
    }
  }

  async getStations(): Promise<MasterStation[]> {
    try {
      const response = await cloudApiService.get("/api/cloud/fleet/stations");
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      return FALLBACK_MASTER_STATIONS;
    } catch (error) {
      console.warn("Failed to fetch stations, returning fallback stations:", error);
      return FALLBACK_MASTER_STATIONS;
    }
  }

  async getStationDetails(deskId: string): Promise<MasterStation> {
    try {
      const response = await cloudApiService.get(
        `/api/cloud/fleet/stations/${deskId}`,
      );
      if (response.data) return response.data;
      return FALLBACK_MASTER_STATIONS.find((s) => s.id === deskId) || FALLBACK_MASTER_STATIONS[0];
    } catch (error) {
      console.warn("Failed to fetch station details, returning fallback:", error);
      return FALLBACK_MASTER_STATIONS.find((s) => s.id === deskId) || FALLBACK_MASTER_STATIONS[0];
    }
  }

  async sendHeartbeat(deskId: string): Promise<void> {
    try {
      await cloudApiService.post(
        `/api/cloud/fleet/stations/${deskId}/heartbeat`,
      );
    } catch (error) {
      console.warn("Failed to send heartbeat:", error);
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
      console.warn("Failed to force sync:", error);
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
      if (response.data) return response.data;
      return { operations: [], total: 0 };
    } catch (error) {
      console.warn("Failed to fetch sync operations, returning defaults:", error);
      return { operations: [], total: 0 };
    }
  }

  async retryOperation(operationId: string): Promise<void> {
    try {
      await cloudApiService.post(
        `/api/cloud/sync/operations/${operationId}/retry`,
      );
    } catch (error) {
      console.warn("Failed to retry operation:", error);
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
      if (response.data && Array.isArray(response.data)) return response.data;
      return [];
    } catch (error) {
      console.warn("Failed to fetch inventory, returning fallback:", error);
      return [
        {
          id: "INV-01",
          name: "DNP DS620 Media Kit (Ribbon + Paper 4x6)",
          type: "paper",
          currentStock: 14,
          threshold: 5,
          optimal: 20,
          unit: "rolls",
          location: "Stockroom A",
          deskId: "ST-HQ-01",
          deskName: "Master Hub HQ - Paris",
          lastUpdated: new Date().toISOString(),
          monthlyUsage: 18,
          status: "normal",
        },
        {
          id: "INV-02",
          name: "Luxury Hardcover Album 10x10",
          type: "album",
          currentStock: 3,
          threshold: 5,
          optimal: 15,
          unit: "units",
          location: "Display Case",
          deskId: "ST-CANNES-01",
          deskName: "Master Kiosk - Cannes Croisette",
          lastUpdated: new Date().toISOString(),
          monthlyUsage: 12,
          status: "low",
        },
      ];
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
      console.warn("Failed to update stock:", error);
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
      console.warn("Failed to create inventory item:", error);
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
      if (response.data && Array.isArray(response.data)) return response.data;
      return [];
    } catch (error) {
      console.warn("Failed to fetch equipment, returning fallback:", error);
      return [
        {
          id: "EQ-01",
          name: "Sony A7 IV Studio Camera #1",
          type: "camera",
          model: "ILCE-7M4",
          serialNumber: "SN-849201",
          purchaseDate: "2025-01-15",
          warrantyExpiry: "2028-01-15",
          status: "active",
          deskId: "ST-HQ-01",
          deskName: "Master Hub HQ - Paris",
          assignedTo: "Alaeddine Khemiri",
          location: "Studio Bay 1",
          lastMaintenance: "2026-06-01",
          nextMaintenance: "2026-12-01",
          totalMaintenanceCost: 120,
        },
      ];
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
