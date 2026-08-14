import { pb } from "./pb";
import { Order, Photographer } from "../types";
import { logger } from "@/utils/logger";

export const payrollRoutingService = {
  /**
   * Automatically routes a commission adjustment to the photographer
   * when an order is completed.
   */
  async routeCommission(order: Order): Promise<void> {
    try {
      if (!order.photographerId || (order.status !== "Completed" && order.status !== "Delivered")) {
        return;
      }

      // Fetch photographer
      const userRecord = await pb.collection("users").getOne(order.photographerId.toString());
      const photographer = userRecord as unknown as Photographer;

      if (photographer.payrollType === "Commission" && photographer.commissionRate) {
        const commissionAmount = order.total * photographer.commissionRate;

        if (commissionAmount > 0) {
          const adjustmentData = {
            date: new Date().toISOString(),
            photographerId: photographer.id,
            amount: commissionAmount,
            description: `Commission for Order #${order.id || order.orderNumber}`,
            type: "Bonus", // Using "Bonus" as commission per existing shared.ts
            status: "Unpaid"
          };

          await pb.collection("adjustments").create(adjustmentData);
          logger.info(`Commission of ${commissionAmount} routed to photographer ${photographer.id} for order ${order.id}`);
        }
      }
    } catch (err) {
      logger.error(`Failed to route commission for order ${order.id}:`, err);
    }
  }
};
