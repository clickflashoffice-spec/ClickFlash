export * from "./types/shared";
// Re-export UserRole as AppRole for consistency
import { UserRole, BookingStatus } from "./types/shared";
export type AppRole = UserRole;
export type { BookingStatus };

export type Permission = string;

export type View =
  | "Dashboard"
  | "Albums"
  | "Orders"
  | "Clients"
  | "Products"
  | "Photographers"
  | "Bookings"
  | "Settings"
  | "MoneyTrash"
  | "Analytics"
  | "Fulfillment"
  | "Marketing"
  | "Growth"
  | "LocalResortDashboard"
  | "PrintQueue";

export interface DestinationFeatures {
  ai: boolean;
  face: boolean;
  watermark: boolean;
}

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

export interface ShootIdea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  equipmentNeeded: string[];
  settings?: {
    aperture?: string;
    shutter_speed?: string;
    iso?: number | string;
  };
}

export type AlbumTab = "queue" | "live" | "all";

export type AlbumStatus = "all" | "draft" | "finalized" | "live" | "archived";
