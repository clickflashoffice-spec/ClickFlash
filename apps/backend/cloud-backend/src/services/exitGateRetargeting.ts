import { GeoFencedUpsellTrigger } from '@clickflash/types';

export interface ExitGateProximityEvent {
  guestId: string;
  exitGateZone: string;
  distanceMeters: number;
  unpurchasedPhotosCount: number;
  parkDwellHours: number;
  phoneOrWhatsAppNumber?: string;
}

export class ExitGateRetargetingService {
  /**
   * Evaluates exit-gate geofence proximity events and generates high-conversion sunset discount triggers.
   */
  public evaluateExitGateProximity(event: ExitGateProximityEvent): GeoFencedUpsellTrigger | null {
    // Only fire trigger if guest is within 75m of exit gate and has unsold photos
    if (event.distanceMeters > 75 || event.unpurchasedPhotosCount <= 0) {
      return null;
    }

    const triggerId = `exit_upsell_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Dynamic discount calculation: guests with > 10 photos staying > 4h get higher last-chance incentive
    let discountPercent = 20;
    let offerType: GeoFencedUpsellTrigger['offerType'] = 'LAST_CHANCE_DIGITAL_PASS';

    if (event.unpurchasedPhotosCount >= 15) {
      discountPercent = 35;
      offerType = 'VIP_PRINT_BUNDLE';
    } else if (event.parkDwellHours >= 5) {
      discountPercent = 25;
      offerType = 'SPLAT_3D_MEMORY';
    }

    const trigger: GeoFencedUpsellTrigger = {
      id: triggerId,
      triggerId,
      guestId: event.guestId,
      exitGateZone: event.exitGateZone,
      distanceMeters: event.distanceMeters,
      triggerTime: new Date().toISOString(),
      offerType,
      discountPercent,
      pushDelivered: !!event.phoneOrWhatsAppNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return trigger;
  }
}

export const exitGateRetargetingService = new ExitGateRetargetingService();
