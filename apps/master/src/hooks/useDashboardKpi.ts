import { useMemo } from 'react';
import { Order, Album } from '../types';
import { logger } from '../utils/logger';

export interface KpiData {
  todaysRevenue: number;
  todaysPhotos: number;
  albumsToProcess: number;
  pendingOrders: number;
}

const getTodayString = (): string => {
  return new Date().toISOString().split("T")[0];
};

export function useDashboardKpi(orders: Order[], albums: Album[]): KpiData {
  return useMemo(() => {
    const todayString = getTodayString();

    try {
      const todaysOrders = orders.filter(
        (order) => order.date === todayString && order.status === "Completed",
      );
      const todaysRevenue = todaysOrders.reduce(
        (sum, order) => sum + order.total,
        0,
      );

      const todaysAlbums = albums.filter(
        (album) => album.date === todayString,
      );
      const todaysPhotos = todaysAlbums.reduce(
        (sum, album) => sum + (album.photos?.length || 0),
        0,
      );

      const albumsToProcess = albums.filter(
        (album) => album.status !== "Finalized" && album.status !== "Archived",
      ).length;

      return {
        todaysRevenue,
        todaysPhotos,
        albumsToProcess,
        pendingOrders: orders.filter(
          (order) => order.status === "Pending",
        ).length,
      };
    } catch (error) {
      logger.error("Error calculating KPI data:", error as Error);
      return {
        todaysRevenue: 0,
        todaysPhotos: 0,
        albumsToProcess: 0,
        pendingOrders: 0,
      };
    }
  }, [orders, albums]);
}
