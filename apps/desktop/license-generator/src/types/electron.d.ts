import type { LicenseGeneratorApi } from '../preload';

declare global {
  interface Window {
    licenseApi: LicenseGeneratorApi;
  }
}

export {};
