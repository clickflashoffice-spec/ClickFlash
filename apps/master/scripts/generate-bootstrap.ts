#!/usr/bin/env ts-node
/**
 * ClickFlash Bootstrap Generator
 * 
 * Usage:
 *   npm run bootstrap -- --destination "Paradise Resort"
 *   npm run bootstrap -- --destination "Ocean Hotel" --email admin@ocean.com
 *   npm run bootstrap -- --interactive
 * 
 * Environment Variables (for secrets - NEVER put in files):
 *   ADMIN_PASSWORD - Admin password for the new destination
 *   CLOUDFLARE_API_TOKEN - Cloudflare API token (optional)
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/utils/logger';

interface BootstrapConfig {
  locationName: string;
  adminEmail: string;
  adminPassword: string;
  hubUrl: string;
  cloudflareConfig?: {
    apiToken: string;
    accountId: string;
    zoneId: string;
    domain: string;
  };
  webhookUrl?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function resolveEnvVar(value: string): string {
  const envMatch = value.match(/^\$\{([^}]+)\}$/);
  if (envMatch) {
    const envValue = process.env[envMatch[1]];
    if (!envValue) {
      logger.error(`ERROR: Environment variable ${envMatch[1]} is not set`);
      logger.error(`       Set it with: export ${envMatch[1]}=your_value`);
      process.exit(1);
    }
    return envValue;
  }
  return value;
}

function parseArgs(): { 
  destination?: string; 
  email?: string;
  password?: string;
  hubUrl?: string;
  cfToken?: string;
  cfAccountId?: string;
  cfZoneId?: string;
  cfDomain?: string;
  interactive?: boolean;
  output?: string;
  dryRun?: boolean;
} {
  const args: Record<string, string | boolean> = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--destination' || arg === '-d') {
      args.destination = argv[++i];
    } else if (arg === '--email' || arg === '-e') {
      args.email = argv[++i];
    } else if (arg === '--password' || arg === '-p') {
      args.password = argv[++i];
    } else if (arg === '--hubUrl' || arg === '-h') {
      args.hubUrl = argv[++i];
    } else if (arg === '--cfToken') {
      args.cfToken = argv[++i];
    } else if (arg === '--cfAccountId') {
      args.cfAccountId = argv[++i];
    } else if (arg === '--cfZoneId') {
      args.cfZoneId = argv[++i];
    } else if (arg === '--cfDomain') {
      args.cfDomain = argv[++i];
    } else if (arg === '--interactive' || arg === '-i') {
      args.interactive = true;
    } else if (arg === '--output' || arg === '-o') {
      args.output = argv[++i];
    } else if (arg === '--dryRun') {
      args.dryRun = true;
    } else if (arg.startsWith('--')) {
      logger.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }
  
  return args as ReturnType<typeof parseArgs>;
}

async function generateBootstrap(options: {
  destination: string;
  email?: string;
  password?: string;
  hubUrl?: string;
  cfToken?: string;
  cfAccountId?: string;
  cfZoneId?: string;
  cfDomain?: string;
}): Promise<BootstrapConfig> {
  
  const locationName = options.destination.trim();
  if (locationName.length < 2) {
    logger.error('ERROR: Destination name must be at least 2 characters');
    process.exit(1);
  }

  const domainFromName = slugify(locationName).substring(0, 20);
  const defaultEmail = `admin@${domainFromName}.clickflash.photo`;
  
  const adminEmail = options.email || process.env.ADMIN_EMAIL || defaultEmail;
  const adminPassword = options.password || resolveEnvVar('${ADMIN_PASSWORD}');
  
  if (adminPassword.length < 8) {
    logger.error('ERROR: Password must be at least 8 characters');
    process.exit(1);
  }

  const config: BootstrapConfig = {
    locationName,
    adminEmail,
    adminPassword,
    hubUrl: options.hubUrl || process.env.HUB_URL || 'https://hub.clickflash.photo',
  };

  if (options.cfToken || process.env.CLOUDFLARE_API_TOKEN) {
    config.cloudflareConfig = {
      apiToken: options.cfToken || process.env.CLOUDFLARE_API_TOKEN!,
      accountId: options.cfAccountId || process.env.CLOUDFLARE_ACCOUNT_ID || '',
      zoneId: options.cfZoneId || process.env.CLOUDFLARE_ZONE_ID || '',
      domain: options.cfDomain || process.env.CLOUDFLARE_DOMAIN || 'clickflash.photo',
    };
    
    if (!config.cloudflareConfig.accountId || !config.cloudflareConfig.zoneId) {
      logger.warn('WARNING: Cloudflare Account ID or Zone ID not set. Cloudflare provisioning will be skipped.');
      config.cloudflareConfig = undefined;
    }
  }

  return config;
}

function getDataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), 'pb_data');
}

function getBootstrapPath(customPath?: string): string {
  return customPath || path.join(getDataDir(), 'bootstrap.json');
}

async function main() {
  logger.info('🚀 ClickFlash Bootstrap Generator\n');

  const args = parseArgs();

  const destination = args.destination;

  if (!destination) {
    logger.error('ERROR: --destination is required');
    logger.info('\nUsage:');
    logger.info('  npm run bootstrap -- --destination "Paradise Resort"');
    logger.info('  npm run bootstrap -- -d "Ocean Hotel" -e admin@ocean.com');
    logger.info('\nEnvironment Variables (for secrets):');
    logger.info('  export ADMIN_PASSWORD=my_secret_password');
    logger.info('  export CLOUDFLARE_API_TOKEN=your_token');
    process.exit(1);
  }

  const config = await generateBootstrap({
    destination,
    email: args.email,
    password: args.password,
    hubUrl: args.hubUrl,
    cfToken: args.cfToken,
    cfAccountId: args.cfAccountId,
    cfZoneId: args.cfZoneId,
    cfDomain: args.cfDomain,
  });

  const bootstrapJson = JSON.stringify(config, null, 2);
  const bootstrapPath = getBootstrapPath(args.output);

  logger.info('📋 Generated Configuration:');
  logger.info(`   Location:     ${config.locationName}`);
  logger.info(`   Admin Email:  ${config.adminEmail}`);
  logger.info(`   Password:      ${config.adminPassword.substring(0, 3)}***`);
  logger.info(`   Hub URL:      ${config.hubUrl}`);
  if (config.cloudflareConfig) {
    logger.info(`   Cloudflare:   ✓ Configured`);
  } else {
    logger.info(`   Cloudflare:   ✗ Not configured (will use defaults)`);
  }
  logger.info(`   Output:       ${bootstrapPath}`);

  if (args.dryRun) {
    logger.info('\n🔍 Dry run - not writing file');
    logger.info('\nbootstrap.json would contain:');
    logger.info(bootstrapJson);
    return;
  }

  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    logger.info(`\n📁 Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(bootstrapPath, bootstrapJson, 'utf8');
  logger.info(`\n✅ bootstrap.json created successfully!`);
  logger.info(`\nNext steps:`);
  logger.info(`  1. Review: cat ${bootstrapPath}`);
  logger.info(`  2. Start Master: npm run dev:full`);
  logger.info(`  3. System will auto-provision on first run`);
  logger.info(`\n💡 To regenerate, run: npm run bootstrap -- --destination "${destination}"`);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});