import { contextBridge, ipcRenderer } from 'electron';
import type {
  GenerateLicenseRequest,
  SigningKeySelection,
  ValidateLicenseRequest,
} from './electron-contract';
import type { LicenseKeyData } from './types/license';

const api = {
  selectSigningKey: (): Promise<SigningKeySelection> => (
    ipcRenderer.invoke('license:select-signing-key')
  ),
  clearSigningKey: (): Promise<void> => ipcRenderer.invoke('license:clear-signing-key'),
  generateLicenses: (request: GenerateLicenseRequest): Promise<LicenseKeyData[]> => (
    ipcRenderer.invoke('license:generate', request)
  ),
  validateLicense: (request: ValidateLicenseRequest) => (
    ipcRenderer.invoke('license:validate', request)
  ),
};

contextBridge.exposeInMainWorld('licenseApi', api);

export type LicenseGeneratorApi = typeof api;
