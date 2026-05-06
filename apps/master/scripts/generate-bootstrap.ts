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
      console.error(`ERROR: Environment variable ${envMatch[1]} is not set`);
      console.error(`       Set it with: export ${envMatch[1]}=your_value`);
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
      console.error(`Unknown option: ${arg}`);
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
    console.error('ERROR: Destination name must be at least 2 characters');
    process.exit(1);
  }

  const domainFromName = slugify(locationName).substring(0, 20);
  const defaultEmail = `admin@${domainFromName}.clickflash.photo`;
  
  const adminEmail = options.email || process.env.ADMIN_EMAIL || defaultEmail;
  const adminPassword = options.password || resolveEnvVar('${ADMIN_PASSWORD}');
  
  if (adminPassword.length < 8) {
    console.error('ERROR: Password must be at least 8 characters');
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
      console.warn('WARNING: Cloudflare Account ID or Zone ID not set. Cloudflare provisioning will be skipped.');
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
  console.log('🚀 ClickFlash Bootstrap Generator\n');

  const args = parseArgs();

  const destination = args.destination;

  if (!destination) {
    console.error('ERROR: --destination is required');
    console.log('\nUsage:');
    console.log('  npm run bootstrap -- --destination "Paradise Resort"');
    console.log('  npm run bootstrap -- -d "Ocean Hotel" -e admin@ocean.com');
    console.log('\nEnvironment Variables (for secrets):');
    console.log('  export ADMIN_PASSWORD=my_secret_password');
    console.log('  export CLOUDFLARE_API_TOKEN=your_token');
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

  console.log('📋 Generated Configuration:');
  console.log(`   Location:     ${config.locationName}`);
  console.log(`   Admin Email:  ${config.adminEmail}`);
  console.log(`   Password:      ${config.adminPassword.substring(0, 3)}***`);
  console.log(`   Hub URL:      ${config.hubUrl}`);
  if (config.cloudflareConfig) {
    console.log(`   Cloudflare:   ✓ Configured`);
  } else {
    console.log(`   Cloudflare:   ✗ Not configured (will use defaults)`);
  }
  console.log(`   Output:       ${bootstrapPath}`);

  if (args.dryRun) {
    console.log('\n🔍 Dry run - not writing file');
    console.log('\nbootstrap.json would contain:');
    console.log(bootstrapJson);
    return;
  }

  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) {
    console.log(`\n📁 Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(bootstrapPath, bootstrapJson, 'utf8');
  console.log(`\n✅ bootstrap.json created successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review: cat ${bootstrapPath}`);
  console.log(`  2. Start Master: npm run dev:full`);
  console.log(`  3. System will auto-provision on first run`);
  console.log(`\n💡 To regenerate, run: npm run bootstrap -- --destination "${destination}"`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});