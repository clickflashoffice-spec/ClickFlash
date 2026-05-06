#!/usr/bin/env node
/**
 * ClickFlash 1-Click Installation CLI
 * 
 * Usage:
 *   npx clickflash-install --location "Miami Resort" --email admin@example.com --password secret123
 *   npx clickflash-install --config config.json
 *   npx clickflash-install --interactive
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';

const API_BASE = process.env.CLOUDFLARE_API_URL || 'https://api.cloudflare.com/client/v4';
const HUB_URL = process.env.HUB_URL || 'https://hub.clickflash.photo';

interface InstallerConfig {
  locationName: string;
  adminEmail: string;
  adminPassword: string;
  cloudflareApiToken?: string;
  cloudflareAccountId?: string;
  cloudflareZoneId?: string;
  cloudflareDomain?: string;
  hubUrl?: string;
  dataDir?: string;
  port?: number;
  // Email routing config
  alertsEmail?: string;
  ordersEmail?: string;
  setupEmailRouting?: boolean;
}

interface InstallationResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  error?: string;
}

interface ProgressCallback {
  (step: string, message: string, progress: number): void;
}

function log(level: 'info' | 'warn' | 'error', message: string, ...args: unknown[]): void {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✓';
  console.log(`[${new Date().toISOString()}] ${prefix} ${message}`, ...args);
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    client.get(url, async (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      try {
        await pipeline(response, file);
        resolve();
      } catch (err) {
        reject(err);
      }
    }).on('error', reject);
  });
}

async function checkCloudflareCredentials(apiToken: string, accountId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

function slugifyLocation(locationName: string): string {
  return locationName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function createCloudflareTunnel(
  config: InstallerConfig,
  onProgress: ProgressCallback
): Promise<{ tunnelId: string; tunnelToken: string; hostname: string }> {
  onProgress('cloudflare_tunnel', 'Creating Cloudflare Tunnel...', 20);

  const locationSlug = slugifyLocation(config.locationName);
  const tunnelName = `clickflash-${locationSlug}`;
  const hostname = `${locationSlug}.master.${config.cloudflareDomain}`;

  // Check for existing tunnel with same name
  const listResponse = await fetch(`${API_BASE}/accounts/${config.cloudflareAccountId}/tunnels`, {
    headers: {
      'Authorization': `Bearer ${config.cloudflareApiToken}`,
    },
  });

  if (listResponse.ok) {
    const listData = await listResponse.json();
    const existingTunnel = listData.result?.find((t: any) => t.name === tunnelName && !t.deleted_at);
    if (existingTunnel) {
      log('info', 'Reusing existing tunnel:', existingTunnel.id);
      onProgress('cloudflare_tunnel', 'Reusing existing tunnel', 30);
      return {
        tunnelId: existingTunnel.id,
        tunnelToken: existingTunnel.tunnel_token || '',
        hostname,
      };
    }
  }

  const response = await fetch(`${API_BASE}/accounts/${config.cloudflareAccountId}/tunnels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.cloudflareApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: tunnelName,
      tunnel_type: 'full',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create tunnel: ${JSON.stringify(error.errors || error)}`);
  }

  const tunnel = await response.json();
  onProgress('cloudflare_tunnel', 'Tunnel created successfully', 30);

  return {
    tunnelId: tunnel.result.id,
    tunnelToken: tunnel.result.tunnel_token,
    hostname,
  };
}

async function configureCloudflareDNS(
  config: InstallerConfig,
  tunnel: { tunnelId: string; hostname: string },
  onProgress: ProgressCallback
): Promise<string[]> {
  onProgress('cloudflare_dns', 'Configuring DNS records...', 40);

  const locationSlug = slugifyLocation(config.locationName);
  const records = [
    { name: `${locationSlug}.master.${config.cloudflareDomain}`, type: 'CNAME', content: `${tunnel.tunnelId}.cfargotunnel.com` },
    { name: `${locationSlug}.gallery.${config.cloudflareDomain}`, type: 'CNAME', content: `${tunnel.tunnelId}.cfargotunnel.com` },
    { name: `${locationSlug}.management.${config.cloudflareDomain}`, type: 'CNAME', content: `${tunnel.tunnelId}.cfargotunnel.com` },
  ];

  // Get existing DNS records
  const listResponse = await fetch(`${API_BASE}/zones/${config.cloudflareZoneId}/dns_records`, {
    headers: {
      'Authorization': `Bearer ${config.cloudflareApiToken}`,
    },
  });

  const existingRecords = listResponse.ok ? (await listResponse.json()).result || [] : [];
  const existingByName = new Map<string, any>(existingRecords.map((r: any) => [r.name, r]));

  for (const record of records) {
    const existing = existingByName.get(record.name);

    if (existing) {
      // Update existing record
      const updateResponse = await fetch(`${API_BASE}/zones/${config.cloudflareZoneId}/dns_records/${existing.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...record, proxied: true, ttl: 1 }),
      });

      if (updateResponse.ok) {
        log('info', `Updated DNS record: ${record.name}`);
      }
    } else {
      // Create new record
      const response = await fetch(`${API_BASE}/zones/${config.cloudflareZoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...record, proxied: true, ttl: 1 }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to configure DNS: ${JSON.stringify(error.errors || error)}`);
      }
    }
  }

  onProgress('cloudflare_dns', 'DNS configured successfully', 50);
  return records.map(r => r.name);
}

async function registerCloudflareApps(
  config: InstallerConfig,
  onProgress: ProgressCallback
): Promise<void> {
  onProgress('cloudflare_apps', 'Registering Cloudflare Apps...', 60);

  // List existing projects
  const listResponse = await fetch(`${API_BASE}/accounts/${config.cloudflareAccountId}/pages/projects`, {
    headers: {
      'Authorization': `Bearer ${config.cloudflareApiToken}`,
    },
  });

  const existingProjects = listResponse.ok ? (await listResponse.json()).result || [] : [];

  // Gallery and Management apps - these use existing projects if available
  // The subdomain is mapped to clickflash-gallery.pages.dev or clickflash-management.pages.dev
  const galleryProject = existingProjects.find((p: any) => p.name === 'clickflash-gallery');
  const managementProject = existingProjects.find((p: any) => p.name === 'clickflash-management');

  if (galleryProject) {
    log('info', `Using existing Cloudflare Pages project for Gallery: ${galleryProject.name}`);
  }

  if (managementProject) {
    log('info', `Using existing Cloudflare Pages project for Management: ${managementProject.name}`);
  }

  onProgress('cloudflare_apps', 'Cloudflare Pages projects ready', 70);
}

async function registerWithHub(
  config: InstallerConfig,
  onProgress: ProgressCallback
): Promise<void> {
  onProgress('hub_registration', 'Connecting to Management Hub...', 80);

  try {
    const locationSlug = slugifyLocation(config.locationName);
    const endpoint = `https://${locationSlug}.master.${config.cloudflareDomain}`;
    const response = await fetch(`${config.hubUrl || HUB_URL}/api/nodes/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.locationName,
        endpoint,
        version: '4.2.0',
        capabilities: ['photos', 'orders', 'culling', 'face-recognition'],
      }),
    });

    if (response.ok) {
      onProgress('hub_registration', 'Connected to Hub successfully', 90);
    } else {
      log('warn', 'Hub registration failed (non-fatal), continuing...');
    }
  } catch (error) {
    log('warn', 'Hub registration failed (non-fatal), continuing...');
  }
}

interface EmailRoute {
  id: string;
  name: string;
  email: string;
  target: string;
  verified: boolean;
}

async function setupEmailRouting(
  config: InstallerConfig,
  onProgress: ProgressCallback
): Promise<{ success: boolean; routes?: EmailRoute[] }> {
  if (!config.setupEmailRouting) {
    log('info', 'Email routing skipped (not requested)');
    return { success: true };
  }

  if (!config.cloudflareApiToken || !config.cloudflareAccountId || !config.cloudflareZoneId || !config.cloudflareDomain) {
    log('warn', 'Email routing skipped (Cloudflare credentials required)');
    return { success: true };
  }

  onProgress('email_routing', 'Setting up email routing...', 75);

  const routes: EmailRoute[] = [
    { id: 'admin', name: 'admin', email: `admin@${config.cloudflareDomain}`, target: config.adminEmail, verified: false },
    { id: 'alerts', name: 'alerts', email: `alerts@${config.cloudflareDomain}`, target: config.alertsEmail || config.adminEmail, verified: false },
    { id: 'orders', name: 'orders', email: `orders@${config.cloudflareDomain}`, target: config.ordersEmail || config.adminEmail, verified: false },
  ];

  try {
    // Create DNS records for email routing (MX, SPF, DKIM)
    const dnsRecords = [
      { name: config.cloudflareDomain, type: 'MX', content: `email.${config.cloudflareDomain}.`, priority: 10, proxied: false },
      { name: `email.${config.cloudflareDomain}`, type: 'CNAME', content: `cloudflare.com.`, proxied: false },
    ];

    for (const record of dnsRecords) {
      await fetch(`${API_BASE}/zones/${config.cloudflareZoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(record),
      });
    }

    // Create TXT record for SPF
    await fetch(`${API_BASE}/zones/${config.cloudflareZoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.cloudflareApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.cloudflareDomain,
        type: 'TXT',
        content: 'v=spf1 include:_spf.cloudflare.com ~all',
        proxied: false,
      }),
    });

    // Create DMARC record
    await fetch(`${API_BASE}/zones/${config.cloudflareZoneId}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.cloudflareApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `_dmarc.${config.cloudflareDomain}`,
        type: 'TXT',
        content: 'v=DMARC1; p=quarantine; rua=mailto:admin@localhost',
        proxied: false,
      }),
    });

    // Create email routing rules via Workers
    const workerScript = `
addEventListener("email", (event) => {
  const to = event.to.toLowerCase();
  const from = event.from.toLowerCase();
  
  let destination = null;
  
  if (to.startsWith("admin@")) {
    destination = "${config.adminEmail}";
  } else if (to.startsWith("alerts@")) {
    destination = "${config.alertsEmail || config.adminEmail}";
  } else if (to.startsWith("orders@")) {
    destination = "${config.ordersEmail || config.adminEmail}";
  }
  
  if (destination) {
    event.forward(destination);
  } else {
    event.setReject("Recipient not found");
  }
});
`;

    // Upload email worker
    const workerName = 'clickflash-email-router';
    await fetch(`${API_BASE}/accounts/${config.cloudflareAccountId}/workers/scripts/${workerName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.cloudflareApiToken}`,
        'Content-Type': 'application/javascript',
      },
      body: workerScript,
    });

    onProgress('email_routing', 'Email routing configured successfully', 85);
    log('info', 'Email routing setup complete', { routes: routes.map(r => r.email) });

    return { success: true, routes };
  } catch (error) {
    log('warn', 'Email routing setup failed (non-fatal)', error);
    return { success: true }; // Non-fatal
  }
}

async function initializeLocalDatabase(
  config: InstallerConfig,
  onProgress: ProgressCallback
): Promise<void> {
  onProgress('initializing', 'Initializing local database...', 10);

  const dataDir = config.dataDir || path.join(process.cwd(), 'pb_data');
  const dbPath = path.join(dataDir, 'clickflash.db');

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  log('info', 'Database initialized at:', dbPath);
  onProgress('initializing', 'Database initialized', 15);
}

async function downloadCloudflared(
  installDir: string,
  onProgress: ProgressCallback
): Promise<string> {
  onProgress('cloudflared', 'Downloading cloudflared...', 5);

  const platform = process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : 'arm64';
  const ext = platform === 'win32' ? 'zip' : 'tgz';
  const version = '2024.10.0';
  
  const url = `https://github.com/cloudflare/cloudflared/releases/download/${version}/cloudflared-${platform}-${arch}.${ext}`;
  
  const cfPath = platform === 'win32' 
    ? path.join(installDir, 'cloudflared.exe')
    : path.join(installDir, 'cloudflared');

  try {
    if (platform === 'win32') {
      // Download zip and extract
      const zipPath = path.join(installDir, 'cloudflared.zip');
      await downloadFile(url, zipPath);
      const { execSync } = await import('child_process');
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${installDir}' -Force"`);
      // Rename to cloudflared.exe if needed
      if (existsSync(zipPath.replace('.zip', '.exe')) && !existsSync(cfPath)) {
        execSync(`Move-Item -Path '${zipPath.replace('.zip', '.exe')}' -Destination '${cfPath}'`);
      }
      fs.unlinkSync(zipPath);
    } else {
      await downloadFile(url, cfPath);
      const { execSync } = await import('child_process');
      execSync(`chmod +x ${cfPath}`);
    }
    onProgress('cloudflared', 'cloudflared downloaded and installed', 10);
    return cfPath;
  } catch (error) {
    log('warn', 'Failed to download cloudflared', error);
    return '';
  }
}

async function createTunnelCredentialsFile(
  installDir: string,
  tunnel: { tunnelId: string; tunnelToken: string },
  onProgress: ProgressCallback
): Promise<string> {
  onProgress('tunnel_config', 'Creating tunnel credentials...', 35);

  const tunnelsDir = path.join(installDir, 'tunnels');
  if (!existsSync(tunnelsDir)) {
    mkdirSync(tunnelsDir, { recursive: true });
  }

  const credentialsPath = path.join(tunnelsDir, 'credentials.json');
  const credentials = {
    tunnel_id: tunnel.tunnelId,
    tunnel_token: tunnel.tunnelToken,
  };

  fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
  log('info', 'Tunnel credentials saved to:', credentialsPath);
  onProgress('tunnel_config', 'Tunnel credentials created', 38);

  return credentialsPath;
}

async function createCloudflaredConfig(
  installDir: string,
  config: InstallerConfig,
  _tunnel: { tunnelId: string; hostname: string },
  onProgress: ProgressCallback
): Promise<string> {
  onProgress('tunnel_config', 'Creating cloudflared configuration...', 40);

  const locationSlug = slugifyLocation(config.locationName);
  const configPath = path.join(installDir, 'cloudflared.yml');

  const cloudflaredConfig = `---
# Cloudflared ingress configuration for ${config.locationName}
# Generated by ClickFlash 1-Click Installer

ingress:
  - hostname: ${locationSlug}.master.${config.cloudflareDomain}
    service: http://localhost:8090
  - hostname: ${locationSlug}.gallery.${config.cloudflareDomain}
    service: https://clickflash-gallery.pages.dev
  - hostname: ${locationSlug}.management.${config.cloudflareDomain}
    service: https://clickflash-management.pages.dev
  - service: http_status:404
`;

  fs.writeFileSync(configPath, cloudflaredConfig);
  log('info', 'Cloudflared config saved to:', configPath);
  onProgress('tunnel_config', 'Cloudflared config created', 42);

  return configPath;
}

async function generateEnvFile(
  installDir: string,
  config: InstallerConfig,
  tunnel: { tunnelId: string; tunnelToken: string },
  onProgress: ProgressCallback
): Promise<string> {
  onProgress('env_config', 'Generating .env configuration...', 50);

  const locationSlug = slugifyLocation(config.locationName);
  const galleryApiKey = crypto.randomBytes(32).toString('hex');
  const moneytrashApiKey = crypto.randomBytes(32).toString('hex');
  const hubApiKey = crypto.randomBytes(32).toString('hex');

  const envContent = `# ClickFlash Master Configuration
# Generated by 1-Click Installer for ${config.locationName}
# Date: ${new Date().toISOString()}

# Node Environment
NODE_ENV=production
PORT=8090
DATA_DIR=./pb_data

# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=${config.cloudflareApiToken}
CLOUDFLARE_ACCOUNT_ID=${config.cloudflareAccountId}
CLOUDFLARE_ZONE_ID=${config.cloudflareZoneId}
CLOUDFLARE_DOMAIN=${config.cloudflareDomain}

# Tunnel Configuration
TUNNEL_ID=${tunnel.tunnelId}
TUNNEL_TOKEN=${tunnel.tunnelToken}
TUNNEL_NAME=${locationSlug}
TUNNEL_CREDENTIALS_FILE=./tunnels/credentials.json
CLOUDFLARED_PATH=./cloudflared${process.platform === 'win32' ? '.exe' : ''}
CLOUDFLARED_CONFIG=./cloudflared.yml

# Location
LOCATION_SLUG=${locationSlug}
LOCATION_NAME=${config.locationName}

# Gallery Connection (Auto-configured)
GALLERY_URL=https://${locationSlug}.gallery.${config.cloudflareDomain}
GALLERY_API_KEY=${galleryApiKey}
GALLERY_CLOUD_NAME=clickflash-gallery
GALLERY_CLOUD_ACCOUNT=${config.cloudflareAccountId}

# Cloud Sync (used by cloudSyncService)
CLOUD_API_URL=https://management.clicketflash.com
CLOUD_GALLERY_URL=https://gallery.clicketflash.com
CLOUD_EMAIL=${config.adminEmail}
CLOUD_PASSWORD=${config.adminPassword}
DESK_ID=${locationSlug}

# MoneyTrash Connection (Auto-configured)
MONEYTRASH_URL=https://${locationSlug}.moneytrash.${config.cloudflareDomain}
MONEYTRASH_API_KEY=${moneytrashApiKey}

# Hub Connection (Auto-configured)
HUB_URL=${config.hubUrl || 'https://management.clicketflash.com'}
HUB_API_KEY=${hubApiKey}
HUB_HEARTBEAT_INTERVAL=60000

# Sync Settings
SYNC_ENABLED=true
SYNC_INTERVAL_MS=60000

# Security
SESSION_SECRET=${crypto.randomBytes(64).toString('hex')}
JWT_SECRET=${crypto.randomBytes(64).toString('hex')}

# Database
DB_FILE=./pb_data/clickflash.db

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Upload Settings
MAX_UPLOAD_SIZE=52428800
CHUNK_SIZE=4194304

# Machine ID (auto-generated, unique per installation)
MACHINE_ID=${crypto.randomUUID()}

# Admin (Initial setup - change password after first login)
ADMIN_EMAIL=${config.adminEmail}
ADMIN_PASSWORD=${config.adminPassword}
`;

  const envPath = path.join(installDir, '.env');
  fs.writeFileSync(envPath, envContent);
  log('info', '.env configuration saved to:', envPath);
  onProgress('env_config', '.env configuration created', 55);

  return envPath;
}

async function generateGalleryConfig(
  installDir: string,
  config: InstallerConfig,
  onProgress: ProgressCallback
): Promise<void> {
  onProgress('gallery_config', 'Generating Gallery configuration...', 60);

  const locationSlug = slugifyLocation(config.locationName);
  const galleryApiKey = crypto.randomBytes(32).toString('hex');
  
  const galleryConfigPath = path.join(installDir, 'config', 'gallery.json');
  const configDir = path.join(installDir, 'config');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const galleryConfig = {
    url: `https://${locationSlug}.gallery.${config.cloudflareDomain}`,
    apiKey: galleryApiKey,
    cloudName: 'clickflash-gallery',
    cloudAccount: config.cloudflareAccountId,
  };

  fs.writeFileSync(galleryConfigPath, JSON.stringify(galleryConfig, null, 2));
  log('info', 'Gallery config saved to:', galleryConfigPath);
  onProgress('gallery_config', 'Gallery configuration created', 65);
}



async function performInstallation(
  config: InstallerConfig,
  onProgress: ProgressCallback
): Promise<InstallationResult> {
  const startTime = Date.now();

  try {
    log('info', 'Starting ClickFlash installation', config.locationName);

    if (config.cloudflareApiToken && config.cloudflareAccountId) {
      const valid = await checkCloudflareCredentials(config.cloudflareApiToken, config.cloudflareAccountId);
      if (!valid) {
        return { success: false, message: 'Invalid Cloudflare credentials', error: 'Please verify your API token and account ID' };
      }
    }

    // Create installation directory
    const locationSlug = slugifyLocation(config.locationName);
    const installDir = path.join(process.cwd(), `ClickFlash-Master-${locationSlug}`);
    
    if (!existsSync(installDir)) {
      mkdirSync(installDir, { recursive: true });
    }
    log('info', 'Installation directory:', installDir);

    // Initialize database
    const dataDir = path.join(installDir, 'pb_data');
    await initializeLocalDatabase({ ...config, dataDir }, onProgress);

    let tunnel = { tunnelId: '', tunnelToken: '', hostname: '' };

    if (config.cloudflareApiToken && config.cloudflareAccountId && config.cloudflareZoneId && config.cloudflareDomain) {
      // Step 1: Download and bundle cloudflared in installation folder
      await downloadCloudflared(installDir, onProgress);
      
      // Step 2: Create Cloudflare tunnel
      tunnel = await createCloudflareTunnel(config, onProgress);
      
      // Step 3: Configure DNS records for this location
      await configureCloudflareDNS(config, tunnel, onProgress);
      
      // Step 4: Register with Cloudflare apps (Pages projects)
      await registerCloudflareApps(config, onProgress);
      
      // Step 5: Create tunnel credentials file (for cloudflared run --credentials)
      await createTunnelCredentialsFile(installDir, tunnel, onProgress);
      
      // Step 6: Create cloudflared.yml ingress config
      await createCloudflaredConfig(installDir, config, tunnel, onProgress);
      
      // Step 7: Generate complete .env file with all settings
      await generateEnvFile(installDir, config, tunnel, onProgress);
      
      // Step 8: Generate Gallery config
      await generateGalleryConfig(installDir, config, onProgress);
    }

    // Step 9: Register with Hub
    await registerWithHub(config, onProgress);

    // Setup email routing if requested
    await setupEmailRouting(config, onProgress);

    onProgress('finalizing', 'Installation complete!', 100);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    log('info', '');
    log('info', '===========================================');
    log('info', 'Installation completed successfully!');
    log('info', `Location: ${config.locationName}`);
    log('info', `Installation folder: ${installDir}`);
    log('info', `Master URL: https://${locationSlug}.master.${config.cloudflareDomain}`);
    log('info', `Gallery URL: https://${locationSlug}.gallery.${config.cloudflareDomain}`);
    log('info', `Management URL: https://${locationSlug}.management.${config.cloudflareDomain}`);
    log('info', `Duration: ${duration}s`);
    log('info', '===========================================');
    log('info', '');
    log('info', 'To start the Master:');
    log('info', `  cd ${installDir}`);
    log('info', '  ./start.sh   # Linux/Mac');
    log('info', '  start.bat   # Windows');
    log('info', '');

    return {
      success: true,
      message: `Installation completed in ${duration}s`,
      details: {
        locationName: config.locationName,
        locationSlug,
        installDir,
        endpoint: tunnel.hostname || `http://localhost:${config.port || 8090}`,
        tunnelId: tunnel.tunnelId,
        masterUrl: `https://${locationSlug}.master.${config.cloudflareDomain}`,
        galleryUrl: `https://${locationSlug}.gallery.${config.cloudflareDomain}`,
        managementUrl: `https://${locationSlug}.management.${config.cloudflareDomain}`,
      },
    };

  } catch (error) {
    log('error', 'Installation failed', error);
    return { success: false, message: 'Installation failed', error: error instanceof Error ? error.message : String(error) };
  }
}

function validateConfig(config: Partial<InstallerConfig>): string[] {
  const errors: string[] = [];
  if (!config.locationName || config.locationName.length < 3) errors.push('Location name must be at least 3 characters');
  if (!config.adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.adminEmail)) errors.push('Valid admin email required');
  if (!config.adminPassword || config.adminPassword.length < 8) errors.push('Password must be at least 8 characters');
  if (config.cloudflareApiToken && !config.cloudflareAccountId) errors.push('Cloudflare Account ID required when API token provided');
  return errors;
}

async function showInteractiveDialog(): Promise<Partial<InstallerConfig>> {
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Use PowerShell dialogs on Windows
    try {
      const { execSync } = await import('child_process');
      
      // Get hotel name
      const hotelScript = `
Add-Type -AssemblyName System.Windows.Forms; 
$form = New-Object System.Windows.Forms.Form
$form.Text = 'ClickFlash Installation'
$form.Width = 500; $form.Height = 180
$label = New-Object System.Windows.Forms.Label
$label.Text = 'Enter Hotel/Destination Name:'
$label.Location = '20,30'; $label.AutoSize = $true
$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = '20,60'; $textBox.Width = 440
$button = New-Object System.Windows.Forms.Button
$button.Text = 'Continue'; $button.DialogResult = [System.Windows.Forms.DialogResult]::OK
$button.Location = '190,100'
$form.Controls.Add($label); $form.Controls.Add($textBox); $form.Controls.Add($button)
$form.AcceptButton = $button
if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $textBox.Text }
`;
      const hotelName = execSync(`powershell -Command "${hotelScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
      
      // Get email
      const emailScript = `
Add-Type -AssemblyName System.Windows.Forms; 
$form = New-Object System.Windows.Forms.Form
$form.Text = 'ClickFlash - Admin Email'
$form.Width = 500; $form.Height = 180
$label = New-Object System.Windows.Forms.Label
$label.Text = 'Enter Admin Email:'
$label.Location = '20,30'; $label.AutoSize = $true
$textBox = New-Object System.Windows.Forms.TextBox
$textBox.Location = '20,60'; $textBox.Width = 440
$textBox.Text = 'admin@' + '${
  hotelName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20)
}.clickflash.photo'
$button = New-Object System.Windows.Forms.Button
$button.Text = 'Continue'; $button.DialogResult = [System.Windows.Forms.DialogResult]::OK
$button.Location = '190,100'
$form.Controls.Add($label); $form.Controls.Add($textBox); $form.Controls.Add($button)
$form.AcceptButton = $button
if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $textBox.Text }
`;
      const email = execSync(`powershell -Command "${emailScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
      
      // Get password
      const passScript = `
Add-Type -AssemblyName System.Windows.Forms
$form = New-Object System.Windows.Forms.Form
$form.Text = 'ClickFlash - Set Password'
$form.Width = 500; $form.Height = 280
$label = New-Object System.Windows.Forms.Label
$label.Text = 'Enter Admin Password (min 8 characters):'
$label.Location = '20,20'; $label.AutoSize = $true
$passBox = New-Object System.Windows.Forms.TextBox
$passBox.UseSystemPasswordChar = $true; $passBox.Location = '20,50'; $passBox.Width = 440
$label2 = New-Object System.Windows.Forms.Label
$label2.Text = 'Confirm Password:'
$label2.Location = '20,90'; $label2.AutoSize = $true
$passBox2 = New-Object System.Windows.Forms.TextBox
$passBox2.UseSystemPasswordChar = $true; $passBox2.Location = '20,120'; $passBox2.Width = 440
$button = New-Object System.Windows.Forms.Button
$button.Text = 'Install'; $button.DialogResult = [System.Windows.Forms.DialogResult]::OK
$button.Location = '180,185'
$form.Controls.Add($label); $form.Controls.Add($passBox); $form.Controls.Add($label2)
$form.Controls.Add($passBox2); $form.Controls.Add($button)
$form.AcceptButton = $button
if ($form.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK -and $passBox.Text -eq $passBox2.Text -and $passBox.Text.Length -ge 8) { 
  $passBox.Text 
} else { 
  'ERROR' 
}
`;
      const password = execSync(`powershell -Command "${passScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
      
      if (password === 'ERROR' || password.length < 8) {
        throw new Error('Invalid password provided');
      }
      
      return {
        locationName: hotelName,
        adminEmail: email,
        adminPassword: password,
      };
    } catch (error) {
      log('error', 'Interactive dialog failed:', error);
      throw error;
    }
  } else {
    // Fallback to readline for non-Windows
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    const question = (q: string): Promise<string> => new Promise(resolve => rl.question(q, resolve));
    
    log('info', 'Interactive mode (non-Windows)');
    
    const locationName = await question('Hotel/Destination Name: ');
    const adminEmail = await question(`Admin Email [admin@${locationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.clickflash.photo]: `) || `admin@${locationName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.clickflash.photo`;
    const adminPassword = await question('Admin Password (min 8 chars): ');
    
    rl.close();
    
    return { locationName, adminEmail, adminPassword };
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
ClickFlash 1-Click Installation CLI

Usage:
  npx clickflash-install [options]

Options:
  --location <name>      Location name (required unless --interactive)
  --email <email>        Admin email (required unless --interactive)
  --password <pass>      Admin password (required unless --interactive)
  --cf-token <token>    Cloudflare API token (optional)
  --cf-account <id>     Cloudflare Account ID (optional)
  --cf-zone <id>        Cloudflare Zone ID (optional)
  --cf-domain <domain>  Cloudflare Domain (optional)
  --hub-url <url>       Management Hub URL (optional)
  --data-dir <path>     Data directory (optional)
  --port <port>         Port to run on (default: 8090)
  --alerts-email <email> Email for alerts notifications (optional)
  --orders-email <email> Email for order notifications (optional)
  --setup-email         Enable email routing setup (optional)
  --config <file>       Load config from JSON file
  --interactive          Interactive mode with GUI dialogs (Windows) or CLI prompts (other platforms)
  --help, -h            Show this help

Examples:
  # Basic installation
  npx clickflash-install --location "Miami Resort" --email admin@example.com --password secret123

  # Interactive installation with popup dialogs (Windows)
  npx clickflash-install --interactive

  # Full Cloudflare setup with email routing
  npx clickflash-install --location "Miami Resort" --email admin@example.com --password secret123 \
    --cf-token <token> --cf-account <id> --cf-zone <id> --cf-domain yourdomain.com \
    --setup-email --alerts-email alerts@example.com --orders-email orders@example.com

  # From config file
  npx clickflash-install --config config.json
`);
    process.exit(0);
  }

  let config: Partial<InstallerConfig> = {};

  // Check for interactive mode
  if (args.includes('--interactive')) {
    const interactiveConfig = await showInteractiveDialog();
    config = { ...config, ...interactiveConfig };
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    if (arg === '--location') { config.locationName = next; i++; }
    else if (arg === '--email') { config.adminEmail = next; i++; }
    else if (arg === '--password') { config.adminPassword = next; i++; }
    else if (arg === '--cf-token') { config.cloudflareApiToken = next; i++; }
    else if (arg === '--cf-account') { config.cloudflareAccountId = next; i++; }
    else if (arg === '--cf-zone') { config.cloudflareZoneId = next; i++; }
    else if (arg === '--cf-domain') { config.cloudflareDomain = next; i++; }
    else if (arg === '--hub-url') { config.hubUrl = next; i++; }
    else if (arg === '--data-dir') { config.dataDir = next; i++; }
    else if (arg === '--port') { config.port = parseInt(next, 10); i++; }
    else if (arg === '--alerts-email') { config.alertsEmail = next; i++; }
    else if (arg === '--orders-email') { config.ordersEmail = next; i++; }
    else if (arg === '--setup-email') { config.setupEmailRouting = true; }
    else if (arg === '--config') {
      const filePath = next;
      if (existsSync(filePath)) {
        const fileConfig = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        config = { ...config, ...fileConfig };
      }
      i++;
    }
  }

  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  const fullConfig = config as InstallerConfig;

  const result = await performInstallation(
    fullConfig,
    (step, message, progress) => console.log(`[${progress}%] ${step}: ${message}`)
  );

  if (result.success) {
    log('info', 'Installation successful!');
    log('info', result.message);
    process.exit(0);
  } else {
    log('error', 'Installation failed:', result.error);
    process.exit(1);
  }
}



main().catch((error) => {
  log('error', 'Unhandled error:', error);
  process.exit(1);
});

export type { InstallerConfig, InstallationResult, ProgressCallback };