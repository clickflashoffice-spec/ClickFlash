import fs from 'fs';
import http from 'http';
import https from 'https';
import { logger } from '../utils/logger';
import { getOrCreateManagedIdentity } from './tlsIdentityService';

export interface ServerConfig {
  port: number;
  host: string;
  protocol: 'http' | 'https';
}

export interface TLSConfig {
  enabled: boolean;
  keyPath?: string;
  certPath?: string;
  key?: string;
  cert?: string;
}

export function getTLSConfig(): TLSConfig {
  const enabled = process.env.TLS_ENABLED === 'true';

  if (!enabled) {
    return { enabled: false };
  }

  const keyPath = process.env.TLS_KEY_PATH;
  const certPath = process.env.TLS_CERT_PATH;

  if (keyPath && certPath) {
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      return {
        enabled: true,
        keyPath,
        certPath,
      };
    } else {
      logger.error('[TLS] TLS_ENABLED is true but configured certificate files are missing. Fail-closed enforced.');
      process.exit(1);
    }
  }

  const key = process.env.TLS_KEY;
  const cert = process.env.TLS_CERT;

  if (key && cert) {
    return {
      enabled: true,
      key,
      cert,
    };
  }

  logger.error('[TLS] TLS_ENABLED is true but no valid certificate configuration found. Fail-closed enforced.');
  process.exit(1);
}

export function createSecureServer(
  app: any,
  port: number,
  host: string
): { server: http.Server | https.Server; config: ServerConfig } {
  const tlsConfig = getTLSConfig();
  let httpsOptions: https.ServerOptions;

  if (tlsConfig.enabled) {
    if (tlsConfig.keyPath && tlsConfig.certPath) {
      httpsOptions = {
        key: fs.readFileSync(tlsConfig.keyPath),
        cert: fs.readFileSync(tlsConfig.certPath),
      };
    } else if (tlsConfig.key && tlsConfig.cert) {
      httpsOptions = {
        key: tlsConfig.key,
        cert: tlsConfig.cert,
      };
    } else {
      throw new Error('TLS enabled but no certificate configuration provided');
    }
  } else if (process.env.TEST_E2E !== '1') {
    // Phase 2: SEC-008 - Fall back to the managed self-signed identity
    logger.info('[TLS] Using auto-generated managed TLS identity for strict local HTTPS');
    const managedIdentity = getOrCreateManagedIdentity();
    httpsOptions = {
      key: managedIdentity.key,
      cert: managedIdentity.cert,
    };
  } else if (process.env.TEST_E2E === '1') {
    // E2E Test environment without explicit TLS enabled
    logger.info('[HTTP] E2E Mode detected, using unencrypted HTTP');
    const server = http.createServer(app);
    return {
      server,
      config: {
        port,
        host,
        protocol: 'http',
      },
    };
  } else {
    // Phase 2: SEC-008 - Fall back to the managed self-signed identity
    logger.info('[TLS] Using auto-generated managed TLS identity for strict local HTTPS');
    const managedIdentity = getOrCreateManagedIdentity();
    httpsOptions = {
      key: managedIdentity.key,
      cert: managedIdentity.cert,
    };
  }

  const server = https.createServer(httpsOptions, app);
  logger.info(`[HTTPS] TLS enabled, server will use HTTPS on port ${port}`);

  return {
    server,
    config: {
      port,
      host,
      protocol: 'https',
    },
  };
}

export function getServerUrl(config: ServerConfig, path: string = ''): string {
  const baseUrl = `${config.protocol}://${config.host}:${config.port}`;
  return path ? `${baseUrl}${path}` : baseUrl;
}
