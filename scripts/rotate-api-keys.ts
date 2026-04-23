/**
 * API Key Rotation Script
 * 
 * Usage: node scripts/rotate-api-keys.js
 * 
 * Environment Variables:
 *   ROTATION_DRY_RUN=true - Show what would be rotated without making changes
 *   ROTATION_NOTIFY=true - Send notifications when keys are rotated
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  keys: [
    {
      name: 'JWT_SECRET',
      envFile: 'apps/master/backend/.env',
      length: 32,
      description: 'Master Portal JWT Secret'
    },
    {
      name: 'SESSION_SECRET',
      envFile: 'apps/master/backend/.env',
      length: 32,
      description: 'Master Portal Session Secret'
    },
    {
      name: 'R2_SECRET_KEY',
      envFile: 'apps/master/backend/.env',
      length: 32,
      description: 'Cloudflare R2 Storage Secret'
    },
    {
      name: 'CLOUD_API_KEY',
      envFile: 'apps/master/backend/.env',
      length: 24,
      description: 'Hub/Cloud API Key'
    },
    {
      name: 'CLOUD_API_KEY',
      envFile: 'apps/moneytrash/.env',
      length: 24,
      description: 'MoneyTrash API Key'
    },
    {
      name: 'STRIPE_SECRET_KEY',
      envFile: 'apps/moneytrash/.env',
      length: 24,
      description: 'MoneyTrash Stripe Secret'
    },
    {
      name: 'STRIPE_SECRET_KEY',
      envFile: 'apps/gallery/backend/.env',
      length: 24,
      description: 'Gallery Stripe Secret'
    },
    {
      name: 'RESEND_API_KEY',
      envFile: 'apps/master/.env',
      length: 24,
      description: 'Email Service API Key'
    }
  ],
  rotationIntervalDays: 90,
  backupDir: './backups/api-keys'
};

function generateKey(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

function backupEnvFile(filePath: string): void {
  const backupDir = path.resolve(CONFIG.backupDir);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${path.basename(filePath)}.${timestamp}.bak`);

  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`[Backup] Created: ${backupPath}`);
  }
}

function updateEnvFile(filePath: string, keyName: string, newValue: string): void {
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`[Skip] File not found: ${resolvedPath}`);
    return;
  }

  let content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split('\n');
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(`${keyName}=`) || line.startsWith(`${keyName} =`)) {
      const keyPart = line.split('=')[0];
      lines[i] = `${keyPart}=${newValue}`;
      updated = true;
      console.log(`[Update] ${keyName} in ${path.basename(resolvedPath)}`);
      break;
    }
  }

  if (!updated) {
    lines.push(`${keyName}=${newValue}`);
    console.log(`[Add] ${keyName} to ${path.basename(resolvedPath)}`);
  }

  fs.writeFileSync(resolvedPath, lines.join('\n'));
}

function checkKeyAge(filePath: string, keyName: string): { exists: boolean; age: number; value: string } {
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    return { exists: false, age: 0, value: '' };
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith(`${keyName}=`)) {
      const value = line.split('=').slice(1).join('=').trim();
      const stat = fs.statSync(resolvedPath);
      const ageMs = Date.now() - stat.mtimeMs;
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      
      return { exists: true, age: ageDays, value };
    }
  }

  return { exists: false, age: 0, value: '' };
}

function shouldRotate(age: number): boolean {
  return age >= CONFIG.rotationIntervalDays;
}

async function rotateKeys(): Promise<void> {
  const dryRun = process.env.ROTATION_DRY_RUN === 'true';
  const notify = process.env.ROTATION_NOTIFY === 'true';

  console.log('\n🔐 API Key Rotation Script');
  console.log('==========================\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}\n`);

  const results = [];

  for (const keyConfig of CONFIG.keys) {
    const keyInfo = checkKeyAge(keyConfig.envFile, keyConfig.name);
    
    console.log(`\n📋 ${keyConfig.name} (${keyConfig.description})`);
    console.log(`   File: ${keyConfig.envFile}`);

    if (!keyInfo.exists) {
      console.log(`   Status: NOT FOUND - Will generate new key`);
      
      if (!dryRun) {
        const newKey = generateKey(keyConfig.length);
        updateEnvFile(keyConfig.envFile, keyConfig.name, newKey);
        console.log(`   ✓ Generated new key`);
      } else {
        console.log(`   [DRY RUN] Would generate new key`);
      }
    } else {
      console.log(`   Status: Found (age: ${keyInfo.age} days)`);
      
      if (shouldRotate(keyInfo.age)) {
        console.log(`   ⚠️  Key is older than ${CONFIG.rotationIntervalDays} days - ROTATION NEEDED`);
        
        if (!dryRun) {
          backupEnvFile(keyConfig.envFile);
          const newKey = generateKey(keyConfig.length);
          updateEnvFile(keyConfig.envFile, keyConfig.name, newKey);
          console.log(`   ✓ Key rotated`);
          
          results.push({
            key: keyConfig.name,
            file: keyConfig.envFile,
            action: 'rotated',
            oldAge: keyInfo.age
          });
        } else {
          console.log(`   [DRY RUN] Would rotate key`);
        }
      } else {
        console.log(`   ✓ Key is fresh - no rotation needed`);
      }
    }
  }

  console.log('\n==========================');
  console.log('📊 Summary');
  console.log('==========================');

  if (results.length > 0) {
    console.log(`\nKeys rotated: ${results.length}`);
    results.forEach(r => {
      console.log(`  - ${r.key} in ${r.file}`);
    });

    if (notify) {
      console.log('\n📧 Notification: Would send email to admin about rotated keys');
    }
  } else {
    console.log('\n✓ No keys needed rotation');
  }

  console.log('\n📝 Next Steps:');
  console.log('  1. Update any services using old keys');
  console.log('  2. Test all integrations');
  console.log('  3. Commit changes to repository');
  console.log('  4. Document rotation in audit log');
  
  console.log('\n✅ Rotation check complete\n');
}

// Run if called directly
rotateKeys().catch(console.error);

export { rotateKeys, generateKey, checkKeyAge, shouldRotate };