import crypto from 'crypto';
import { Order, OrderItem } from '../types/shared';

export class OrderIntegrity {
  /**
   * Generates a SHA-256 checksum for an order based on its critical fields.
   * This ensures that any tampering with items, price, or client email is detected.
   */
  public static calculateChecksum(order: Partial<Order>): string {
    const items = order.items || [];
    const itemsString = items
      .map((item: OrderItem) => `${item.photo?.id ?? item.id}-${item.quantity}-${item.price}`)
      .sort()
      .join('|');

    const data = [
      order.id,
      order.clientName,
      order.email,
      order.total,
      order.photographerId,
      itemsString
    ].join(':');

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verifies an order's checksum.
   */
  public static verify(order: Order): boolean {
    if (!order.checksum) return false;
    const computed = this.calculateChecksum(order);
    return computed === order.checksum;
  }
}
