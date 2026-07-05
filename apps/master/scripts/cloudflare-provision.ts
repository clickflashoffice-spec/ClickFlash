import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { logger } from '@/utils/logger';

// Parse arguments
const args: Record<string, string | boolean> = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--destination' || arg === '-d') {
    args.destination = argv[++i];
  } else if (arg === '--dryRun') {
    args.dryRun = true;
  }
}

let destination = args.destination as string;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => new Promise(resolve => rl.question(query, resolve));

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
const domain = process.env.CLOUDFLARE_DOMAIN || 'clickflash.photo';

if (!apiToken || !accountId) {
  logger.error('ERROR: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set in the environment');
  if (!args.dryRun) {
    process.exit(1);
  }
}

async function cfRequest(endpoint: string, method = 'GET', body?: any) {
  if (args.dryRun) {
    logger.info(`[DRY RUN] Would ${method} to ${endpoint}`, body ? body : '');
    return { success: true, result: { id: 'dry-run-id' } };
  }

  const url = `https://api.cloudflare.com/client/v4${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cloudflare API Error: ${JSON.stringify(data.errors)}`);
  }
  return data;
}

async function provision() {
  if (!destination) {
    if (args.dryRun) {
      destination = 'dry-run-site';
    } else {
      destination = await question('Enter the Site/Hotel Name (e.g. Marhaba Resort): ');
      if (!destination) {
        logger.error('ERROR: Site name is required');
        process.exit(1);
      }
    }
  }
  rl.close();

  const destSlug = slugify(destination);
  const dbName = `clickflash-d1-${destSlug}`;
  const bucketName = `clickflash-r2-${destSlug}`;
  const subdomain = destSlug;
  const fullDomain = `${subdomain}.${domain}`;

  logger.info(`🚀 Provisioning Cloudflare Ecosystem for: ${destination} (${destSlug})`);

  try {

    // 1. Provision D1 Database
    logger.info(`\n📦 Provisioning D1 Database: ${dbName}...`);
    const dbRes = await cfRequest(`/accounts/${accountId}/d1/database`, 'POST', {
      name: dbName
    });
    const dbId = dbRes.result.uuid || dbRes.result.id;
    logger.info(`✅ D1 Database created. ID: ${dbId}`);

    // 2. Provision R2 Bucket
    logger.info(`\n🪣 Provisioning R2 Bucket: ${bucketName}...`);
    await cfRequest(`/accounts/${accountId}/r2/buckets`, 'POST', {
      name: bucketName
    });
    logger.info(`✅ R2 Bucket created.`);

    // 3. DNS Record creation
    if (zoneId) {
      logger.info(`\n🌐 Creating DNS Record for: ${fullDomain}...`);
      await cfRequest(`/zones/${zoneId}/dns_records`, 'POST', {
        type: 'CNAME',
        name: subdomain,
        content: 'clickflash-worker.workers.dev', // Default routing to central worker
        proxied: true,
      });
      logger.info(`✅ DNS Record created.`);
    } else {
      logger.info(`\n⚠️ Skipping DNS Record creation (CLOUDFLARE_ZONE_ID not set)`);
    }

    logger.info(`\n🎉 Cloudflare Provisioning Complete!`);
    logger.info(`   Database Name: ${dbName}`);
    logger.info(`   Bucket Name:   ${bucketName}`);
    if (zoneId) {
      logger.info(`   URL:           https://${fullDomain}`);
    }

    // Generate .env file
    const envContent = `SITE_NAME=${destination}
SITE_SLUG=${destSlug}
CLOUDFLARE_D1_ID=${dbId}
CLOUDFLARE_R2_BUCKET=${bucketName}
CLOUDFLARE_URL=https://${fullDomain}
`;
    const envPath = path.resolve(__dirname, `../../../.env.${destSlug}`);
    fs.writeFileSync(envPath, envContent);
    logger.info(`\n📄 Generated environment file: ${envPath}`);

  } catch (error: any) {
    logger.error(`\n❌ Provisioning failed:`, error.message);
    process.exit(1);
  }
}

provision();
