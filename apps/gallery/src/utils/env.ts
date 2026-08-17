export const config = {
  apiUrl: (typeof window !== 'undefined' && (window as any).__CLICKFLASH_API_URL__) || 'http://localhost:8090/api',
  cloudUrl: (typeof window !== 'undefined' && (window as any).__CLICKFLASH_CLOUD_URL__) || 'https://gallery-backend.clickflash-office.workers.dev',
  stripePublicKey: (typeof window !== 'undefined' && (window as any).__STRIPE_KEY__) || 'pk_test_demo',
  stripeKey: (typeof window !== 'undefined' && (window as any).__STRIPE_KEY__) || 'pk_test_demo',
  moneyTrashApiUrl: (typeof window !== 'undefined' && (window as any).__CLICKFLASH_CLOUD_URL__) || 'https://gallery-backend.clickflash-office.workers.dev',
  currency: 'USD',
  currencySymbol: '$'
};
