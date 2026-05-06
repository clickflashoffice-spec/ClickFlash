import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';

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

  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      enabled: true,
      keyPath,
      certPath,
    };
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

  console.warn('[TLS] Enabled but no valid configuration found, falling back to HTTP');
  return { enabled: false };
}

export function createSecureServer(
  app: any,
  port: number,
  host: string
): { server: http.Server | https.Server; config: ServerConfig } {
  const tlsConfig = getTLSConfig();

  if (tlsConfig.enabled) {
    let httpsOptions: https.ServerOptions;

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

    const server = https.createServer(httpsOptions, app);
    console.log(`[HTTPS] TLS enabled, server will use HTTPS on port ${port}`);

    return {
      server,
      config: {
        port,
        host,
        protocol: 'https',
      },
    };
  }

  const server = http.createServer(app);
  console.log(`[HTTP] TLS not enabled, using HTTP on port ${port}`);

  return {
    server,
    config: {
      port,
      host,
      protocol: 'http',
    },
  };
}

export function getServerUrl(config: ServerConfig, path: string = ''): string {
  const baseUrl = `${config.protocol}://${config.host}:${config.port}`;
  return path ? `${baseUrl}${path}` : baseUrl;
}
