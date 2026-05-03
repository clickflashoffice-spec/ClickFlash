#!/usr/bin/env node
/**
 * ClickFlash Deploy Ecosystem
 * Builds and deploys all Cloudflare Pages apps and Workers.
 *
 * Usage:
 *   node deploy-ecosystem.js              # deploy everything
 *   node deploy-ecosystem.js website      # deploy only website
 *   node deploy-ecosystem.js gallery      # deploy only gallery
 *   node deploy-ecosystem.js management   # deploy only management
 *   node deploy-ecosystem.js workers      # deploy only CF Workers
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = __dirname;

function run(cmd, cwd) {
  console.log(`\n▶ ${cmd}  [${path.relative(ROOT, cwd || ROOT) || '.'}]`);
  execSync(cmd, { cwd: cwd || ROOT, stdio: 'inherit' });
}

// ── Pages apps ─────────────────────────────────────────────────────────────

function deployWebsite() {
  console.log('\n══════════  WEBSITE  ══════════');
  const dir = path.join(ROOT, 'apps/website');
  run('npm install --legacy-peer-deps', dir);
  run('npm run build', dir);
  run('npx wrangler pages deploy out --project-name=clickflash-website --branch=main --commit-dirty=true', dir);
}

function deployGallery() {
  console.log('\n══════════  GALLERY  ══════════');
  const dir = path.join(ROOT, 'apps/gallery');
  run('npm install --legacy-peer-deps', dir);
  run('npm run build', dir);
  run('npx wrangler pages deploy dist --project-name=clickflash-gallery --branch=main --commit-dirty=true', dir);
}

function deployManagement() {
  console.log('\n══════════  MANAGEMENT  ══════════');
  const dir = path.join(ROOT, 'apps/management');
  run('npm install --legacy-peer-deps', dir);
  run('npm run build', dir);
  run('npx wrangler pages deploy dist --project-name=management-hub --branch=main --commit-dirty=true', dir);
}

// ── Cloudflare Workers ─────────────────────────────────────────────────────

function deployGalleryWorker() {
  console.log('\n══════════  GALLERY WORKER  ══════════');
  const dir = path.join(ROOT, 'apps/gallery/backend');
  run('npm install', dir);
  run('npx wrangler deploy', dir);
}

function deployManagementWorker() {
  console.log('\n══════════  MANAGEMENT WORKER  ══════════');
  const dir = path.join(ROOT, 'apps/management/backend');
  run('npm install', dir);
  run('npx wrangler deploy', dir);
}

// ── Entrypoint ─────────────────────────────────────────────────────────────

const target = process.argv[2] || 'all';

try {
  switch (target) {
    case 'website':
      deployWebsite();
      break;
    case 'gallery':
      deployGallery();
      deployGalleryWorker();
      break;
    case 'management':
      deployManagement();
      deployManagementWorker();
      break;
    case 'workers':
      deployGalleryWorker();
      deployManagementWorker();
      break;
    case 'all':
    default:
      deployWebsite();
      deployGallery();
      deployManagement();
      deployGalleryWorker();
      deployManagementWorker();
      break;
  }
  console.log('\n✅  Deploy ecosystem complete.\n');
} catch (err) {
  console.error('\n❌  Deploy failed:', err.message);
  process.exit(1);
}
