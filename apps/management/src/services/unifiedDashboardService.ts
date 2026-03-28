/**
 * Unified Dashboard Service
 *
 * Aggregates dashboard data from all Master stations worldwide
 * combining KPIs, Resort BI, and Marketing data into a single view.
 */

import { cloudApiService } from "./cloudApiService";
import { fleetService, MasterStation } from "./fleetService";

export interface TrendPoint {
  date: string;
  income: number;
  orders: number;
}

export interface MonthlyStatus {
  income: number;
  orders: number;
  guests: number;
  arrivals: number;
  departures: number;
}

export interface SessionComparison {
  avgPhotosSimple: number;
  avgPhotosMultiple: number;
  avgIncomeSimple: number;
  avgIncomeMultiple: number;
  countSimple: number;
  countMultiple: number;
}

export interface MeetingDistribution {
  hour: number;
  count: number;
}

export interface DashboardKPI {
  totalRevenueToday: number;
  totalRevenueWeek: number;
  totalRevenueMonth: number;
  totalOrdersToday: number;
  totalOrdersWeek: number;
  totalOrdersMonth: number;
  totalPhotosToday: number;
  totalPhotosWeek: number;
  totalPhotosMonth: number;
  albumsToProcess: number;
  pendingOrders: number;
  avgOrderValue: number;
}

export interface ResortBIData {
  trends: TrendPoint[];
  monthlyStatus: MonthlyStatus;
  comparison: SessionComparison;
  distribution: MeetingDistribution[];
  totalIncome: number;
  totalOrders: number;
  totalPhotos: number;
  basketAverage: number;
  incomePerGuest: number;
  captureRate: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: "post-event" | "abandoned-cart" | "re-engagement" | "retention";
  status: "active" | "paused" | "completed" | "draft";
  sentCount: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  revenue: number;
}

export interface MarketingAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalEmailsSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  totalRevenue: number;
  roi: number;
}

export interface MarketingData {
  campaigns: Campaign[];
  analytics: MarketingAnalytics;
}

export interface StationDashboard extends MasterStation {
  kpi: {
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    ordersToday: number;
    ordersWeek: number;
    ordersMonth: number;
    photosToday: number;
    albumsCount: number;
    pendingOrders: number;
  };
  resortBI: ResortBIData;
  topPhotographers: Array<{
    id: string;
    name: string;
    orders: number;
    revenue: number;
  }>;
  topAlbums: Array<{
    id: string;
    name: string;
    orders: number;
    revenue: number;
  }>;
}

export interface AggregatedDashboardStats {
  totalStations: number;
  onlineStations: number;
  offlineStations: number;
  topPerformingStation: string;
  lowestPerformingStation: string;
  kpi: DashboardKPI;
  topPhotographers: Array<{
    stationId: string;
    stationName: string;
    id: string;
    name: string;
    orders: number;
    revenue: number;
  }>;
  topAlbums: Array<{
    stationId: string;
    stationName: string;
    id: string;
    name: string;
    orders: number;
    revenue: number;
  }>;
}

export interface UnifiedDashboardData {
  stations: StationDashboard[];
  aggregated: AggregatedDashboardStats;
  kpi: DashboardKPI;
  resortBI: ResortBIData;
  marketing: MarketingData;
}

class UnifiedDashboardService {
  /**
   * Fetch unified dashboard data from all stations
   */
  async getDashboardData(): Promise<UnifiedDashboardData> {
    try {
      const [stations, aggregatedStats] = await Promise.all([
        this.getStationsWithDashboard(),
        this.getAggregatedStats(),
      ]);

      // Calculate aggregated KPIs from all stations
      const kpi = this.calculateAggregatedKPI(stations);
      const resortBI = this.calculateAggregatedResortBI(stations);
      const marketing = await this.getMarketingData();

      return {
        stations,
        aggregated: aggregatedStats,
        kpi,
        resortBI,
        marketing,
      };
    } catch (error) {
      console.error("Failed to fetch unified dashboard data:", error);
      throw error;
    }
  }

