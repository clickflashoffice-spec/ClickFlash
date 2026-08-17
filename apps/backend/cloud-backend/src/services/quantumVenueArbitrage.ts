import { QuantumVenueArbitrageQuote } from '@clickflash/types';

export interface MultiVenueArbitrageRequest {
  originVenueId: string;
  targetVenueId: string;
  weatherCondition: QuantumVenueArbitrageQuote['weatherCondition'];
  originalPassPriceMinor: number;
  guestTier: 'STANDARD' | 'VIP' | 'ALL_ACCESS';
}

export class QuantumVenueArbitrageEngine {
  private static CURRENCY_BASKET_RATES: Record<string, number> = {
    'venue_orlando_us': 1.0,
    'venue_paris_fr': 0.92,
    'venue_tokyo_jp': 154.5,
    'venue_dubai_ae': 3.67,
    'venue_london_uk': 0.79
  };

  /**
   * Evaluates weather condition and park capacity to generate a cross-venue dynamic yield quote
   */
  public generateArbitrageQuote(request: MultiVenueArbitrageRequest): QuantumVenueArbitrageQuote {
    const originRate = QuantumVenueArbitrageEngine.CURRENCY_BASKET_RATES[request.originVenueId] || 1.0;
    const targetRate = QuantumVenueArbitrageEngine.CURRENCY_BASKET_RATES[request.targetVenueId] || 1.0;
    const currencyBasketRatio = Number((targetRate / originRate).toFixed(4));

    const isInclement = request.weatherCondition === 'HEAVY_RAIN' || request.weatherCondition === 'TYPHOON' || request.weatherCondition === 'HEATWAVE';
    const passTransferEligibility = isInclement || request.guestTier === 'VIP' || request.guestTier === 'ALL_ACCESS';

    let yieldArbitrageSavingsPercent = 0;
    let recommendedCrossParkOffer = 'STANDARD_ENTRY_CONTINUATION';

    if (request.weatherCondition === 'HEAVY_RAIN' || request.weatherCondition === 'TYPHOON') {
      yieldArbitrageSavingsPercent = 40;
      recommendedCrossParkOffer = 'INCLEMENT_WEATHER_INDOOR_STUDIO_VIP_UPGRADE';
    } else if (request.weatherCondition === 'HEATWAVE') {
      yieldArbitrageSavingsPercent = 25;
      recommendedCrossParkOffer = 'WATERPARK_CROSS_PASS_TRANSFER';
    } else if (request.guestTier === 'ALL_ACCESS') {
      yieldArbitrageSavingsPercent = 20;
      recommendedCrossParkOffer = 'GLOBAL_MULTI_VENUE_PASSPORT_COMPLIMENTARY_ROAMING';
    }

    return {
      originVenueId: request.originVenueId,
      targetVenueId: request.targetVenueId,
      weatherCondition: request.weatherCondition,
      passTransferEligibility,
      currencyBasketRatio,
      recommendedCrossParkOffer,
      yieldArbitrageSavingsPercent
    };
  }
}

export const quantumVenueArbitrageEngine = new QuantumVenueArbitrageEngine();
