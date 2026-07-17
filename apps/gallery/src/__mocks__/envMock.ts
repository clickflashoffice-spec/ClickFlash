export const env = {
  API_BASE_URL: 'http://localhost:8092',
  CLOUD_API_URL: 'https://management-hub.clickflash-office.workers.dev',
  MONEYTRASH_API_URL: 'https://moneytrash-api.test',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
  IS_DEV: true,
  IS_PROD: false,
};

export const config = {
  apiUrl: env.API_BASE_URL,
  cloudUrl: env.CLOUD_API_URL,
  moneyTrashApiUrl: env.MONEYTRASH_API_URL,
  stripeKey: env.STRIPE_PUBLISHABLE_KEY,
  isDev: env.IS_DEV,
  isProd: env.IS_PROD,
  isCloudMode: true,
};
