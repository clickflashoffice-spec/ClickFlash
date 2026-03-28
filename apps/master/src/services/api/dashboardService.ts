import { DEFAULT_API_URL } from "../../config";

export interface SystemHealthStats {
  enabled: boolean;
  status: "paused" | "syncing" | "idle";
  cloudConnection: "online" | "offline";
  lastSuccessfulSync: string | null;
  retentionDays: number;
  price: string;
  queues: {
    retention: number;
    fulfillment: number;
  };
  lastSync: string;
}

export const dashboardService = {
  getSystemHealth: async (): Promise<SystemHealthStats> => {
    const response = await fetch(
      `${DEFAULT_API_URL}/api/dashboard/system-health`,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch system health");
    }
    const data = await response.json();
    // Guard against old-format error responses (e.g. { error: 'Failed to fetch stats' })
    if (data && typeof data.error === "string") {
      throw new Error(data.error);
    }
    return data as SystemHealthStats;
  },
};
