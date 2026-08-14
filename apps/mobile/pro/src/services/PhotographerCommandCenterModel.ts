import type { PhotographerCommandCenterV1 } from '@clickflash/types';

export const UNAVAILABLE_METRIC = 'Unavailable';

export function formatMinorUnits(
  value: number | null,
  currency: string,
  currencyExponent: number,
  locale?: string
): string {
  if (value === null) return UNAVAILABLE_METRIC;
  const divisor = 10 ** currencyExponent;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currencyExponent,
    maximumFractionDigits: currencyExponent,
  }).format(value / divisor);
}

export function formatBasisPoints(value: number | null): string {
  return value === null ? UNAVAILABLE_METRIC : `${(value / 100).toFixed(1)}%`;
}

export function targetProgressBps(
  actual: number,
  target: number | null
): number | null {
  if (target === null || target <= 0) return null;
  return Math.max(0, Math.min(10_000, Math.round((actual / target) * 10_000)));
}

export function qualityFlagRateBps(
  snapshot: PhotographerCommandCenterV1
): number | null {
  return snapshot.activity.photosCatalogued > 0
    ? Math.min(
        10_000,
        Math.round(
          (snapshot.activity.qualityFlagged /
            snapshot.activity.photosCatalogued) *
            10_000
        )
      )
    : null;
}

export function freshnessLabel(
  snapshot: PhotographerCommandCenterV1
): string {
  if (snapshot.sync.stale) return 'STALE SOURCE';
  if (snapshot.sync.pendingEventCount > 0) {
    return `${snapshot.sync.pendingEventCount} PENDING`;
  }
  return 'CURRENT';
}

export default {
  UNAVAILABLE_METRIC,
  formatBasisPoints,
  formatMinorUnits,
  freshnessLabel,
  qualityFlagRateBps,
  targetProgressBps,
};
