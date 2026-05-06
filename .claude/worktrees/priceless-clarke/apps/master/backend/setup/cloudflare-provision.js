#!/usr/bin/env node

/**
 * Cloudflare Environment Provisioning Script
 * 
 * Automates the creation of Cloudflare resources for new Master stations:
 * - D1 Database entries
 * - R2 storage buckets
 * - DNS records (optional)
 * 
 * Usage: node cloudflare-provision.js --desk-id=MASTER_XXX --api-token=xxx
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CLOUDFLARE_API = 'api.cloudflare.com';

class CloudflareProvisioner {
    constructor(apiToken, accountId) {
        this.apiToken = apiToken;
        this.accountId = accountId;
    }

    async makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: CLOUDFLARE_API,
                port: 443,
                path: `/client/v4${path}`,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.success) {
                            resolve(json.result);
                        } else {
                            reject(new Error(json.errors?.[0]?.message || 'API Error'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });

            req.on('error', reject);
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    /**
     * Register a new Master station in the Management Hub D1 database
     */
    async registerMasterStation(deskConfig) {
        console.log(`\n📝 Registering Master Station: ${deskConfig.deskId}`);
        
        // This would typically call a Worker endpoint that has D1 access
        // Since we can't directly access D1 from outside Workers, we'll generate SQL
        
        const sql = `-- Register Master Station: ${deskConfig.deskId}
-- Generated: ${new Date().toISOString()}

-- Insert destination record
INSERT OR REPLACE INTO destinations (
    id, 
    name, 
    site_code, 
    country, 
    type, 
    licenseKey, 
    status, 
    last_seen,
    created_at
) VALUES (
    '${deskConfig.deskId}',
    '${deskConfig.deskName}',
    '${deskConfig.siteCode || deskConfig.deskId}',
    '${deskConfig.country || 'Unknown'}',
    'Master',
    '${deskConfig.licenseKey || 'PENDING'}',
    'Provisioning',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert initial sync sequence
INSERT OR REPLACE INTO sync_sequences (
    id,
    site_id,
    counter,
    updated_at
) VALUES (
    'desk_${deskConfig.deskId}',
    '${deskConfig.deskId}',
    0,
    CURRENT_TIMESTAMP
);

-- Insert vector clock
INSERT OR REPLACE INTO vector_clocks (
    id,
    site_id,
    counter,
    updated_at
) VALUES (
    'desk_${deskConfig.deskId}',
    '${deskConfig.deskId}',
    0,
    CURRENT_TIMESTAMP
);
`;

        const outputPath = path.join(process.cwd(), `provision-${deskConfig.deskId}.sql`);
        fs.writeFileSync(outputPath, sql);
        
        console.log(`  ✓ Generated SQL: ${outputPath}`);
        console.log(`  ℹ️  Run this SQL in your Cloudflare D1 dashboard`);
        
        return sql;
    }

    /**
     * Generate wrangler.toml configuration for the Master
     */
    generateWranglerConfig(deskConfig) {
        console.log(`\n⚙️  Generating Wrangler configuration...`);
        
        const config = `# Cloudflare Workers Configuration
# Generated for Master Station: ${deskConfig.deskId}
# Date: ${new Date().toISOString()}

name = "master-${deskConfig.deskId.toLowerCase()}"
main = "src/server.ts"
compatibility_date = "2024-01-01"

# Environment Variables
[vars]
DESK_ID = "${deskConfig.deskId}"
DESK_NAME = "${deskConfig.deskName}"
CLOUD_API_URL = "${deskConfig.managementUrl}"

# D1 Database Binding
[[d1_databases]]
binding = "DB"
database_name = "clickflash-master-${deskConfig.deskId.toLowerCase()}"
database_id = "${deskConfig.databaseId || 'PENDING'}"

# R2 Storage Binding (for local caching)
[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "master-uploads-${deskConfig.deskId.toLowerCase()}"

# Secrets (set via wrangler secret put)
# - JWT_SECRET
# - CLOUD_API_TOKEN
`;

        const outputPath = path.join(process.cwd(), `wrangler-${deskConfig.deskId}.toml`);
        fs.writeFileSync(outputPath, config);
        
        console.log(`  ✓ Generated: ${outputPath}`);
        
        return config;
    }

    /**
     * List existing D1 databases
     */
    async listDatabases() {
        try {
            const result = await this.makeRequest('GET', `/accounts/${this.accountId}/d1/database`);
            return result;
        } catch (e) {
            console.error('Failed to list databases:', e.message);
            return [];
        }
    }

    /**
     * Create a new D1 database for a Master station
     */
    async createDatabase(name) {
        console.log(`\n🗄️  Creating D1 Database: ${name}...`);
        
        try {
            const result = await this.makeRequest(
                'POST', 
                `/accounts/${this.accountId}/d1/database`,
                { name }
            );
            
            console.log(`  ✓ Database created: ${result.uuid}`);
            return result;
        } catch (e) {
            console.error(`  ❌ Failed to create database: ${e.message}`);
            throw e;
        }
    }

    /**
     * Generate setup script for the Master station
     */
    generateSetupScript(deskConfig) {
        console.log(`\n📦 Generating setup script...`);
        
        const script = `#!/bin/bash
# Master Station Setup Script
# Generated for: ${deskConfig.deskId}
# Date: ${new Date().toISOString()}

echo "Setting up Master Station: ${deskConfig.deskId}"

# Create necessary directories
mkdir -p pb_data/uploads
mkdir -p pb_data/trash_archive
mkdir -p logs

# Set environment variables
export DESK_ID="${deskConfig.deskId}"
export CLOUD_API_URL="${deskConfig.managementUrl}"
export CLOUD_EMAIL="${deskConfig.email}"
export CLOUD_PASSWORD="${deskConfig.password}"

# Run database migrations
echo "Running database migrations..."
npm run migrate

# Start the application
echo "Starting Master application..."
npm start
`;

        const outputPath = path.join(process.cwd(), `setup-${deskConfig.deskId}.sh`);
        fs.writeFileSync(outputPath, script);
        fs.chmodSync(outputPath, '755');
        
        console.log(`  ✓ Generated: ${outputPath}`);
        
        return script;
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    const deskId = args.find(a => a.startsWith('--desk-id='))?.split('=')[1];
    const apiToken = args.find(a => a.startsWith('--api-token='))?.split('=')[1];
    const accountId = args.find(a => a.startsWith('--account-id='))?.split('=')[1];
    
    if (!deskId) {
        console.error('Usage: node cloudflare-provision.js --desk-id=MASTER_XXX --api-token=xxx --account-id=xxx');
        console.error('');
        console.error('Required:');
        console.error('  --desk-id      Unique desk identifier');
        console.error('');
        console.error('Optional:');
        console.error('  --api-token    Cloudflare API Token');
        console.error('  --account-id   Cloudflare Account ID');
        process.exit(1);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     CLOUDFLARE PROVISIONING FOR MASTER STATION             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\nDesk ID: ${deskId}`);

    const provisioner = new CloudflareProvisioner(apiToken, accountId);

    // Mock desk configuration (in real usage, this would come from the wizard)
    const deskConfig = {
        deskId,
        deskName: `Master Station ${deskId}`,
        siteCode: deskId,
        country: 'TBD',
        managementUrl: 'https://management.clickflash.app',
        email: 'admin@clickflash.app',
        password: 'AUTO_GENERATED'
    };

    try {
        // Generate all necessary files
        await provisioner.registerMasterStation(deskConfig);
        provisioner.generateWranglerConfig(deskConfig);
        provisioner.generateSetupScript(deskConfig);

        // If API token provided, try to create database
        if (apiToken && accountId) {
            try {
                await provisioner.createDatabase(`clickflash-master-${deskId.toLowerCase()}`);
            } catch (e) {
                console.log(`  ⚠️  Could not create database automatically: ${e.message}`);
            }
        }

        console.log('\n✅ Provisioning complete!');
        console.log('\nNext steps:');
        console.log('  1. Run the SQL file in your D1 dashboard');
        console.log('  2. Copy wrangler.toml to your project root');
        console.log('  3. Deploy using: wrangler deploy');

    } catch (e) {
        console.error('\n❌ Provisioning failed:', e.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { CloudflareProvisioner };
