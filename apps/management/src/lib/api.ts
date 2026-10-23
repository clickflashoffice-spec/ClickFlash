import { Order, Album } from '@clickflash/types';

const API_BASE_URL = typeof window !== 'undefined' && window.location.port === '8090'
  ? '/api'
  : (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8090/api');

export interface PhotographerLive {
  id: string;
  name: string;
  email?: string;
  role: string;
  status: 'active' | 'offline' | 'shooting';
  location?: string;
  last_ping?: string;
  shoots_today?: number;
}

export interface GearAsset {
  id: string;
  venue_id: string;
  asset_tag: string;
  category: string;
  make_model: string;
  serial_number: string;
  status: 'AVAILABLE' | 'CHECKED_OUT' | 'MAINTENANCE' | 'DECOMMISSIONED';
  assigned_to_user_id?: string | null;
  assigned_to_name?: string | null;
  condition_rating: number;
}

export interface PrintJob {
  id: string;
  venue_id: string;
  printer_name: string;
  order_id: string;
  photo_url: string;
  paper_size: string;
  copies: number;
  priority: number;
  guest_name?: string | null;
  submitted_at: string;
  status: 'QUEUED' | 'PRINTING' | 'COMPLETED' | 'FAILED';
}

export interface ShiftSchedule {
  id: string;
  venue_id: string;
  user_id: string;
  user_name: string;
  date: string;
  start_time: string;
  end_time: string;
  zone: string;
  clock_in_time?: string | null;
  clock_out_time?: string | null;
  status: 'SCHEDULED' | 'CLOCKED_IN' | 'COMPLETED' | 'ABSENT';
}

export interface ConcessionTarget {
  id: string;
  venue_id: string;
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  start_date: string;
  end_date: string;
  target_revenue_cents: number;
  current_revenue_cents: number;
  target_conversion_pct: number;
  current_conversion_pct: number;
}

export interface HousingUnit {
  id: string;
  venue_id: string;
  building_name: string;
  unit_number: string;
  room_name: string;
  bed_identifier: string;
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE';
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  productSplit?: Array<{ productName: string; revenue: number }>;
}

export interface SystemHealthStats {
  status: string;
  uptimeSeconds?: number;
  kiosksOnline?: number;
  pendingSyncQueue?: number;
  storageFreeGb?: number;
}

/**
 * Fetch all orders from Master OS backend.
 */
export async function fetchOrders(): Promise<Order[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/collections/orders/records?expand=items`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

/**
 * Fetch all albums from Master OS backend.
 */
export async function fetchAlbums(): Promise<Album[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/collections/albums/records?expand=photos`);
    if (!response.ok) throw new Error('Failed to fetch albums');
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching albums:', error);
    return [];
  }
}

/**
 * Fetch active fleet photographers from Master OS SQLite.
 */
export async function fetchPhotographers(): Promise<PhotographerLive[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/photographers`);
    if (!response.ok) throw new Error('Failed to fetch photographers');
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching photographers:', error);
    return [];
  }
}

/**
 * Fetch gear assets (cameras, lenses, printers, beacons).
 */
export async function fetchGearAssets(venueId = 'venue-main'): Promise<GearAsset[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/concession/gear?venueId=${encodeURIComponent(venueId)}`);
    if (!response.ok) throw new Error('Failed to fetch gear assets');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching gear assets:', error);
    return [];
  }
}

/**
 * Fetch print spooler queue jobs.
 */
export async function fetchPrintQueue(venueId = 'venue-main'): Promise<PrintJob[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/concession/print-queue?venueId=${encodeURIComponent(venueId)}`);
    if (!response.ok) throw new Error('Failed to fetch print queue');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching print queue:', error);
    return [];
  }
}

/**
 * Fetch photographer shift rotations.
 */
export async function fetchShifts(date?: string): Promise<ShiftSchedule[]> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const response = await fetch(`${API_BASE_URL}/concession/shifts?date=${encodeURIComponent(targetDate)}`);
    if (!response.ok) throw new Error('Failed to fetch shifts');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return [];
  }
}

/**
 * Fetch concession sales targets.
 */
export async function fetchSalesTargets(venueId = 'venue-main'): Promise<ConcessionTarget[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/concession/targets?venueId=${encodeURIComponent(venueId)}`);
    if (!response.ok) throw new Error('Failed to fetch sales targets');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching sales targets:', error);
    return [];
  }
}

/**
 * Fetch staff housing allocation roster.
 */
export async function fetchHousingRoster(venueId = 'venue-main'): Promise<HousingUnit[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/concession/housing?venueId=${encodeURIComponent(venueId)}`);
    if (!response.ok) throw new Error('Failed to fetch housing roster');
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching housing roster:', error);
    return [];
  }
}

/**
 * Fetch high-level analytics summary KPIs from Master OS.
 */
export async function fetchAnalyticsSummary(days = 30): Promise<AnalyticsSummary | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/summary?days=${days}`);
    if (!response.ok) throw new Error('Failed to fetch analytics summary');
    return await response.json();
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return null;
  }
}

/**
 * Fetch system health and sync queue telemetry.
 */
export async function fetchSystemHealth(): Promise<SystemHealthStats | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/system-health`);
    if (!response.ok) throw new Error('Failed to fetch system health');
    return await response.json();
  } catch (error) {
    console.error('Error fetching system health:', error);
    return null;
  }
}

/**
 * Triggers reverse-engineered Canva Auto Adjust for a specific photo on Master OS.
 */
export async function triggerCanvaAutoAdjust(photoId: string): Promise<{ success: boolean; recipe?: any } | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/photos/${encodeURIComponent(photoId)}/auto-adjust`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to trigger Canva auto-adjust');
    return await response.json();
  } catch (error) {
    console.error('Error triggering auto-adjust:', error);
    return null;
  }
}
