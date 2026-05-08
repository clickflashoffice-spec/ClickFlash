import crypto from 'crypto';

/**
 * SHA-256 Order Integrity Utility - Physical Duplication per Law 11
 */
export class OrderIntegrity {
  /**
   * Generates a SHA-256 checksum for an order based on its critical fields.
   */
  public static calculateChecksum(order: any): string {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    const itemsString = items
      .map((item: any) => `${item.photoId || item.id}-${item.quantity}-${item.price}`)
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
  public static verify(order: any): boolean {
    if (!order.checksum) return false;
    const computed = this.calculateChecksum(order);
    return computed === order.checksum;
  }
}
