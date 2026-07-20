import { contextBridge, ipcRenderer } from 'electron';
import type {
  GenerateLicenseRequest,
  SigningKeySelection,
  ValidateLicenseRequest,
  AuditLogEntry,
  RevocationEntry
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
  getHardwareFingerprint: (): Promise<string> => ipcRenderer.invoke('license:get-hardware-fingerprint'),
  getAuditLogs: (): Promise<AuditLogEntry[]> => ipcRenderer.invoke('license:get-audit-logs'),
  getRevocations: (): Promise<RevocationEntry[]> => ipcRenderer.invoke('license:get-revocations'),
  revokeLicense: (key: string, reason: string): Promise<void> => ipcRenderer.invoke('license:revoke-key', key, reason),
  exportRevocations: (): Promise<string | undefined> => ipcRenderer.invoke('license:export-revocations'),
  exportDatabase: (): Promise<string | undefined> => ipcRenderer.invoke('license:export-database'),
};

contextBridge.exposeInMainWorld('licenseApi', api);

export type LicenseGeneratorApi = typeof api;
