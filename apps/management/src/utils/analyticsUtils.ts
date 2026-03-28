import { Order, Expense, Destination } from "../types";

/**
 * Utility functions for dashboard analytics and financial reporting.
 */

export const analyticsUtils = {
  /**
   * Groups orders by a specific date format (e.g., YYYY-MM-DD, YYYY-MM).
   */
  groupOrdersByDate(orders: Order[], period: "day" | "month" | "year") {
    const groups: Record<string, { total: number; count: number }> = {};

    orders.forEach((order) => {
      const date = new Date(order.date);
      let key = "";

      if (period === "day") {
        key = order.date; // Assuming order.date is YYYY-MM-DD
      } else if (period === "month") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else if (period === "year") {
        key = `${date.getFullYear()}`;
      }

      if (!groups[key]) {
        groups[key] = { total: 0, count: 0 };
      }

      groups[key].total += order.total;
      groups[key].count += 1;
    });

    return groups;
  },

  /**
   * Calculates profitability per destination.
   */
  calculateProfitability(
    destinations: Destination[],
    orders: Order[],
    expenses: Expense[],
  ) {
    return destinations
      .map((dest) => {
        const destOrders = orders.filter(
          (o) => o.destinationId === dest.id && o.status === "Completed",
        );
        const destExpenses = expenses.filter(
          (e) => e.destinationId === dest.id,
        );

        const income = destOrders.reduce((sum, o) => sum + o.total, 0);
        const expenseTotal = destExpenses.reduce((sum, e) => sum + e.cost, 0);
        const profit = income - expenseTotal;
        const margin = income > 0 ? (profit / income) * 100 : 0;

        return {
          id: dest.id,
          name: dest.name,
          income,
          expenses: expenseTotal,
          profit,
          margin,
          orderCount: destOrders.length,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  },

  /**
   * Formats a date for chart labels based on active timeframe.
   */
  formatChartLabel(dateStr: string, timeframe: string) {
    const date = new Date(dateStr);
    if (timeframe === "today") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (timeframe === "7d" || timeframe === "30d") {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString([], { year: "numeric", month: "short" });
  },
};