  /**
   * Get all stations with their dashboard data
   */
  async getStationsWithDashboard(): Promise<StationDashboard[]> {
    try {
      const stations = await fleetService.getStations();

      // Transform stations to include dashboard data
      // In production, this would fetch additional data per station
      return stations.map((station: MasterStation) =>
        this.transformToStationDashboard(station),
      );
    } catch (error) {
      console.error("Failed to fetch stations:", error);
      throw error;
    }
  }

  /**
   * Get aggregated stats across all stations
   */
  async getAggregatedStats(): Promise<AggregatedDashboardStats> {
    try {
      const stations = await fleetService.getStations();

      const onlineStations = stations.filter(
        (s: MasterStation) => s.status === "online",
      ).length;
      const offlineStations = stations.filter(
        (s: MasterStation) => s.status === "offline",
      ).length;

      // Sort by revenue to find top/low performers
      const sortedByRevenue = [...stations].sort(
        (a: MasterStation, b: MasterStation) =>
          (b.orders?.today || 0) - (a.orders?.today || 0),
      );

      const topPhotographers = this.aggregateTopPhotographers(stations);
      const topAlbums = this.aggregateTopAlbums(stations);

      return {
        totalStations: stations.length,
        onlineStations,
        offlineStations,
        topPerformingStation: sortedByRevenue[0]?.name || "-",
        lowestPerformingStation:
          sortedByRevenue[sortedByRevenue.length - 1]?.name || "-",
        kpi: this.calculateAggregatedKPI(
          stations.map((s: MasterStation) =>
            this.transformToStationDashboard(s),
          ),
        ),
        topPhotographers,
        topAlbums,
      };
    } catch (error) {
      console.error("Failed to fetch aggregated stats:", error);
      throw error;
    }
  }

  /**
   * Get marketing data
   */
  async getMarketingData(): Promise<MarketingData> {
    try {
      // Fetch marketing data from API
      // In production, this would call the actual marketing API
      const response = await cloudApiService.get("/api/marketing/dashboard");

      if (response.data) {
        return response.data;
      }

      // Return mock data if no data available
      return {
        campaigns: [],
        analytics: {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalEmailsSent: 0,
          avgOpenRate: 0,
          avgClickRate: 0,
          totalRevenue: 0,
          roi: 0,
        },
      };
    } catch (error) {
      console.warn("Failed to fetch marketing data, using defaults:", error);
      // Return default/empty data on error
      return {
        campaigns: [],
        analytics: {
          totalCampaigns: 0,
          activeCampaigns: 0,
          totalEmailsSent: 0,
          avgOpenRate: 0,
          avgClickRate: 0,
          totalRevenue: 0,
          roi: 0,
        },
      };
    }
  }

  /**
   * Transform MasterStation to StationDashboard
   */
  private transformToStationDashboard(
    station: MasterStation,
  ): StationDashboard {
    const kpi = {
      revenueToday: 0,
      revenueWeek: 0,
      revenueMonth: 0,
      ordersToday: station.orders?.today || 0,
      ordersWeek: station.orders?.week || 0,
      ordersMonth: station.orders?.week || 0, // Using week as proxy for month
      photosToday: station.photos?.today || 0,
      albumsCount: 0,
      pendingOrders: station.orders?.pending || 0,
    };

    // Estimate revenue based on orders (in production, this would be real data)
    const avgOrderValue = 150; // EUR average
    kpi.revenueToday = kpi.ordersToday * avgOrderValue;
    kpi.revenueWeek = kpi.ordersWeek * avgOrderValue;
    kpi.revenueMonth = kpi.ordersMonth * avgOrderValue;

    return {
      ...station,
      kpi,
      resortBI: {
        trends: [],
        monthlyStatus: {
          income: kpi.revenueMonth,
          orders: kpi.ordersMonth,
          guests: 0,
          arrivals: 0,
          departures: 0,
        },
        comparison: {
          avgPhotosSimple: 0,
          avgPhotosMultiple: 0,
          avgIncomeSimple: 0,
          avgIncomeMultiple: 0,
          countSimple: 0,
          countMultiple: 0,
        },
        distribution: [],
        totalIncome: kpi.revenueMonth,
        totalOrders: kpi.ordersMonth,
        totalPhotos: kpi.photosToday,
        basketAverage: avgOrderValue,
        incomePerGuest: 0,
        captureRate: 0,
      },
      topPhotographers: [],
      topAlbums: [],
    };
  }

