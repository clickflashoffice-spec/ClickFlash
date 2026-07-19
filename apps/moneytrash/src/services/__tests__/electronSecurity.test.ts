import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { isPackaged: true } }));

import {
  isTrustedRendererUrl,
  parseApprovedApiUrl,
  parseApprovedExternalUrl,
} from '../../../electron-security';

describe('MoneyTrash Electron URL policy', () => {
  it('allows only the packaged renderer entry', () => {
    const entry = 'moneytrash-app://app/index.html';
    expect(isTrustedRendererUrl('moneytrash-app://app/index.html', entry)).toBe(true);
    expect(isTrustedRendererUrl('https://clickflash.com/', entry)).toBe(false);
    expect(isTrustedRendererUrl('moneytrash-app://app/other.html', entry)).toBe(false);
    expect(isTrustedRendererUrl('file:///C:/MoneyTrash/dist/index.html', entry)).toBe(false);
  });

  it('allows approved production APIs and rejects credential or query injection', () => {
    expect(parseApprovedApiUrl('https://moneytrash-api.clickflash.com/')).toBe('https://moneytrash-api.clickflash.com');
    expect(parseApprovedApiUrl('https://moneytrash-api-preview.account.workers.dev')).toBe(
      'https://moneytrash-api-preview.account.workers.dev',
    );
    expect(() => parseApprovedApiUrl('https://evil.example')).toThrow('not an approved');
    expect(() => parseApprovedApiUrl('https://moneytrash-api.clickflash.com?redirect=evil')).toThrow('query parameters');
    expect(() => parseApprovedApiUrl('https://user:secret@moneytrash-api.clickflash.com')).toThrow('credentials');
  });

  it('rejects unrelated workers.dev links from external navigation', () => {
    expect(parseApprovedExternalUrl('https://gallery.clickflash.com/order/1')).toBe('https://gallery.clickflash.com/order/1');
    expect(() => parseApprovedExternalUrl('https://unrelated.account.workers.dev')).toThrow('not approved');
    expect(() => parseApprovedExternalUrl('http://clickflash.com')).toThrow('HTTPS');
  });
});
