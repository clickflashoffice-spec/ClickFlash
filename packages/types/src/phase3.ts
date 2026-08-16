// =============================================================================
// DYNAMIC YIELD PRICING
// =============================================================================
import { CrowdDensity, WeatherCondition, TimeOfDay } from './index.js';

export interface BaseRecord {
    id?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type PricingAlgorithm = 'surge' | 'time_decay' | 'demand_curve';

export interface YieldPricingConfig extends BaseRecord {
  destinationId: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  algorithm: PricingAlgorithm;
  rules: {
    weatherMultiplier?: Partial<Record<WeatherCondition, number>>;
    crowdDensityMultiplier?: Partial<Record<CrowdDensity, number>>;
    timeOfDayMultipliers?: Partial<Record<TimeOfDay, number>>;
  };
  isActive: boolean;
  lastCalculatedAt?: string;
}

// =============================================================================
// AI PHOTOGRAPHER DISPATCH
// =============================================================================

export type DispatchPriority = 'low' | 'medium' | 'high' | 'critical';
export type DispatchTrigger = 'crowd_density' | 'vip_presence' | 'low_coverage' | 'manual';
export type DispatchStatus = 'pending' | 'dispatched' | 'arrived' | 'resolved' | 'dismissed';

export interface HotspotDispatchEvent extends BaseRecord {
  destinationId: string;
  zoneId: string;
  priority: DispatchPriority;
  trigger: DispatchTrigger;
  recommendedPhotographerCount: number;
  dispatchedPhotographerIds: string[];
  status: DispatchStatus;
  timestamp: string;
  metadata?: {
    crowdEstimate?: number;
    weatherCondition?: string;
    aiConfidenceScore?: number;
  };
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface HotZone extends BaseRecord {
  zoneId: string;
  destinationId: string;
  name: string;
  center: GeoCoordinate;
  radiusMeters: number;
  currentCrowdDensity: CrowdDensity;
  trend: 'increasing' | 'stable' | 'decreasing';
  activePhotographerCount: number;
  requiredPhotographerCount: number;
}

export interface PhotographerLocation {
  photographerId: string | number;
  destinationId: string;
  coordinates: GeoCoordinate;
  accuracy: number; // in meters
  heading?: number;
  speed?: number; // m/s
  lastUpdatedAt: string; // ISO timestamp
  status: 'idle' | 'shooting' | 'moving' | 'break' | 'offline';
  currentZoneId?: string;
  batteryLevel?: number;
}

export interface HotspotPrediction {
  destinationId: string;
  predictionId: string;
  generatedAt: string; // ISO timestamp
  predictedHotZones: Array<{
    zoneId: string;
    predictedCrowdDensity: CrowdDensity;
    confidenceScore: number; // 0.0 to 1.0
    startTime: string; // ISO timestamp
    endTime: string; // ISO timestamp
    recommendedPhotographers: number;
  }>;
  aiModelVersion: string;
}

export interface DispatchNotification {
  dispatchId: string;
  photographerId: string | number;
  targetZone: HotZone;
  priority: DispatchPriority;
  trigger: DispatchTrigger;
  message: string;
  dispatchedAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  actionRequired: 'acknowledge' | 'decline' | 'auto_accept';
}

// =============================================================================
// FRAUD MONITORING
// =============================================================================

export type FraudType = 
  | 'location_spoofing' 
  | 'buddy_punching' 
  | 'cash_under_table' 
  | 'excessive_voids' 
  | 'abnormal_velocity';

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FraudStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface FraudAlert extends BaseRecord {
  photographerId: string | number;
  destinationId: string;
  type: FraudType;
  severity: FraudSeverity;
  evidence: {
    expectedLocation?: { lat: number; lng: number };
    actualLocation?: { lat: number; lng: number };
    voidRate?: number;
    velocityMetersPerSecond?: number;
    relatedOrderIds?: string[];
  };
  status: FraudStatus;
  confidenceScore?: number;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface PosAnomaly extends BaseRecord {
  photographerId: string | number;
  type: 'excessive_voids' | 'abnormal_discount' | 'rapid_refund' | 'cash_drawer_open' | 'offline_sales';
  severity: FraudSeverity;
  orderId?: string;
  amountMinor?: number;
  details?: Record<string, unknown>;
  status: FraudStatus;
}

export interface HardwareHealthStatus extends BaseRecord {
  deviceId: string;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  tamperFlags: {
    sdCardRemovedDuringShift: boolean;
    clockAltered: boolean;
    gpsSpoofed: boolean;
    unauthorizedUsb: boolean;
  };
  metrics: {
    cpuTemp?: number;
    batteryLevel?: number;
    diskSpace?: number;
  };
  lastCheckinAt: string;
}
