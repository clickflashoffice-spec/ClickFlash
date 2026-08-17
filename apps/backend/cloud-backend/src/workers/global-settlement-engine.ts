/**
 * Global Purchasing Power Parity (PPP) Settlement Engine
 * Adjusts checkout pricing across international currencies according to purchasing power index,
 * maximizing conversion rates for global international theme park visitors.
 */
import { PppCurrencyRate } from '@clickflash/types';

export class GlobalSettlementEngine {
  private static pppIndexMap: Map<string, PppCurrencyRate> = new Map([
    ['USD', { id: 'ppp_usd', currencyCode: 'USD', countryName: 'United States', pppMultiplier: 1.0, rawExchangeRateToUsd: 1.0, localizedSymbol: '$' }],
    ['EUR', { id: 'ppp_eur', currencyCode: 'EUR', countryName: 'Eurozone', pppMultiplier: 0.95, rawExchangeRateToUsd: 0.92, localizedSymbol: '€' }],
    ['GBP', { id: 'ppp_gbp', currencyCode: 'GBP', countryName: 'United Kingdom', pppMultiplier: 0.90, rawExchangeRateToUsd: 0.79, localizedSymbol: '£' }],
    ['JPY', { id: 'ppp_jpy', currencyCode: 'JPY', countryName: 'Japan', pppMultiplier: 0.78, rawExchangeRateToUsd: 154.5, localizedSymbol: '¥' }],
    ['BRL', { id: 'ppp_brl', currencyCode: 'BRL', countryName: 'Brazil', pppMultiplier: 0.65, rawExchangeRateToUsd: 5.45, localizedSymbol: 'R$' }],
    ['AUD', { id: 'ppp_aud', currencyCode: 'AUD', countryName: 'Australia', pppMultiplier: 0.92, rawExchangeRateToUsd: 1.52, localizedSymbol: 'A$' }],
    ['AED', { id: 'ppp_aed', currencyCode: 'AED', countryName: 'United Arab Emirates', pppMultiplier: 1.05, rawExchangeRateToUsd: 3.67, localizedSymbol: 'AED' }]
  ]);

  /**
   * Calculates localized price adjusted for purchasing power parity
   */
  public static calculatePppPrice(
    baseUsdPrice: number,
    targetCurrency: string
  ): { localPrice: number; formatted: string; pppFactor: number; currency: string } {
    const rate = this.pppIndexMap.get(targetCurrency.toUpperCase()) || this.pppIndexMap.get('USD')!;
    const pppAdjustedUsd = baseUsdPrice * rate.pppMultiplier;
    const localAmount = pppAdjustedUsd * rate.rawExchangeRateToUsd;

    return {
      localPrice: Number(localAmount.toFixed(2)),
      formatted: `${rate.localizedSymbol}${localAmount.toFixed(2)}`,
      pppFactor: rate.pppMultiplier,
      currency: rate.currencyCode
    };
  }

  public static getSupportedCurrencies(): PppCurrencyRate[] {
    return Array.from(this.pppIndexMap.values());
  }
}
