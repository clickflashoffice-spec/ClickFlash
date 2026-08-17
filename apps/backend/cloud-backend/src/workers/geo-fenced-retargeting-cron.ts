/**
 * Geo-Fenced Proximity Retargeting Cron Worker
 * Analyzes real-time guest BLE/UWB proximity to park exit gates and triggers dynamic WhatsApp flash discounts.
 */
import { GeoFencedUpsellTrigger } from '@clickflash/types';

export class GeoFencedRetargetingCron {
  /**
   * Processes proximity events and generates time-sensitive exit-gate discount offers
   */
  public static evaluateExitGateProximity(
    guestId: string,
    exitGateZone: string,
    distanceMeters: number
  ): GeoFencedUpsellTrigger | null {
    // Only trigger if guest is within 35 meters of an exit gate
    if (distanceMeters > 35) {
      return null;
    }

    const triggerId = `upsell_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const discountPercent = distanceMeters < 15 ? 25 : 15;

    return {
      id: triggerId,
      triggerId,
      guestId,
      exitGateZone,
      distanceMeters,
      triggerTime: new Date().toISOString(),
      offerType: 'LAST_CHANCE_DIGITAL_PASS',
      discountPercent,
      pushDelivered: true,
      created_at: new Date().toISOString()
    };
  }
}
