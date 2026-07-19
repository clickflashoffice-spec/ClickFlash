export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function parseCurrency(value: string): number {
  return Number(value.replace(/[^0-9.-]+/g, ''));
}

export function centsToMajor(cents: number): number {
  return cents / 100;
}

export function majorToCents(amount: number): number {
  return Math.round(amount * 100);
}