  /**
   * Calculate aggregated KPIs from all stations
   */
  private calculateAggregatedKPI(stations: StationDashboard[]): DashboardKPI {
    const totals = {
      totalRevenueToday: 0,
      totalRevenueWeek: 0,
      totalRevenueMonth: 0,
      totalOrdersToday: 0,
      totalOrdersWeek: 0,
      totalOrdersMonth: 0,
      totalPhotosToday: 0,
      totalPhotosWeek: 0,
      totalPhotosMonth: 0,
      albumsToProcess: 0,
      pendingOrders: 0,
      avgOrderValue: 0,
    };

    stations.forEach((station: StationDashboard) => {
      totals.totalRevenueToday += station.kpi.revenueToday;
      totals.totalRevenueWeek += station.kpi.revenueWeek;
      totals.totalRevenueMonth += station.kpi.revenueMonth;
      totals.totalOrdersToday += station.kpi.ordersToday;
      totals.totalOrdersWeek += station.kpi.ordersWeek;
      totals.totalOrdersMonth += station.kpi.ordersMonth;
      totals.totalPhotosToday += station.kpi.photosToday;
      totals.pendingOrders += station.kpi.pendingOrders;
      totals.albumsToProcess += station.kpi.albumsCount;
    });

    totals.avgOrderValue =
      totals.totalOrdersMonth > 0
        ? totals.totalRevenueMonth / totals.totalOrdersMonth
        : 0;

    return totals;
  }

  /**
   * Calculate aggregated Resort BI from all stations
   */
  private calculateAggregatedResortBI(
    stations: StationDashboard[],
  ): ResortBIData {
    let totalIncome = 0;
    let totalOrders = 0;
    let totalPhotos = 0;
    let totalGuests = 0;

    stations.forEach((station: StationDashboard) => {
      totalIncome += station.resortBI.totalIncome;
      totalOrders += station.resortBI.totalOrders;
      totalPhotos += station.resortBI.totalPhotos;
      totalGuests += station.resortBI.monthlyStatus.guests;
    });

    return {
      trends: [],
      monthlyStatus: {
        income: totalIncome,
        orders: totalOrders,
        guests: totalGuests,
        arrivals: 0,
        departures: 0,
      },
      comparison: {
        avgPhotosSimple: 0,
        avgPhotosMultiple: 0,
        avgIncomeSimple: 0,
        avgIncomeMultiple: 0,
        countSimple: 0,
        countMultiple: 0,
      },
      distribution: [],
      totalIncome,
      totalOrders,
      totalPhotos,
      basketAverage: totalOrders > 0 ? totalIncome / totalOrders : 0,
      incomePerGuest: totalGuests > 0 ? totalIncome / totalGuests : 0,
      captureRate: 0,
    };
  }

  /**
   * Aggregate top photographers from all stations
   */
  private aggregateTopPhotographers(
    stations: MasterStation[],
  ): AggregatedDashboardStats["topPhotographers"] {
    // In production, this would aggregate real photographer data
    return [];
  }

  /**
   * Aggregate top albums from all stations
   */
  private aggregateTopAlbums(
    stations: MasterStation[],
  ): AggregatedDashboardStats["topAlbums"] {
    // In production, this would aggregate real album data
    return [];
  }

  /**
   * Fetch single station details
   */
  async getStationDetails(deskId: string): Promise<StationDashboard | null> {
    try {
      const station = await fleetService.getStationDetails(deskId);
      return this.transformToStationDashboard(station);
    } catch (error) {
      console.error(`Failed to fetch station details for ${deskId}:`, error);
      return null;
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  /**
   * Format number with locale
   */
  formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
  }
}

export const unifiedDashboardService = new UnifiedDashboardService();
export default unifiedDashboardService;
