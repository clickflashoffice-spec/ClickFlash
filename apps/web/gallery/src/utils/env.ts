export const env = {
  // Try to use Vite's import.meta.env if available, otherwise fallback (e.g. during testing)
  API_BASE_URL: typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL 
    ? import.meta.env.VITE_API_URL 
    : 'http://localhost:8092',
    
  // The cloud API URL (management hub)
  CLOUD_API_URL: typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLOUD_API_URL 
    ? import.meta.env.VITE_CLOUD_API_URL 
    : 'https://management-hub.clickflash-office.workers.dev',

  MONEYTRASH_API_URL: typeof import.meta !== 'undefined' && import.meta.env?.VITE_MONEYTRASH_API_URL
    ? import.meta.env.VITE_MONEYTRASH_API_URL
    : 'https://moneytrash-api.clickflash-office.workers.dev',

  // Stripe
  STRIPE_PUBLISHABLE_KEY: typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PUBLISHABLE_KEY
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    : '',

  // Environment detection
  IS_DEV: typeof import.meta !== 'undefined' && import.meta.env?.DEV,
  IS_PROD: typeof import.meta !== 'undefined' && import.meta.env?.PROD,
};

export const config = {
  apiUrl: env.API_BASE_URL,
  cloudUrl: env.CLOUD_API_URL,
  moneyTrashApiUrl: env.MONEYTRASH_API_URL,
  stripeKey: env.STRIPE_PUBLISHABLE_KEY,
  isDev: env.IS_DEV,
  isProd: env.IS_PROD,
  isCloudMode: true, // Always true for this deployment
};
